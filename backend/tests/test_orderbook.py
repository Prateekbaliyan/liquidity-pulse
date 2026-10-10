import pytest
from backend.core.orderbook import OrderBook

def test_orderbook_snapshot_and_metrics():
    ob = OrderBook()
    bids = [[64250.0, 1.5], [64249.0, 2.0]]
    asks = [[64250.5, 1.0], [64251.5, 3.0]]
    
    ob.apply_snapshot(bids, asks)
    
    assert ob.best_bid == 64250.0
    assert ob.best_ask == 64250.5
    assert ob.mid_price == 64250.25
    assert ob.spread == 0.5
    assert ob.spread_bps > 0.0

def test_stoikov_micro_price():
    ob = OrderBook()
    bids = [[100.0, 10.0]]  # heavy bid
    asks = [[101.0, 2.0]]   # light ask
    ob.apply_snapshot(bids, asks)
    
    # P_micro = 100 * (2/12) + 101 * (10/12) = 16.666 + 84.166 = 100.833
    micro = ob.stoikov_micro_price()
    assert micro > ob.mid_price  # micro price shifted towards ask due to heavy bid volume
