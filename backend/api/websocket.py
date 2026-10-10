import asyncio
import json
import logging
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("WebSocketFeed")

router = APIRouter()

class ConnectionManager:
    """
    Manages active WebSocket connections to /ws/feed.
    Uses drop-oldest backpressure buffer policy to guarantee non-blocking realtime broadcast.
    """
    def __init__(self, max_queue_size: int = 100):
        self.active_connections: Set[WebSocket] = set()
        self.queues: dict[WebSocket, asyncio.Queue] = {}
        self.max_queue_size = max_queue_size

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        self.queues[websocket] = asyncio.Queue(maxsize=self.max_queue_size)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        self.queues.pop(websocket, None)
        logger.info("WebSocket client disconnected.")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return

        payload_str = json.dumps(message)
        
        for ws in list(self.active_connections):
            q = self.queues.get(ws)
            if q is not None:
                # Drop oldest if queue is full (Backpressure management)
                if q.full():
                    try:
                        q.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                try:
                    q.put_nowait(payload_str)
                except asyncio.QueueFull:
                    pass

    async def send_worker(self, websocket: WebSocket):
        q = self.queues.get(websocket)
        if q is None:
            return
        
        try:
            while websocket in self.active_connections:
                payload_str = await q.get()
                await websocket.send_text(payload_str)
                q.task_done()
        except WebSocketDisconnect:
            self.disconnect(websocket)
        except Exception as e:
            logger.debug(f"WS send error: {e}")
            self.disconnect(websocket)

manager = ConnectionManager()

@router.websocket("/ws/feed")
async def websocket_feed_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    send_task = asyncio.create_task(manager.send_worker(websocket))
    
    try:
        while True:
            # Handle incoming control messages (e.g., symbol switch or pause requests)
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
                cmd = msg.get("command")
                if cmd == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "timestamp": msg.get("timestamp")}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    finally:
        send_task.cancel()
