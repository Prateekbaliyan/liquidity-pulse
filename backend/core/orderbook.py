import time
import bisect
from collections import deque
from typing import List, Tuple, Dict, Any, Optional

class OrderBook:
    """
    In-memory L2 Order Book keeping sorted bids and asks.
    Bids are sorted descending by price.
    Asks are sorted ascending by price.
    Supports snapshot loading and delta updates.
    """
    def __init__(self, max_history_seconds: int = 120):
        # bids: list of [price, size] sorted descending by price
        self.bids: List[List[float]] = []
        # asks: list of [price, size] sorted ascending by price
        self.asks: List[List[float]] = []
        self.last_update_id: int = 0
        self.last_timestamp: int = 0
        
        # 120-second rolling history buffer (100ms resolution = max ~1200 items)
        self.history: deque = deque(maxlen=1200)
        self.max_history_seconds = max_history_seconds

    def apply_snapshot(self, bids: List[List[float]], asks: List[List[float]], update_id: int = 0, timestamp: Optional[int] = None):
        """Re-initializes the orderbook with a full snapshot."""
        # Clean bids (price desc)
        sorted_bids = sorted([[float(p), float(s)] for p, s in bids if float(s) > 0], key=lambda x: x[0], reverse=True)
        # Clean asks (price asc)
        sorted_asks = sorted([[float(p), float(s)] for p, s in asks if float(s) > 0], key=lambda x: x[0])
        
        self.bids = sorted_bids[:20]
        self.asks = sorted_asks[:20]
        self.last_update_id = update_id
        ts = timestamp if timestamp else int(time.time() * 1000)
        self.last_timestamp = ts
        
        self._record_history(ts)

    def apply_delta(self, bid_deltas: List[List[float]], ask_deltas: List[List[float]], update_id: int = 0, timestamp: Optional[int] = None):
        """Applies depth deltas to bids and asks."""
        ts = timestamp if timestamp else int(time.time() * 1000)
        self.last_timestamp = ts
        if update_id > 0:
            self.last_update_id = update_id

        # Update bids
        bid_dict = {p: s for p, s in self.bids}
        for item in bid_deltas:
            p, s = float(item[0]), float(item[1])
            if s <= 0:
                bid_dict.pop(p, None)
            else:
                bid_dict[p] = s
        new_bids = [[p, s] for p, s in bid_dict.items()]
        new_bids.sort(key=lambda x: x[0], reverse=True)
        self.bids = new_bids[:20]

        # Update asks
        ask_dict = {p: s for p, s in self.asks}
        for item in ask_deltas:
            p, s = float(item[0]), float(item[1])
            if s <= 0:
                ask_dict.pop(p, None)
            else:
                ask_dict[p] = s
        new_asks = [[p, s] for p, s in ask_dict.items()]
        new_asks.sort(key=lambda x: x[0])
        self.asks = new_asks[:20]

        self._record_history(ts)

    def _record_history(self, timestamp: int):
        snap = {
            "timestamp": timestamp,
            "best_bid": self.best_bid,
            "best_ask": self.best_ask,
            "mid_price": self.mid_price,
            "spread": self.spread,
            "bids": [list(b) for b in self.bids[:10]],
            "asks": [list(a) for a in self.asks[:10]]
        }
        self.history.append(snap)
        
        # Evict snapshots older than max_history_seconds
        cutoff = timestamp - (self.max_history_seconds * 1000)
        while self.history and self.history[0]["timestamp"] < cutoff:
            self.history.popleft()

    @property
    def best_bid(self) -> float:
        return self.bids[0][0] if self.bids else 0.0

    @property
    def best_bid_volume(self) -> float:
        return self.bids[0][1] if self.bids else 0.0

    @property
    def best_ask(self) -> float:
        return self.asks[0][0] if self.asks else 0.0

    @property
    def best_ask_volume(self) -> float:
        return self.asks[0][1] if self.asks else 0.0

    @property
    def mid_price(self) -> float:
        if self.bids and self.asks:
            return (self.bids[0][0] + self.asks[0][0]) / 2.0
        return self.bids[0][0] if self.bids else (self.asks[0][0] if self.asks else 0.0)

    @property
    def spread(self) -> float:
        if self.bids and self.asks:
            return max(0.0, self.asks[0][0] - self.bids[0][0])
        return 0.0

    @property
    def spread_bps(self) -> float:
        mid = self.mid_price
        if mid > 0:
            return (self.spread / mid) * 10000.0
        return 0.0

    def stoikov_micro_price(self) -> float:
        """
        Stoikov Micro-Price formula:
        P_micro = P_bid * (V_ask / (V_bid + V_ask)) + P_ask * (V_bid / (V_bid + V_ask))
        """
        if not self.bids or not self.asks:
            return self.mid_price
        
        p_bid = self.bids[0][0]
        v_bid = self.bids[0][1]
        p_ask = self.asks[0][0]
        v_ask = self.asks[0][1]
        
        total_v = v_bid + v_ask
        if total_v <= 0:
            return self.mid_price
            
        return p_bid * (v_ask / total_v) + p_ask * (v_bid / total_v)

    def micro_mid_divergence(self) -> float:
        return self.stoikov_micro_price() - self.mid_price

    def get_depth_sums(self, levels: int = 10) -> Tuple[float, float]:
        bid_vol = sum(item[1] for item in self.bids[:levels])
        ask_vol = sum(item[1] for item in self.asks[:levels])
        return bid_vol, ask_vol
