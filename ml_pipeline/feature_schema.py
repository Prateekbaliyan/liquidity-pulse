import numpy as np
from typing import Dict, Any, List

FEATURE_NAMES = [
    "obi_mean_5s",
    "obi_std_5s",
    "obi_mean_15s",
    "obi_std_15s",
    "obi_mean_30s",
    "obi_std_30s",
    "spread",
    "spread_velocity",
    "micro_mid_divergence",
    "cvd_1m",
    "cvd_5m",
    "cvd_velocity",
    "trade_intensity",
    "trade_intensity_zscore",
    "price_return",
    "price_velocity",
    "realized_volatility",
    "depth_imbalance",
    "liquidity_removal_rate",
    "sweep_score",
    "fakeout_score",
    "iceberg_score",
    "spoof_score"
]

def build_feature_vector(metrics: Dict[str, Any], book_data: Dict[str, Any], events: List[Dict[str, Any]]) -> np.ndarray:
    """
    Constructs a 23-dimension Float32 vector matching FEATURE_NAMES.
    """
    # Event indicator scores
    sweep_score = 1.0 if any(e["type"] == "LIQUIDITY_SWEEP" for e in events) else 0.0
    fakeout_score = 1.0 if any(e["type"] == "FAKEOUT" for e in events) else 0.0
    iceberg_score = 1.0 if any(e["type"] == "POTENTIAL_ICEBERG" for e in events) else 0.0
    spoof_score = 1.0 if any(e["type"] == "POTENTIAL_SPOOF" for e in events) else 0.0

    bids = book_data.get("bids", [])
    asks = book_data.get("asks", [])
    total_b_vol = sum(b[1] for b in bids[:10]) if bids else 0.0
    total_a_vol = sum(a[1] for a in asks[:10]) if asks else 0.0
    
    depth_imbalance = (total_b_vol - total_a_vol) / (total_b_vol + total_a_vol + 1e-6)
    liquidity_removal_rate = metrics.get("kyle_lambda", 0.0) * metrics.get("trade_intensity", 0.0)

    vec = [
        float(metrics.get("obi_mean_5s", 0.0)),
        float(metrics.get("obi_std_5s", 0.0)),
        float(metrics.get("obi_mean_15s", 0.0)),
        float(metrics.get("obi_std_15s", 0.0)),
        float(metrics.get("obi_mean_30s", 0.0)),
        float(metrics.get("obi_std_30s", 0.0)),
        float(book_data.get("spread", 0.0)),
        float(metrics.get("price_velocity", 0.0) * 0.1), # proxy spread velocity
        float(metrics.get("micro_mid_divergence", 0.0)),
        float(metrics.get("cvd_1m", 0.0)),
        float(metrics.get("cvd_5m", 0.0)),
        float(metrics.get("cvd_velocity", 0.0)),
        float(metrics.get("trade_intensity", 0.0)),
        float(metrics.get("trade_intensity_zscore", 0.0)),
        float(metrics.get("price_return", 0.0)),
        float(metrics.get("price_velocity", 0.0)),
        float(metrics.get("realized_volatility", 0.0)),
        float(depth_imbalance),
        float(liquidity_removal_rate),
        float(sweep_score),
        float(fakeout_score),
        float(iceberg_score),
        float(spoof_score)
    ]
    return np.array(vec, dtype=np.float32)
