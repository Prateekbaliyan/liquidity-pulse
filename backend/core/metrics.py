import math
import numpy as np
from collections import deque
from typing import List, Tuple, Dict, Any, Optional
from backend.core.orderbook import OrderBook

class QuantMetricsCalculator:
    """
    Real-time high-frequency microstructure metrics engine.
    Maintains rolling buffers for 5s, 15s, 30s, 60s, 1m, 5m lookbacks.
    """
    def __init__(self, decay_lambda: float = 0.5):
        self.decay_lambda = decay_lambda
        
        # Buffer of (timestamp_ms, obi, cvd_delta, price, is_trade)
        # Store last 5 minutes (300,000 ms) of metric ticks
        self.tick_history: deque = deque(maxlen=3000)
        self.trade_history: deque = deque(maxlen=5000)
        
        # CVD running sum
        self.cumulative_vd: float = 0.0

    def compute_standard_obi(self, book: OrderBook, levels: int = 10) -> float:
        bid_vol, ask_vol = book.get_depth_sums(levels=levels)
        tot_vol = bid_vol + ask_vol
        if tot_vol <= 0:
            return 0.0
        return (bid_vol - ask_vol) / tot_vol

    def compute_weighted_obi(self, book: OrderBook, levels: int = 10) -> float:
        mid = book.mid_price
        if mid <= 0:
            return 0.0

        w_bid_vol = 0.0
        for p, v in book.bids[:levels]:
            dist_pct = abs(p - mid) / mid * 100.0
            weight = math.exp(-self.decay_lambda * dist_pct)
            w_bid_vol += v * weight

        w_ask_vol = 0.0
        for p, v in book.asks[:levels]:
            dist_pct = abs(p - mid) / mid * 100.0
            weight = math.exp(-self.decay_lambda * dist_pct)
            w_ask_vol += v * weight

        tot_w_vol = w_bid_vol + w_ask_vol
        if tot_w_vol <= 0:
            return 0.0
        return (w_bid_vol - w_ask_vol) / tot_w_vol

    def compute_orderbook_slopes(self, book: OrderBook, levels: int = 10) -> Tuple[float, float]:
        """
        Calculates elasticity slope via linear regression on cumulative volume vs price distance.
        Returns (bid_slope, ask_slope).
        """
        mid = book.mid_price
        if mid <= 0 or not book.bids or not book.asks:
            return 0.0, 0.0

        # Bid side slope
        cum_bid_vol = 0.0
        x_bids, y_bids = [], []
        for p, v in book.bids[:levels]:
            cum_bid_vol += v
            dist = (mid - p)
            x_bids.append(dist)
            y_bids.append(cum_bid_vol)

        bid_slope = 0.0
        if len(x_bids) > 1 and np.var(x_bids) > 1e-9:
            bid_slope = float(np.polyfit(x_bids, y_bids, 1)[0])

        # Ask side slope
        cum_ask_vol = 0.0
        x_asks, y_asks = [], []
        for p, v in book.asks[:levels]:
            cum_ask_vol += v
            dist = (p - mid)
            x_asks.append(dist)
            y_asks.append(cum_ask_vol)

        ask_slope = 0.0
        if len(x_asks) > 1 and np.var(x_asks) > 1e-9:
            ask_slope = float(np.polyfit(x_asks, y_asks, 1)[0])

        return bid_slope, ask_slope

    def record_trade(self, timestamp: int, price: float, quantity: float, is_buyer_maker: bool):
        """
        Processes executed taker trade for CVD and trade intensity tracking.
        is_buyer_maker True -> Sell order executed (taker sell).
        is_buyer_maker False -> Buy order executed (taker buy).
        """
        # Delta: Taker buy (+) vs Taker sell (-)
        delta = -quantity if is_buyer_maker else quantity
        self.cumulative_vd += delta
        self.trade_history.append({
            "timestamp": timestamp,
            "price": price,
            "quantity": quantity,
            "delta": delta,
            "is_buyer_maker": is_buyer_maker
        })

    def process_tick(self, book: OrderBook, timestamp: int) -> Dict[str, Any]:
        """
        Main tick execution processing for quant metrics.
        """
        current_price = book.mid_price
        obi = self.compute_weighted_obi(book, levels=10)
        micro_price = book.stoikov_micro_price()
        micro_div = book.micro_mid_divergence()
        bid_slope, ask_slope = self.compute_orderbook_slopes(book, levels=10)

        # Store in rolling tick history
        self.tick_history.append({
            "timestamp": timestamp,
            "obi": obi,
            "price": current_price,
            "micro_div": micro_div
        })

        # Evict history > 5 min (300,000 ms)
        cutoff_5m = timestamp - 300000
        while self.tick_history and self.tick_history[0]["timestamp"] < cutoff_5m:
            self.tick_history.popleft()

        while self.trade_history and self.trade_history[0]["timestamp"] < cutoff_5m:
            self.trade_history.popleft()

        # Extract lookback slices
        obi_5s = [t["obi"] for t in self.tick_history if t["timestamp"] >= timestamp - 5000]
        obi_15s = [t["obi"] for t in self.tick_history if t["timestamp"] >= timestamp - 15000]
        obi_30s = [t["obi"] for t in self.tick_history if t["timestamp"] >= timestamp - 30000]
        obi_60s = [t["obi"] for t in self.tick_history if t["timestamp"] >= timestamp - 60000]

        obi_mean_5s = float(np.mean(obi_5s)) if obi_5s else obi
        obi_std_5s = float(np.std(obi_5s)) if len(obi_5s) > 1 else 0.0
        obi_mean_15s = float(np.mean(obi_15s)) if obi_15s else obi
        obi_std_15s = float(np.std(obi_15s)) if len(obi_15s) > 1 else 0.0
        obi_mean_30s = float(np.mean(obi_30s)) if obi_30s else obi
        obi_std_30s = float(np.std(obi_30s)) if len(obi_30s) > 1 else 0.0
        obi_mean_60s = float(np.mean(obi_60s)) if obi_60s else obi
        obi_std_60s = float(np.std(obi_60s)) if len(obi_60s) > 1 else 0.0

        # CVD calculation
        trades_1m = [tr for tr in self.trade_history if tr["timestamp"] >= timestamp - 60000]
        trades_5m = [tr for tr in self.trade_history if tr["timestamp"] >= timestamp - 300000]

        cvd_1m = float(sum(tr["delta"] for tr in trades_1m))
        cvd_5m = float(sum(tr["delta"] for tr in trades_5m))

        # CVD Velocity (10s delta of CVD)
        trades_10s = [tr for tr in self.trade_history if tr["timestamp"] >= timestamp - 10000]
        cvd_velocity = float(sum(tr["delta"] for tr in trades_10s)) / 10.0

        # Trade Intensity (trades per sec in last 60s)
        trade_intensity = float(len(trades_1m)) / 60.0
        
        # Trade intensity z-score over 5m rolling baseline
        # Partition 5m into 5 1-minute chunks to compute mean and std
        intense_baseline = []
        for i in range(5):
            t_sub = [tr for tr in trades_5m if (timestamp - (i+1)*60000) <= tr["timestamp"] < (timestamp - i*60000)]
            intense_baseline.append(len(t_sub) / 60.0)
        
        b_mean = float(np.mean(intense_baseline)) if intense_baseline else trade_intensity
        b_std = float(np.std(intense_baseline)) if len(intense_baseline) > 1 else 1.0
        trade_intensity_zscore = (trade_intensity - b_mean) / (b_std + 1e-6)

        # Realized Volatility & Price velocity
        prices_60s = [t["price"] for t in self.tick_history if t["timestamp"] >= timestamp - 60000]
        realized_vol = 0.0
        price_velocity = 0.0
        price_return = 0.0
        if len(prices_60s) > 2:
            returns = np.diff(np.log(prices_60s))
            realized_vol = float(np.std(returns) * np.sqrt(len(returns)))
            price_return = float((prices_60s[-1] - prices_60s[0]) / prices_60s[0])
            price_velocity = float(prices_60s[-1] - prices_60s[0]) / 60.0

        # Kyle's Lambda & Amihud Illiquidity
        tot_vol_1m = sum(tr["quantity"] for tr in trades_1m)
        abs_p_change_1m = abs(prices_60s[-1] - prices_60s[0]) if len(prices_60s) > 1 else 0.0
        
        kyle_lambda = (abs_p_change_1m / tot_vol_1m) if tot_vol_1m > 0 else 0.0
        amihud_illiquidity = (abs(price_return) / tot_vol_1m) if tot_vol_1m > 0 else 0.0

        return {
            "obi": obi,
            "obi_mean_5s": obi_mean_5s,
            "obi_std_5s": obi_std_5s,
            "obi_mean_15s": obi_mean_15s,
            "obi_std_15s": obi_std_15s,
            "obi_mean_30s": obi_mean_30s,
            "obi_std_30s": obi_std_30s,
            "obi_mean_60s": obi_mean_60s,
            "obi_std_60s": obi_std_60s,
            "stoikov_micro_price": micro_price,
            "micro_mid_divergence": micro_div,
            "cvd_1m": cvd_1m,
            "cvd_5m": cvd_5m,
            "cvd_velocity": cvd_velocity,
            "trade_intensity": trade_intensity,
            "trade_intensity_zscore": trade_intensity_zscore,
            "realized_volatility": realized_vol,
            "price_return": price_return,
            "price_velocity": price_velocity,
            "kyle_lambda": kyle_lambda,
            "amihud_illiquidity": amihud_illiquidity,
            "bid_slope": bid_slope,
            "ask_slope": ask_slope
        }
