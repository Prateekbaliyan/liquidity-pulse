import pytest
from backend.core.orderbook import OrderBook
from backend.core.metrics import QuantMetricsCalculator

def test_obi_and_slopes():
    ob = OrderBook()
    bids = [[64250.0, 5.0], [64249.0, 5.0]]
    asks = [[64251.0, 1.0], [64252.0, 1.0]]
    ob.apply_snapshot(bids, asks)

    calc = QuantMetricsCalculator()
    obi = calc.compute_standard_obi(ob)
    assert obi > 0.0  # Bid dominant

    bid_slope, ask_slope = calc.compute_orderbook_slopes(ob)
    assert isinstance(bid_slope, float)
    assert isinstance(ask_slope, float)

def test_cvd_recording():
    calc = QuantMetricsCalculator()
    # Taker buy -> +1.5
    calc.record_trade(1000, 64250.0, 1.5, is_buyer_maker=False)
    # Taker sell -> -0.5
    calc.record_trade(2000, 64250.0, 0.5, is_buyer_maker=True)

    assert calc.cumulative_vd == 1.0
