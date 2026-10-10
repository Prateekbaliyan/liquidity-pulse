from sqlalchemy import Column, String, Integer, Float, JSON, BigInteger, Text
from backend.storage.database import Base

class AnomalyEventModel(Base):
    __tablename__ = "anomaly_events"

    id = Column(String, primary_key=True)
    timestamp = Column(BigInteger, index=True)
    type = Column(String, index=True)
    side = Column(String)
    price = Column(Float)
    severity = Column(String)
    details = Column(Text)

class BacktestRunModel(Base):
    __tablename__ = "backtest_runs"

    id = Column(String, primary_key=True)
    timestamp = Column(BigInteger, index=True)
    symbol = Column(String)
    initial_capital = Column(Float)
    total_return_pct = Column(Float)
    win_rate_pct = Column(Float)
    sharpe_ratio = Column(Float)
    max_drawdown_pct = Column(Float)
    metrics_json = Column(JSON)
