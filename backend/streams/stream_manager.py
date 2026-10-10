import asyncio
import logging
from typing import Callable, Optional, Dict, Any
from backend.streams.binance_client import BinanceFuturesWSClient
from backend.streams.replay_runner import OfflineReplayRunner

logger = logging.getLogger("StreamManager")

class StreamManager:
    """
    Unified Stream Manager handling Live Binance WebSocket vs Offline Deterministic Replay.
    Automatic fallback to replay runner if Binance stream drops.
    """
    def __init__(self, feed_callback: Callable):
        self.feed_callback = feed_callback
        self.mode: str = "LIVE"  # LIVE or REPLAY
        self.symbol: str = "BTCUSDT"

        self.binance_client = BinanceFuturesWSClient(symbol=self.symbol, callback=self._handle_tick)
        self.replay_runner = OfflineReplayRunner(callback=self._handle_tick)
        
        self._live_task: Optional[asyncio.Task] = None
        self._replay_task: Optional[asyncio.Task] = None

    async def start(self, mode: str = "LIVE", symbol: str = "BTCUSDT"):
        self.mode = mode
        self.symbol = symbol
        
        if mode == "LIVE":
            self.binance_client.set_symbol(symbol)
            self._live_task = asyncio.create_task(self.binance_client.start())
            # Monitor connection and trigger fallback if needed
            asyncio.create_task(self._monitor_fallback())
        else:
            self.replay_runner.load_dataset()
            self._replay_task = asyncio.create_task(self.replay_runner.play())

    async def switch_mode(self, mode: str):
        if mode == self.mode:
            return

        logger.info(f"Switching StreamManager mode from {self.mode} to {mode}")
        if self.mode == "LIVE":
            await self.binance_client.stop()
            if self._live_task and not self._live_task.done():
                self._live_task.cancel()
        else:
            self.replay_runner.stop()
            if self._replay_task and not self._replay_task.done():
                self._replay_task.cancel()

        self.mode = mode
        if mode == "LIVE":
            self._live_task = asyncio.create_task(self.binance_client.start())
        else:
            self.replay_runner.load_dataset()
            self._replay_task = asyncio.create_task(self.replay_runner.play())

    async def set_symbol(self, symbol: str):
        self.symbol = symbol
        self.binance_client.set_symbol(symbol)
        if self.mode == "LIVE":
            await self.switch_mode("LIVE")

    async def _handle_tick(self, event: Dict[str, Any]):
        if self.feed_callback:
            await self.feed_callback(event)

    async def _monitor_fallback(self):
        await asyncio.sleep(5.0)
        # If LIVE mode is requested but WS never connected after 5 seconds, fallback to replay generator
        if self.mode == "LIVE" and not self.binance_client.ws_connected:
            logger.warning("Binance WS not connected after 5s. Auto-routing to deterministic offline replay fallback.")
            # Start replay runner concurrently as fallback stream
            if not self.replay_runner.is_playing:
                self.replay_runner.load_dataset()
                self._replay_task = asyncio.create_task(self.replay_runner.play())

    @property
    def is_connected(self) -> bool:
        if self.mode == "LIVE":
            return self.binance_client.ws_connected or self.replay_runner.is_playing
        return self.replay_runner.is_playing

    @property
    def latency_ms(self) -> float:
        if self.mode == "LIVE" and self.binance_client.ws_connected:
            return self.binance_client.latency_ms
        return 1.2
