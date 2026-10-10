import pytest
import asyncio
from backtesting.engine import BacktestEngine

def test_backtest_engine_run():
    engine = BacktestEngine(symbol="BTCUSDT", initial_capital=10000.0)
    res = engine.run_backtest_on_file("data/replay/sample_btcusdt.jsonl")
    
    assert "summary" in res
    assert "equity_curve" in res
    assert "trades" in res
    assert isinstance(res["summary"]["total_return_pct"], float)
    assert len(res["equity_curve"]) > 0
