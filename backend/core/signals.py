from typing import Dict, Any, List

class SignalFusionEngine:
    """
    Signal Fusion Engine combining ML probabilities, OBI, CVD velocity, micro-mid divergence, and anomaly event scores.
    Outputs LONG, SHORT, or NEUTRAL with confidence strength and human-readable rationale tags.
    """
    def fuse_signal(self,
                    prediction: Dict[str, Any],
                    metrics: Dict[str, Any],
                    events: List[Dict[str, Any]]) -> Dict[str, Any]:
        
        direction_ml = prediction.get("direction", "NEUTRAL")
        probs = prediction.get("probabilities", {"DOWN": 0.33, "NEUTRAL": 0.34, "UP": 0.33})
        
        obi = metrics.get("obi", 0.0)
        cvd_vel = metrics.get("cvd_velocity", 0.0)
        micro_div = metrics.get("micro_mid_divergence", 0.0)
        
        reasons = []
        long_score = 0.0
        short_score = 0.0
        
        # 1. ML Contribution
        if direction_ml == "UP" and probs.get("UP", 0.0) > 0.45:
            long_score += probs["UP"] * 0.40
            reasons.append(f"ML probability UP ({probs['UP']*100:.0f}%)")
        elif direction_ml == "DOWN" and probs.get("DOWN", 0.0) > 0.45:
            short_score += probs["DOWN"] * 0.40
            reasons.append(f"ML probability DOWN ({probs['DOWN']*100:.0f}%)")

        # 2. OBI Contribution
        if obi > 0.15:
            long_score += min(0.30, obi * 0.30)
            reasons.append("positive OBI imbalance")
        elif obi < -0.15:
            short_score += min(0.30, abs(obi) * 0.30)
            reasons.append("negative OBI imbalance")

        # 3. CVD Velocity
        if cvd_vel > 0.5:
            long_score += 0.20
            reasons.append("taker CVD expansion")
        elif cvd_vel < -0.5:
            short_score += 0.20
            reasons.append("taker CVD contraction")

        # 4. Stoikov Micro-price Divergence
        if micro_div > 0.02:
            long_score += 0.15
            reasons.append("micro-price above mid")
        elif micro_div < -0.02:
            short_score += 0.15
            reasons.append("micro-price below mid")

        # 5. Anomaly Modifiers
        for evt in events:
            if evt["type"] == "LIQUIDITY_SWEEP":
                if evt["side"] == "BID":  # Swept low -> bullish bounce potential
                    long_score += 0.15
                    reasons.append("liquidity sweep at bid support")
                elif evt["side"] == "ASK":  # Swept high -> bearish rejection potential
                    short_score += 0.15
                    reasons.append("liquidity sweep at ask resistance")
            elif evt["type"] == "FAKEOUT":
                if evt["side"] == "ASK":
                    short_score += 0.15
                    reasons.append("fakeout breakout rejection")
                elif evt["side"] == "BID":
                    long_score += 0.15
                    reasons.append("fakeout breakdown rejection")

        # Decision Thresholding
        final_dir = "NEUTRAL"
        strength = 0.0
        
        if long_score > short_score and long_score >= 0.45:
            final_dir = "LONG"
            strength = min(1.0, long_score)
        elif short_score > long_score and short_score >= 0.45:
            final_dir = "SHORT"
            strength = min(1.0, short_score)
        else:
            final_dir = "NEUTRAL"
            strength = max(long_score, short_score)
            if not reasons:
                reasons.append("balanced order flow")

        return {
            "direction": final_dir,
            "strength": round(float(strength), 2),
            "reasons": reasons
        }
