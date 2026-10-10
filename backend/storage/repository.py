import time
import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from backend.storage.database import AsyncSessionLocal
from backend.storage.models import AnomalyEventModel, BacktestRunModel

logger = logging.getLogger("Repository")

class StorageRepository:
    def __init__(self):
        # In-memory storage cache so query responses return instantaneously even without DB
        self.in_memory_events: List[Dict[str, Any]] = []
        self.in_memory_backtests: List[Dict[str, Any]] = []

    async def save_event(self, event_data: Dict[str, Any]):
        self.in_memory_events.append(event_data)
        if len(self.in_memory_events) > 1000:
            self.in_memory_events.pop(0)

        try:
            async with AsyncSessionLocal() as session:
                evt = AnomalyEventModel(
                    id=event_data.get("id", f"evt_{uuid.uuid4().hex[:8]}"),
                    timestamp=event_data.get("timestamp", int(time.time()*1000)),
                    type=event_data.get("type", "UNKNOWN"),
                    side=event_data.get("side", "BOTH"),
                    price=event_data.get("price", 0.0),
                    severity=event_data.get("severity", "LOW"),
                    details=event_data.get("details", "")
                )
                session.add(evt)
                await session.commit()
        except Exception as e:
            logger.debug(f"DB save event skipped: {e}")

    async def get_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        if self.in_memory_events:
            return list(reversed(self.in_memory_events[-limit:]))
        
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(AnomalyEventModel).order_by(AnomalyEventModel.timestamp.desc()).limit(limit)
                res = await session.execute(stmt)
                rows = res.scalars().all()
                return [{
                    "id": r.id,
                    "timestamp": r.timestamp,
                    "type": r.type,
                    "side": r.side,
                    "price": r.price,
                    "severity": r.severity,
                    "details": r.details
                } for r in rows]
        except Exception:
            return []

    async def save_backtest_run(self, symbol: str, initial_capital: float, result: Dict[str, Any]):
        summary = result.get("summary", {})
        run_data = {
            "id": f"bt_{uuid.uuid4().hex[:8]}",
            "timestamp": int(time.time() * 1000),
            "symbol": symbol,
            "initial_capital": initial_capital,
            "summary": summary
        }
        self.in_memory_backtests.append(run_data)

repository = StorageRepository()
