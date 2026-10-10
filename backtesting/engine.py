import json
import os
from typing import List, Dict, Any, Optional
from backend.core.engine import LiquidityPulseCoreEngine
from backtesting.simulator import TakerFillSimulator
from backtesting.metrics import calculate_backtest_metrics

class BacktestEngine:
    """
    Event-driven backtesting engine running historical data through the full quant pipeline.
    """
    def __init__(self,
                 symbol: str = "BTCUSDT",
                 initial_capital: float = 10000.0,
                 order_size: float = 0.1,
                 fee_rate: float = 0.0005,
                 latency_ms: float = 25.0,
                 signal_threshold: float = 0.65):
        self.symbol = symbol
        self.initial_capital = initial_capital
        self.order_size = order_size
        self.fee_rate = fee_rate
        self.latency_ms = latency_ms
        self.signal_threshold = signal_threshold

        self.core_engine = LiquidityPulseCoreEngine(symbol=symbol)
        self.fill_sim = TakerFillSimulator(default_fee_rate=fee_rate, default_latency_ms=latency_ms)

    def run_backtest_on_file(self, jsonl_filepath: str = "data/replay/sample_btcusdt.jsonl") -> Dict[str, Any]:
        if not os.path.exists(jsonl_filepath):
            # Generate if missing
            from data.generate_sample_replay import generate_sample_replay_jsonl
            generate_sample_replay_jsonl(jsonl_filepath, num_records=500)

        records = []
        with open(jsonl_filepath, "r") as f:
            for line in f:
                if line.strip():
                    records.append(json.loads(line))

        return self.run_backtest(records)

    def run_backtest(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        capital = self.initial_capital
        position = 0.0  # current holdings
        entry_fill = 0.0
        
        trades = []
        equity_curve = []

        for rec in records:
            rec_type = rec.get("type", "depth")
            ts = rec.get("timestamp", 0)

            if rec_type == "depth":
                feed = self.core_engine.process_depth_snapshot(rec["bids"], rec["asks"], timestamp=ts)
            else:
                feed = self.core_engine.process_trade(rec["price"], rec["quantity"], rec["is_buyer_maker"], timestamp=ts)

            price = feed["price"]
            sig = feed["signal"]
            bids = feed["orderbook"]["bids"]
            asks = feed["orderbook"]["asks"]
            spread = feed["orderbook"]["spread"]

            direction = sig["direction"]
            strength = sig["strength"]

            # Strategy Trading Logic
            if position == 0.0:
                if direction == "LONG" and strength >= self.signal_threshold:
                    fill = self.fill_sim.simulate_fill("BUY", self.order_size, price, spread, bids, asks, self.fee_rate, self.latency_ms)
                    position = self.order_size
                    entry_fill = fill["effective_fill"]
                    capital -= fill["fee_amount"]
                    trades.append({
                        "timestamp": ts,
                        "type": "BUY",
                        "price": fill["effective_fill"],
                        "size": self.order_size,
                        "fee": fill["fee_amount"],
                        "slippage_bps": fill["slippage_bps"],
                        "pnl": 0.0,
                        "reason": ", ".join(sig["reasons"])
                    })
                elif direction == "SHORT" and strength >= self.signal_threshold:
                    fill = self.fill_sim.simulate_fill("SELL", self.order_size, price, spread, bids, asks, self.fee_rate, self.latency_ms)
                    position = -self.order_size
                    entry_fill = fill["effective_fill"]
                    capital -= fill["fee_amount"]
                    trades.append({
                        "timestamp": ts,
                        "type": "SELL",
                        "price": fill["effective_fill"],
                        "size": self.order_size,
                        "fee": fill["fee_amount"],
                        "slippage_bps": fill["slippage_bps"],
                        "pnl": 0.0,
                        "reason": ", ".join(sig["reasons"])
                    })

            elif position > 0.0:  # Long open
                if direction == "SHORT" or (direction == "NEUTRAL" and strength < 0.3):
                    fill = self.fill_sim.simulate_fill("SELL", self.order_size, price, spread, bids, asks, self.fee_rate, self.latency_ms)
                    pnl = (fill["effective_fill"] - entry_fill) * self.order_size - fill["fee_amount"]
                    capital += pnl
                    position = 0.0
                    trades.append({
                        "timestamp": ts,
                        "type": "CLOSE_LONG",
                        "price": fill["effective_fill"],
                        "size": self.order_size,
                        "fee": fill["fee_amount"],
                        "slippage_bps": fill["slippage_bps"],
                        "pnl": round(pnl, 2),
                        "reason": "Signal exit"
                    })

            elif position < 0.0:  # Short open
                if direction == "LONG" or (direction == "NEUTRAL" and strength < 0.3):
                    fill = self.fill_sim.simulate_fill("BUY", self.order_size, price, spread, bids, asks, self.fee_rate, self.latency_ms)
                    pnl = (entry_fill - fill["effective_fill"]) * self.order_size - fill["fee_amount"]
                    capital += pnl
                    position = 0.0
                    trades.append({
                        "timestamp": ts,
                        "type": "CLOSE_SHORT",
                        "price": fill["effective_fill"],
                        "size": self.order_size,
                        "fee": fill["fee_amount"],
                        "slippage_bps": fill["slippage_bps"],
                        "pnl": round(pnl, 2),
                        "reason": "Signal exit"
                    })

            # Record current marked equity
            marked_equity = capital + (position * (price - entry_fill) if position != 0.0 else 0.0)
            equity_curve.append({
                "timestamp": ts,
                "equity": round(marked_equity, 2)
            })

        summary = calculate_backtest_metrics(self.initial_capital, trades, equity_curve)

        return {
            "summary": summary,
            "equity_curve": equity_curve[::5],  # sample every 5th for efficient transmission
            "trades": trades
        }
