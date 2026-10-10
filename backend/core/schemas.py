from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class OrderBookSnapshot(BaseModel):
    bids: List[List[float]] = Field(..., description="Top bids [[price, size], ...]")
    asks: List[List[float]] = Field(..., description="Top asks [[price, size], ...]")
    spread: float = Field(..., description="Absolute spread P_ask - P_bid")
    spread_bps: float = Field(..., description="Spread in basis points")

class MetricsSnapshot(BaseModel):
    obi: float = Field(..., description="Order Book Imbalance [-1, 1]")
    obi_rolling_mean_15s: float = Field(0.0)
    stoikov_micro_price: float = Field(..., description="Stoikov Micro-price")
    micro_mid_divergence: float = Field(..., description="Micro-price minus mid-price")
    cvd_1m: float = Field(0.0, description="Cumulative Volume Delta 1m")
    cvd_5m: float = Field(0.0, description="Cumulative Volume Delta 5m")
    trade_intensity: float = Field(0.0, description="Trades per second")
    realized_volatility: float = Field(0.0, description="Rolling realized volatility")
    kyle_lambda: float = Field(0.0, description="Kyle's Lambda price impact")
    amihud_illiquidity: float = Field(0.0, description="Amihud illiquidity metric")
    bid_slope: float = Field(0.0, description="Bid order book elasticity slope")
    ask_slope: float = Field(0.0, description="Ask order book elasticity slope")

class PredictionData(BaseModel):
    direction: str = Field(..., description="UP, NEUTRAL, or DOWN")
    probabilities: Dict[str, float] = Field(..., description="Probability dict for UP, NEUTRAL, DOWN")
    confidence: float = Field(..., description="Percentage confidence 0-100")
    latency_ms: float = Field(..., description="Inference latency in milliseconds")
    feature_attributions: Optional[Dict[str, float]] = Field(default=None)

class SignalData(BaseModel):
    direction: str = Field(..., description="LONG, SHORT, or NEUTRAL")
    strength: float = Field(..., description="Signal strength 0.0 to 1.0")
    reasons: List[str] = Field(default_factory=list, description="Human readable rationale tags")

class RiskData(BaseModel):
    level: str = Field(..., description="LOW, MEDIUM, HIGH, EXTREME")
    slippage_est_bps: float = Field(..., description="Estimated slippage in bps")
    adjusted_confidence: float = Field(..., description="Risk discounted confidence")

class AnomalyEvent(BaseModel):
    id: str
    timestamp: int
    type: str  # LIQUIDITY_SWEEP, FAKEOUT, POTENTIAL_ICEBERG, POTENTIAL_SPOOF
    side: str  # BID, ASK, BOTH
    price: float
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    details: str

class CandleData(BaseModel):
    timestamp: int
    interval: str  # 1s, 5s, 15s, 1m, 5m
    open: float
    high: float
    low: float
    close: float
    volume: float
    buy_volume: float
    sell_volume: float
    poc_price: float
    vah: float
    val: float
    footprint: Dict[str, Dict[str, float]] = Field(default_factory=dict) # price_str -> {buy_vol, sell_vol}

class MarketFeedMessage(BaseModel):
    timestamp: int
    symbol: str
    price: float
    orderbook: OrderBookSnapshot
    metrics: MetricsSnapshot
    prediction: PredictionData
    signal: SignalData
    risk: RiskData
    events: List[AnomalyEvent] = Field(default_factory=list)
    candle: Optional[CandleData] = None

class SystemStatusResponse(BaseModel):
    status: str
    symbol: str
    mode: str  # LIVE, REPLAY
    latency_ms: float
    ws_connected: bool
    queue_depth: int
    uptime_seconds: float

class BacktestRequest(BaseModel):
    symbol: str = "BTCUSDT"
    initial_capital: float = 10000.0
    order_size: float = 0.1
    fee_rate: float = 0.0005  # 0.05%
    latency_ms: float = 25.0
    start_time: Optional[int] = None
    end_time: Optional[int] = None
    signal_threshold: float = 0.65

class BacktestMetrics(BaseModel):
    total_return_pct: float
    win_rate_pct: float
    profit_factor: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int

class BacktestTrade(BaseModel):
    timestamp: int
    type: str  # BUY, SELL
    price: float
    size: float
    fee: float
    slippage_bps: float
    pnl: float
    reason: str

class EquityPoint(BaseModel):
    timestamp: int
    equity: float

class BacktestResponse(BaseModel):
    summary: BacktestMetrics
    equity_curve: List[EquityPoint]
    trades: List[BacktestTrade]
