from typing import Dict, Any

class RiskEngine:
    """
    Analytical Risk Engine evaluating market microstructure risk metrics.
    Output: Risk level (LOW, MEDIUM, HIGH, EXTREME), estimated slippage (bps), and risk-discounted confidence.
    Purely analytical — no trade execution.
    """
    def evaluate_risk(self,
                      book_data: Dict[str, Any],
                      metrics: Dict[str, Any],
                      prediction: Dict[str, Any],
                      signal: Dict[str, Any]) -> Dict[str, Any]:
        
        spread_bps = book_data.get("spread_bps", 0.0)
        volatility = metrics.get("realized_volatility", 0.0)
        amihud = metrics.get("amihud_illiquidity", 0.0)
        
        bids = book_data.get("bids", [])
        asks = book_data.get("asks", [])
        top_bid_vol = bids[0][1] if bids else 0.0
        top_ask_vol = asks[0][1] if asks else 0.0
        min_top_vol = min(top_bid_vol, top_ask_vol)

        # 1. Slippage Estimation (bps)
        # Slippage = half-spread + market impact factor proportional to inverse depth
        impact_factor = (1.0 / (min_top_vol + 1e-3)) * 0.05
        slippage_est_bps = (spread_bps / 2.0) + impact_factor

        # 2. Risk Tier Classification
        risk_points = 0
        if spread_bps > 2.0:
            risk_points += 2
        elif spread_bps > 1.0:
            risk_points += 1

        if volatility > 0.003:
            risk_points += 2
        elif volatility > 0.0015:
            risk_points += 1

        if min_top_vol < 0.5:
            risk_points += 2
        elif min_top_vol < 1.5:
            risk_points += 1

        if risk_points >= 5:
            level = "EXTREME"
            discount_factor = 0.50
        elif risk_points >= 3:
            level = "HIGH"
            discount_factor = 0.75
        elif risk_points >= 1:
            level = "MEDIUM"
            discount_factor = 0.90
        else:
            level = "LOW"
            discount_factor = 1.00

        # 3. Risk-discounted signal confidence
        base_confidence = prediction.get("confidence", 50.0)
        adjusted_confidence = base_confidence * discount_factor

        return {
            "level": level,
            "slippage_est_bps": round(float(slippage_est_bps), 2),
            "adjusted_confidence": round(float(adjusted_confidence), 1)
        }
