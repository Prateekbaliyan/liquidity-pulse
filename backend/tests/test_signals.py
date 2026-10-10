import pytest
from backend.core.signals import SignalFusionEngine
from backend.core.risk import RiskEngine

def test_signal_fusion_long():
    engine = SignalFusionEngine()
    prediction = {"direction": "UP", "probabilities": {"DOWN": 0.05, "NEUTRAL": 0.15, "UP": 0.80}}
    metrics = {"obi": 0.35, "cvd_velocity": 1.2, "micro_mid_divergence": 0.05}
    
    sig = engine.fuse_signal(prediction, metrics, [])
    assert sig["direction"] == "LONG"
    assert sig["strength"] >= 0.65
    assert len(sig["reasons"]) >= 2

def test_risk_evaluation():
    engine = RiskEngine()
    book_data = {"bids": [[100, 1.0]], "asks": [[101, 1.0]], "spread_bps": 100.0}
    metrics = {"realized_volatility": 0.005, "amihud_illiquidity": 0.1}
    prediction = {"confidence": 80.0}
    
    risk = engine.evaluate_risk(book_data, metrics, prediction, {})
    assert risk["level"] in ["HIGH", "EXTREME"]
    assert risk["adjusted_confidence"] < 80.0
