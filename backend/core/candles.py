import math
from typing import Dict, List, Any, Optional

class IntraCandleFootprint:
    def __init__(self, price: float):
        self.price = price
        self.buy_volume: float = 0.0
        self.sell_volume: float = 0.0

    @property
    def total_volume(self) -> float:
        return self.buy_volume + self.sell_volume

class FootprintCandle:
    def __init__(self, start_timestamp: int, interval: str, open_price: float):
        self.start_timestamp = start_timestamp
        self.interval = interval
        self.open = open_price
        self.high = open_price
        self.low = open_price
        self.close = open_price
        self.volume: float = 0.0
        self.buy_volume: float = 0.0
        self.sell_volume: float = 0.0
        
        # Footprint dictionary: price_rounded_str -> IntraCandleFootprint
        self.levels: Dict[str, IntraCandleFootprint] = {}

    def add_trade(self, price: float, quantity: float, is_buyer_maker: bool):
        self.close = price
        if price > self.high:
            self.high = price
        if price < self.low:
            self.low = price
            
        self.volume += quantity
        p_key = f"{price:.2f}"
        if p_key not in self.levels:
            self.levels[p_key] = IntraCandleFootprint(price)
            
        if is_buyer_maker:  # Taker sell -> sell volume
            self.sell_volume += quantity
            self.levels[p_key].sell_volume += quantity
        else:  # Taker buy -> buy volume
            self.buy_volume += quantity
            self.levels[p_key].buy_volume += quantity

    def calculate_poc_and_value_area(self, target_pct: float = 0.70) -> tuple[float, float, float]:
        """
        Calculates Point of Control (POC), Value Area High (VAH), and Value Area Low (VAL).
        Returns (poc_price, vah, val).
        """
        if not self.levels:
            return self.close, self.high, self.low

        # Find POC level with maximum total volume
        poc_key = max(self.levels.keys(), key=lambda k: self.levels[k].total_volume)
        poc_price = float(poc_key)

        if self.volume <= 0:
            return poc_price, self.high, self.low

        target_vol = self.volume * target_pct
        
        # Sort levels by price ascending
        sorted_prices = sorted([float(k) for k in self.levels.keys()])
        poc_idx = sorted_prices.index(poc_price)

        current_vol = self.levels[f"{poc_price:.2f}"].total_volume
        low_idx = poc_idx
        high_idx = poc_idx

        # Expand outwards from POC until 70% volume target is reached
        while current_vol < target_vol and (low_idx > 0 or high_idx < len(sorted_prices) - 1):
            next_below = sorted_prices[low_idx - 1] if low_idx > 0 else None
            next_above = sorted_prices[high_idx + 1] if high_idx < len(sorted_prices) - 1 else None

            vol_below = self.levels[f"{next_below:.2f}"].total_volume if next_below is not None else -1
            vol_above = self.levels[f"{next_above:.2f}"].total_volume if next_above is not None else -1

            if vol_above >= vol_below and next_above is not None:
                high_idx += 1
                current_vol += vol_above
            elif next_below is not None:
                low_idx -= 1
                current_vol += vol_below
            else:
                break

        val = sorted_prices[low_idx]
        vah = sorted_prices[high_idx]
        return poc_price, vah, val

    def to_dict_data(self) -> Dict[str, Any]:
        poc, vah, val = self.calculate_poc_and_value_area()
        footprint_map = {}
        for k, v in self.levels.items():
            footprint_map[k] = {
                "buy_vol": round(v.buy_volume, 4),
                "sell_vol": round(v.sell_volume, 4)
            }
        return {
            "timestamp": self.start_timestamp,
            "interval": self.interval,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": round(self.volume, 4),
            "buy_volume": round(self.buy_volume, 4),
            "sell_volume": round(self.sell_volume, 4),
            "poc_price": poc,
            "vah": vah,
            "val": val,
            "footprint": footprint_map
        }

class CandleAggregator:
    """
    Manages dynamic multi-timeframe candles: 1s, 5s, 15s, 1m, 5m.
    """
    INTERVAL_SECONDS = {
        "1s": 1,
        "5s": 5,
        "15s": 15,
        "1m": 60,
        "5m": 300
    }

    def __init__(self):
        self.active_candles: Dict[str, Optional[FootprintCandle]] = {
            tf: None for tf in self.INTERVAL_SECONDS
        }

    def process_trade(self, timestamp: int, price: float, quantity: float, is_buyer_maker: bool) -> Dict[str, Dict[str, Any]]:
        updated_candles = {}
        
        for tf, duration in self.INTERVAL_SECONDS.items():
            bucket_ms = (timestamp // (duration * 1000)) * (duration * 1000)
            
            candle = self.active_candles[tf]
            if candle is None or candle.start_timestamp != bucket_ms:
                # Open a new candle
                candle = FootprintCandle(bucket_ms, tf, price)
                self.active_candles[tf] = candle
                
            candle.add_trade(price, quantity, is_buyer_maker)
            updated_candles[tf] = candle.to_dict_data()

        return updated_candles
