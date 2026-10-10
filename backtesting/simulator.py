from typing import Dict, Any

class TakerFillSimulator:
    """
    Microstructure-aware taker execution fill simulator.
    Calculates exact effective fill price including spread, dynamic depth slippage, fee, and latency impact.
    """
    def __init__(self, default_fee_rate: float = 0.0005, default_latency_ms: float = 25.0):
        self.fee_rate = default_fee_rate
        self.latency_ms = default_latency_ms

    def simulate_fill(self,
                      side: str,  # BUY or SELL
                      order_size: float,
                      mid_price: float,
                      spread: float,
                      bids: list,
                      asks: list,
                      fee_rate: float = None,
                      latency_ms: float = None) -> Dict[str, Any]:
        
        fee_pct = fee_rate if fee_rate is not None else self.fee_rate
        lat_ms = latency_ms if latency_ms is not None else self.latency_ms

        half_spread = spread / 2.0

        # Depth slippage calculation based on order size vs top level depth
        if side == "BUY":
            top_depth = asks[0][1] if asks else 1.0
            depth_ratio = order_size / (top_depth + 1e-4)
            slippage_bps = min(50.0, max(0.1, depth_ratio * 0.5 * 10000.0 / mid_price))
            
            # Latency penalty: price drift factor during 25ms delay
            latency_penalty = (lat_ms / 1000.0) * (mid_price * 0.00005)
            
            slippage_abs = (slippage_bps / 10000.0) * mid_price
            effective_fill = mid_price + half_spread + slippage_abs + latency_penalty
            fee_amount = effective_fill * order_size * fee_pct

        else:  # SELL
            top_depth = bids[0][1] if bids else 1.0
            depth_ratio = order_size / (top_depth + 1e-4)
            slippage_bps = min(50.0, max(0.1, depth_ratio * 0.5 * 10000.0 / mid_price))
            
            latency_penalty = (lat_ms / 1000.0) * (mid_price * 0.00005)
            
            slippage_abs = (slippage_bps / 10000.0) * mid_price
            effective_fill = mid_price - half_spread - slippage_abs - latency_penalty
            fee_amount = effective_fill * order_size * fee_pct

        return {
            "effective_fill": round(effective_fill, 2),
            "fee_amount": round(fee_amount, 4),
            "slippage_bps": round(slippage_bps, 2),
            "latency_penalty": round(latency_penalty, 4)
        }
