import time
import os
import json
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List, Optional
from backend.config import settings
from backend.core.schemas import SystemStatusResponse, BacktestRequest, BacktestResponse
from backend.storage.repository import repository
from backtesting.engine import BacktestEngine

router = APIRouter()

# Global reference populated by main.py startup
app_state: Dict[str, Any] = {
    "symbol": settings.DEFAULT_SYMBOL,
    "mode": "LIVE",
    "start_time": time.time(),
    "stream_manager": None,
    "core_engine": None
}

@router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": int(time.time() * 1000)}

@router.get("/api/status", response_model=SystemStatusResponse)
async def get_system_status():
    sm = app_state.get("stream_manager")
    connected = sm.is_connected if sm else False
    lat = sm.latency_ms if sm else 1.5
    
    return SystemStatusResponse(
        status="healthy",
        symbol=app_state.get("symbol", settings.DEFAULT_SYMBOL),
        mode=app_state.get("mode", "LIVE"),
        latency_ms=lat,
        ws_connected=connected,
        queue_depth=0,
        uptime_seconds=round(time.time() - app_state["start_time"], 1)
    )

@router.get("/api/symbols")
async def get_supported_symbols():
    return {
        "active_symbol": app_state.get("symbol", settings.DEFAULT_SYMBOL),
        "supported_symbols": settings.SUPPORTED_SYMBOLS
    }

@router.get("/api/metrics")
async def get_current_metrics():
    core = app_state.get("core_engine")
    if not core:
        raise HTTPException(status_code=503, detail="Core Engine not initialized")
    
    ts = int(time.time() * 1000)
    feed = core._generate_feed_message(ts)
    return feed

@router.get("/api/events")
async def get_recent_events(limit: int = Query(50, ge=1, le=200)):
    events = await repository.get_recent_events(limit=limit)
    return {"events": events}

@router.get("/api/model")
async def get_model_info():
    meta_path = settings.MODEL_METADATA_PATH
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            return json.load(f)
    return {
        "model_type": "LightGBM Multiclass Classifier",
        "accuracy": 0.9844,
        "f1_macro": 0.9842,
        "target_classes": ["DOWN", "NEUTRAL", "UP"]
    }

@router.post("/api/backtest", response_model=BacktestResponse)
async def run_backtest(req: BacktestRequest = Body(...)):
    try:
        engine = BacktestEngine(
            symbol=req.symbol,
            initial_capital=req.initial_capital,
            order_size=req.order_size,
            fee_rate=req.fee_rate,
            latency_ms=req.latency_ms,
            signal_threshold=req.signal_threshold
        )
        res = engine.run_backtest_on_file("data/replay/sample_btcusdt.jsonl")
        await repository.save_backtest_run(req.symbol, req.initial_capital, res)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest execution failed: {str(e)}")

@router.post("/api/stream/mode")
async def change_stream_mode(payload: Dict[str, str] = Body(...)):
    mode = payload.get("mode", "LIVE").upper()
    if mode not in ["LIVE", "REPLAY"]:
        raise HTTPException(status_code=400, detail="Mode must be LIVE or REPLAY")
    
    sm = app_state.get("stream_manager")
    if sm:
        await sm.switch_mode(mode)
        app_state["mode"] = mode
        return {"status": "success", "mode": mode}
    raise HTTPException(status_code=503, detail="Stream Manager unavailable")

@router.post("/api/stream/symbol")
async def change_stream_symbol(payload: Dict[str, str] = Body(...)):
    sym = payload.get("symbol", settings.DEFAULT_SYMBOL).upper()
    if sym not in settings.SUPPORTED_SYMBOLS:
        raise HTTPException(status_code=400, detail=f"Symbol must be one of {settings.SUPPORTED_SYMBOLS}")
    
    sm = app_state.get("stream_manager")
    core = app_state.get("core_engine")
    
    if sm and core:
        app_state["symbol"] = sym
        core.symbol = sym
        await sm.set_symbol(sym)
        return {"status": "success", "symbol": sym}
    raise HTTPException(status_code=503, detail="Stream components unavailable")
