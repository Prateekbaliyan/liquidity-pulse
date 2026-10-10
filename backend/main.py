import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.storage.database import init_db
from backend.storage.repository import repository
from backend.core.engine import LiquidityPulseCoreEngine
from backend.streams.stream_manager import StreamManager
from backend.api.routes import router as api_router, app_state
from backend.api.websocket import router as ws_router, manager as ws_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("LiquidityPulseMain")

core_engine = LiquidityPulseCoreEngine(symbol=settings.DEFAULT_SYMBOL)

async def handle_stream_tick(event: dict):
    """
    Realtime callback invoked on each depth update or aggTrade tick from StreamManager.
    """
    ts = event.get("timestamp")
    evt_type = event.get("type")

    if evt_type == "depth":
        bids = event.get("bids", [])
        asks = event.get("asks", [])
        feed_msg = core_engine.process_depth_snapshot(bids, asks, timestamp=ts)
    else:
        p = event.get("price", 0.0)
        q = event.get("quantity", 0.0)
        m = event.get("is_buyer_maker", False)
        feed_msg = core_engine.process_trade(p, q, m, timestamp=ts)

    # Persist any newly detected anomaly events
    for evt in feed_msg.get("events", []):
        await repository.save_event(evt)

    # Broadcast to all connected WebSocket clients on /ws/feed
    await ws_manager.broadcast(feed_msg)

stream_manager = StreamManager(feed_callback=handle_stream_tick)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing LiquidityPulse Quantitative Backend...")
    await init_db()
    
    app_state["core_engine"] = core_engine
    app_state["stream_manager"] = stream_manager
    
    # Start live stream background task
    asyncio.create_task(stream_manager.start(mode="LIVE", symbol=settings.DEFAULT_SYMBOL))
    
    yield
    
    logger.info("Shutting down LiquidityPulse Backend...")

app = FastAPI(
    title=settings.APP_NAME,
    description="Real-Time Market Microstructure & Quantitative Anomaly Intelligence Platform Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(ws_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
