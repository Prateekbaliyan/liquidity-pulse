import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "LiquidityPulse"
    ENV: str = os.getenv("ENV", "development")
    DEFAULT_SYMBOL: str = os.getenv("DEFAULT_SYMBOL", "BTCUSDT")
    SUPPORTED_SYMBOLS: list[str] = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"]
    
    # Binance WS
    BINANCE_WS_BASE_URL: str = os.getenv("BINANCE_WS_BASE_URL", "wss://fstream.binance.com/ws")
    
    # Storage
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/liquidity_pulse")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # ML
    MODEL_PATH: str = os.getenv("MODEL_PATH", "ml_pipeline/artifacts/model.onnx")
    FEATURE_SCHEMA_PATH: str = os.getenv("FEATURE_SCHEMA_PATH", "ml_pipeline/artifacts/feature_schema.json")
    MODEL_METADATA_PATH: str = os.getenv("MODEL_METADATA_PATH", "ml_pipeline/artifacts/model_metadata.json")
    
    # Anomaly Thresholds
    SWEEP_PRICE_THRESHOLD_PCT: float = 0.15  # >= 0.15%
    SWEEP_DELTA_ZSCORE_MIN: float = 2.0
    SWEEP_REVERT_MAX_SEC: float = 15.0
    
    ICEBERG_MULTIPLE_MIN: float = 1.5
    
    SPOOF_MAX_FILL_PCT: float = 5.0
    SPOOF_MAX_CANCEL_MS: int = 800
    
    # Websocket / Broadcast
    BROADCAST_INTERVAL_MS: int = 100
    QUEUE_MAX_SIZE: int = 1000

settings = Settings()
