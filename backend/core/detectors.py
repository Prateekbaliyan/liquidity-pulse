import time
import uuid
import numpy as np
from collections import deque
from typing import List, Dict, Any, Optional
from backend.core.orderbook import OrderBook

class AnomalyDetectorEngine:
    """
    Microstructure Anomaly Detection Engine.
    Detects Liquidity Sweeps, Fakeouts, Potential Icebergs, and Potential Spoof/Layering events.
    Strictly follows calibrated probabilistic terminology.
    """
    def __init__(self,
                 sweep_pct: float = 0.15,
                 sweep_zscore: float = 2.0,
                 sweep_revert_sec: float = 15.0,
                 iceberg_mult: float = 1.5,
                 spoof_cancel_ms: int = 800,
                 spoof_fill_pct: float = 5.0):
        self.sweep_pct = sweep_pct
        self.sweep_zscore = sweep_zscore
        self.sweep_revert_sec = sweep_revert_sec
        self.iceberg_mult = iceberg_mult
        self.spoof_cancel_ms = spoof_cancel_ms
        self.spoof_fill_pct = spoof_fill_pct

        # Rolling history buffers
        self.price_history_15m: deque = deque(maxlen=9000)  # 15m of 100ms ticks
        self.level_executed_vol: Dict[str, float] = {}  # price_str -> cumulative trade volume
        self.level_initial_depth: Dict[str, float] = {}  # price_str -> initial depth seen
        self.limit_orders_tracked: Dict[str, Dict[str, Any]] = {}  # order_id -> details for spoof tracking

    def update_config(self, **kwargs):
        if "sweep_pct" in kwargs:
            self.sweep_pct = kwargs["sweep_pct"]
        if "sweep_zscore" in kwargs:
            self.sweep_zscore = kwargs["sweep_zscore"]
        if "iceberg_mult" in kwargs:
            self.iceberg_mult = kwargs["iceberg_mult"]
        if "spoof_cancel_ms" in kwargs:
            self.spoof_cancel_ms = kwargs["spoof_cancel_ms"]

    def detect_anomalies(self, book: OrderBook, metrics: Dict[str, Any], timestamp: int) -> List[Dict[str, Any]]:
        events = []
        mid = book.mid_price
        if mid <= 0:
            return events

        # Store price in 15m history
        self.price_history_15m.append({"timestamp": timestamp, "price": mid})
        cutoff_15m = timestamp - 900000
        while self.price_history_15m and self.price_history_15m[0]["timestamp"] < cutoff_15m:
            self.price_history_15m.popleft()

        # 1. LIQUIDITY SWEEP DETECTION
        sweep_evt = self._check_liquidity_sweep(mid, metrics, timestamp)
        if sweep_evt:
            events.append(sweep_evt)

        # 2. FAKEOUT DETECTION
        fakeout_evt = self._check_fakeout(mid, metrics, timestamp)
        if fakeout_evt:
            events.append(fakeout_evt)

        # 3. POTENTIAL ICEBERG DETECTION
        iceberg_evt = self._check_iceberg(book, metrics, timestamp)
        if iceberg_evt:
            events.append(iceberg_evt)

        # 4. POTENTIAL SPOOF / LAYERING DETECTION
        spoof_evt = self._check_spoof(book, metrics, timestamp)
        if spoof_evt:
            events.append(spoof_evt)

        return events

    def _check_liquidity_sweep(self, current_price: float, metrics: Dict[str, Any], timestamp: int) -> Optional[Dict[str, Any]]:
        if len(self.price_history_15m) < 50:
            return None

        prices = [p["price"] for p in self.price_history_15m]
        min_15m = min(prices)
        max_15m = max(prices)

        cvd_vel = metrics.get("cvd_velocity", 0.0)
        t_zscore = metrics.get("trade_intensity_zscore", 0.0)

        # Check breach of high or low
        high_breach_pct = (current_price - max_15m) / max_15m * 100.0 if max_15m > 0 else 0.0
        low_breach_pct = (min_15m - current_price) / min_15m * 100.0 if min_15m > 0 else 0.0

        if high_breach_pct >= self.sweep_pct and t_zscore >= self.sweep_zscore:
            # Check fast reversion back
            recent_15s = [p["price"] for p in self.price_history_15m if p["timestamp"] >= timestamp - int(self.sweep_revert_sec * 1000)]
            if len(recent_15s) > 5 and recent_15s[-1] < max_15m:
                return {
                    "id": f"evt_sweep_{timestamp}_{uuid.uuid4().hex[:4]}",
                    "timestamp": timestamp,
                    "type": "LIQUIDITY_SWEEP",
                    "side": "ASK",
                    "price": current_price,
                    "severity": "HIGH",
                    "details": f"Breached 15m high by {high_breach_pct:.2f}%, delta z-score {t_zscore:.2f}, potential liquidity sweep"
                }

        elif low_breach_pct >= self.sweep_pct and t_zscore >= self.sweep_zscore:
            recent_15s = [p["price"] for p in self.price_history_15m if p["timestamp"] >= timestamp - int(self.sweep_revert_sec * 1000)]
            if len(recent_15s) > 5 and recent_15s[-1] > min_15m:
                return {
                    "id": f"evt_sweep_{timestamp}_{uuid.uuid4().hex[:4]}",
                    "timestamp": timestamp,
                    "type": "LIQUIDITY_SWEEP",
                    "side": "BID",
                    "price": current_price,
                    "severity": "HIGH",
                    "details": f"Breached 15m low by {low_breach_pct:.2f}%, delta z-score {t_zscore:.2f}, potential liquidity sweep"
                }

        return None

    def _check_fakeout(self, current_price: float, metrics: Dict[str, Any], timestamp: int) -> Optional[Dict[str, Any]]:
        cvd_1m = metrics.get("cvd_1m", 0.0)
        p_velocity = metrics.get("price_velocity", 0.0)
        obi = metrics.get("obi", 0.0)

        # Fakeout UP: Price velocity > 0 but adverse CVD divergence (CVD < 0) and OBI negative
        if p_velocity > 0.05 and cvd_1m < -5.0 and obi < -0.3:
            return {
                "id": f"evt_fakeout_{timestamp}_{uuid.uuid4().hex[:4]}",
                "timestamp": timestamp,
                "type": "FAKEOUT",
                "side": "ASK",
                "price": current_price,
                "severity": "MEDIUM",
                "details": f"Upward price movement rejected by adverse CVD divergence ({cvd_1m:.1f}) and negative OBI ({obi:.2f})"
            }

        # Fakeout DOWN: Price velocity < 0 but adverse CVD divergence (CVD > 0) and OBI positive
        elif p_velocity < -0.05 and cvd_1m > 5.0 and obi > 0.3:
            return {
                "id": f"evt_fakeout_{timestamp}_{uuid.uuid4().hex[:4]}",
                "timestamp": timestamp,
                "type": "FAKEOUT",
                "side": "BID",
                "price": current_price,
                "severity": "MEDIUM",
                "details": f"Downward price movement rejected by adverse CVD divergence ({cvd_1m:.1f}) and positive OBI ({obi:.2f})"
            }

        return None

    def record_trade_execution(self, price: float, quantity: float):
        p_key = f"{price:.2f}"
        self.level_executed_vol[p_key] = self.level_executed_vol.get(p_key, 0.0) + quantity

    def _check_iceberg(self, book: OrderBook, metrics: Dict[str, Any], timestamp: int) -> Optional[Dict[str, Any]]:
        # Track initial visible depth for top 5 levels
        for p, s in book.bids[:5] + book.asks[:5]:
            p_key = f"{p:.2f}"
            if p_key not in self.level_initial_depth:
                self.level_initial_depth[p_key] = s

        # Check if executed volume at any top level >= 1.5x initial visible depth
        for p, visible_s in book.bids[:5] + book.asks[:5]:
            p_key = f"{p:.2f}"
            exec_vol = self.level_executed_vol.get(p_key, 0.0)
            init_vol = self.level_initial_depth.get(p_key, visible_s)

            if init_vol > 0 and exec_vol >= (init_vol * self.iceberg_mult):
                side = "BID" if any(p == b[0] for b in book.bids[:5]) else "ASK"
                # Reset tracking for this level to avoid repeating trigger
                self.level_executed_vol[p_key] = 0.0
                return {
                    "id": f"evt_iceberg_{timestamp}_{uuid.uuid4().hex[:4]}",
                    "timestamp": timestamp,
                    "type": "POTENTIAL_ICEBERG",
                    "side": side,
                    "price": p,
                    "severity": "HIGH",
                    "details": f"Executed {exec_vol:.2f} units vs visible depth {init_vol:.2f} (multiple {exec_vol/init_vol:.2f}x), potential iceberg order"
                }

        return None

    def _check_spoof(self, book: OrderBook, metrics: Dict[str, Any], timestamp: int) -> Optional[Dict[str, Any]]:
        # Monitor top 5 levels for large orders appearing and vanishing rapidly
        top_bids = book.bids[:5]
        top_asks = book.asks[:5]

        bid_vols = [b[1] for b in top_bids]
        ask_vols = [a[1] for a in top_asks]
        base_bid_vol = float(min(bid_vols)) if bid_vols else 1.0
        base_ask_vol = float(min(ask_vols)) if ask_vols else 1.0

        for p, s in top_bids:
            if s >= max(2.0, base_bid_vol * 3.0):
                p_key = f"bid_{p:.2f}"
                if p_key not in self.limit_orders_tracked:
                    self.limit_orders_tracked[p_key] = {"timestamp": timestamp, "size": s, "side": "BID", "price": p}

        for p, s in top_asks:
            if s >= max(2.0, base_ask_vol * 3.0):
                p_key = f"ask_{p:.2f}"
                if p_key not in self.limit_orders_tracked:
                    self.limit_orders_tracked[p_key] = {"timestamp": timestamp, "size": s, "side": "ASK", "price": p}

        # Check for order cancellations
        curr_bid_prices = set(f"bid_{b[0]:.2f}" for b in top_bids)
        curr_ask_prices = set(f"ask_{a[0]:.2f}" for a in top_asks)

        expired_keys = []
        for p_key, details in list(self.limit_orders_tracked.items()):
            age_ms = timestamp - details["timestamp"]
            if details["side"] == "BID" and p_key not in curr_bid_prices:
                expired_keys.append(p_key)
                if age_ms < self.spoof_cancel_ms:
                    return {
                        "id": f"evt_spoof_{timestamp}_{uuid.uuid4().hex[:4]}",
                        "timestamp": timestamp,
                        "type": "POTENTIAL_SPOOF",
                        "side": "BID",
                        "price": details["price"],
                        "severity": "HIGH",
                        "details": f"Large limit bid ({details['size']:.2f}) cancelled in {age_ms}ms, potential spoofing-like activity"
                    }
            elif details["side"] == "ASK" and p_key not in curr_ask_prices:
                expired_keys.append(p_key)
                if age_ms < self.spoof_cancel_ms:
                    return {
                        "id": f"evt_spoof_{timestamp}_{uuid.uuid4().hex[:4]}",
                        "timestamp": timestamp,
                        "type": "POTENTIAL_SPOOF",
                        "side": "ASK",
                        "price": details["price"],
                        "severity": "HIGH",
                        "details": f"Large limit ask ({details['size']:.2f}) cancelled in {age_ms}ms, potential spoofing-like activity"
                    }
            elif age_ms > 5000:
                expired_keys.append(p_key)

        for k in expired_keys:
            self.limit_orders_tracked.pop(k, None)

        return None
