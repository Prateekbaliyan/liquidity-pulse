import pytest
from backend.core.orderbook import OrderBook
from backend.core.detectors import AnomalyDetectorEngine

def test_iceberg_detector():
    det = AnomalyDetectorEngine(iceberg_mult=1.5)
    ob = OrderBook()
    ob.apply_snapshot([[64250.0, 2.0]], [[64251.0, 2.0]])
    
    # Record trade executions at 64250.0 totaling 3.5 (> 1.5 * 2.0 = 3.0)
    det.record_trade_execution(64250.0, 3.5)
    
    events = det.detect_anomalies(ob, {}, 10000)
    iceberg_evts = [e for e in events if e["type"] == "POTENTIAL_ICEBERG"]
    assert len(iceberg_evts) == 1
    assert iceberg_evts[0]["price"] == 64250.0

def test_spoof_detector():
    det = AnomalyDetectorEngine(spoof_cancel_ms=800)
    ob = OrderBook()
    # Large bid at 64250.0
    ob.apply_snapshot([[64250.0, 100.0], [64249.0, 1.0]], [[64251.0, 1.0]])
    det.detect_anomalies(ob, {}, 1000)
    
    # Order vanished rapidly at tick 1400 (400ms age)
    ob.apply_snapshot([[64249.0, 1.0]], [[64251.0, 1.0]])
    events = det.detect_anomalies(ob, {}, 1400)
    spoof_evts = [e for e in events if e["type"] == "POTENTIAL_SPOOF"]
    assert len(spoof_evts) == 1
