import time
from typing import Dict, Any, List, Optional
from backend.core.orderbook import OrderBook
from backend.core.metrics import QuantMetricsCalculator
from backend.core.detectors import AnomalyDetectorEngine
from backend.core.candles import CandleAggregator
from backend.core.signals import SignalFusionEngine
from backend.core.risk import RiskEngine
from backend.core.schemas import MarketFeedMessage
from ml_pipeline.inference import MicrostructureMLInference
from ml_pipeline.feature_schema import build_feature_vector

class LiquidityPulseCoreEngine:
    """
    Main Quantitative Orchestration Engine processing L2 depth updates & trades in real time.
    """
    def __init__(self, symbol: str = "BTCUSDT"):
        self.symbol = symbol
        self.orderbook = OrderBook()
        self.metrics_calc = QuantMetricsCalculator()
        self.detectors = AnomalyDetectorEngine()
        self.candles = CandleAggregator()
        self.ml_inference = MicrostructureMLInference()
        self.signal_fusion = SignalFusionEngine()
        self.risk_engine = RiskEngine()

    def process_depth_snapshot(self, bids: List[List[float]], asks: List[List[float]], update_id: int = 0, timestamp: Optional[int] = None) -> Dict[str, Any]:
        ts = timestamp if timestamp else int(time.time() * 1000)
        self.orderbook.apply_snapshot(bids, asks, update_id, ts)
        return self._generate_feed_message(ts)

    def process_depth_delta(self, bid_deltas: List[List[float]], ask_deltas: List[List[float]], update_id: int = 0, timestamp: Optional[int] = None) -> Dict[str, Any]:
        ts = timestamp if timestamp else int(time.time() * 1000)
        self.orderbook.apply_delta(bid_deltas, ask_deltas, update_id, ts)
        return self._generate_feed_message(ts)

    def process_trade(self, price: float, quantity: float, is_buyer_maker: bool, timestamp: Optional[int] = None) -> Dict[str, Any]:
        ts = timestamp if timestamp else int(time.time() * 1000)
        self.metrics_calc.record_trade(ts, price, quantity, is_buyer_maker)
        self.detectors.record_trade_execution(price, quantity)
        updated_candles = self.candles.process_trade(ts, price, quantity, is_buyer_maker)
        
        feed = self._generate_feed_message(ts)
        feed["candle"] = updated_candles.get("1m")
        return feed

    def _generate_feed_message(self, timestamp: int) -> Dict[str, Any]:
        # 1. Compute microstructure metrics
        metrics = self.metrics_calc.process_tick(self.orderbook, timestamp)

        # 2. Detect anomalies
        events = self.detectors.detect_anomalies(self.orderbook, metrics, timestamp)

        # 3. Build book data dictionary
        book_data = {
            "bids": [[round(b[0], 2), round(b[1], 4)] for b in self.orderbook.bids[:10]],
            "asks": [[round(a[0], 2), round(a[1], 4)] for a in self.orderbook.asks[:10]],
            "spread": round(self.orderbook.spread, 2),
            "spread_bps": round(self.orderbook.spread_bps, 3)
        }

        # 4. Feature vector & ML Prediction
        feat_vec = build_feature_vector(metrics, book_data, events)
        prediction = self.ml_inference.predict(feat_vec)

        # 5. Signal Fusion & Risk Engine
        signal = self.signal_fusion.fuse_signal(prediction, metrics, events)
        risk = self.risk_engine.evaluate_risk(book_data, metrics, prediction, signal)

        # 6. Assemble output message according to contract
        msg = {
            "timestamp": timestamp,
            "symbol": self.symbol,
            "price": self.orderbook.mid_price,
            "orderbook": book_data,
            "metrics": {
                "obi": round(metrics["obi"], 4),
                "obi_rolling_mean_15s": round(metrics["obi_mean_15s"], 4),
                "stoikov_micro_price": round(metrics["stoikov_micro_price"], 2),
                "micro_mid_divergence": round(metrics["micro_mid_divergence"], 4),
                "cvd_1m": round(metrics["cvd_1m"], 2),
                "cvd_5m": round(metrics["cvd_5m"], 2),
                "trade_intensity": round(metrics["trade_intensity"], 2),
                "realized_volatility": round(metrics["realized_volatility"], 6)
            },
            "prediction": prediction,
            "signal": signal,
            "risk": risk,
            "events": events
        }
        return msg
