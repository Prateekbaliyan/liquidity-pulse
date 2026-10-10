import asyncio
import json
import time
import logging
import websockets
from typing import Callable, Optional

logger = logging.getLogger("BinanceWSClient")

class BinanceFuturesWSClient:
    """
    Async Binance Futures WebSocket client streaming depth20@100ms and aggTrade.
    Includes exponential backoff reconnect and ping latency tracking.
    """
    def __init__(self, symbol: str = "BTCUSDT", callback: Optional[Callable] = None):
        self.symbol = symbol.lower()
        self.callback = callback
        self.running = False
        self.latency_ms = 0.0
        self.ws_connected = False
        self.last_msg_timestamp = 0
        
    def set_symbol(self, symbol: str):
        self.symbol = symbol.lower()

    async def start(self):
        self.running = True
        backoff = 1.0
        
        while self.running:
            url = f"wss://fstream.binance.com/ws/{self.symbol}@depth20@100ms/{self.symbol}@aggTrade"
            try:
                logger.info(f"Connecting to Binance Futures WS: {url}")
                async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
                    self.ws_connected = True
                    backoff = 1.0
                    logger.info(f"Connected to Binance Futures stream for {self.symbol.upper()}")
                    
                    while self.running:
                        start_recv = time.perf_counter()
                        msg = await ws.recv()
                        rec_lat = (time.perf_counter() - start_recv) * 1000.0
                        self.latency_ms = round(rec_lat, 2)
                        self.last_msg_timestamp = int(time.time() * 1000)

                        data = json.loads(msg)
                        stream_type = data.get("e", "")
                        
                        if stream_type == "depthUpdate":
                            bids = [[float(b[0]), float(b[1])] for b in data.get("b", [])]
                            asks = [[float(a[0]), float(a[1])] for a in data.get("a", [])]
                            if self.callback:
                                await self.callback({
                                    "type": "depth",
                                    "timestamp": data.get("E", self.last_msg_timestamp),
                                    "bids": bids,
                                    "asks": asks
                                })
                        elif stream_type == "aggTrade":
                            p = float(data.get("p", 0.0))
                            q = float(data.get("q", 0.0))
                            m = bool(data.get("m", False))  # True if buyer is maker (taker sell)
                            if self.callback:
                                await self.callback({
                                    "type": "trade",
                                    "timestamp": data.get("E", self.last_msg_timestamp),
                                    "price": p,
                                    "quantity": q,
                                    "is_buyer_maker": m
                                })
                        elif "bids" in data and "asks" in data:  # Raw depth snapshot
                            bids = [[float(b[0]), float(b[1])] for b in data.get("bids", [])]
                            asks = [[float(a[0]), float(a[1])] for a in data.get("asks", [])]
                            if self.callback:
                                await self.callback({
                                    "type": "depth",
                                    "timestamp": int(time.time() * 1000),
                                    "bids": bids,
                                    "asks": asks
                                })

            except Exception as e:
                self.ws_connected = False
                logger.warning(f"Binance WS connection error: {e}. Reconnecting in {backoff:.1f}s...")
                await asyncio.sleep(backoff)
                backoff = min(30.0, backoff * 2.0)

    async def stop(self):
        self.running = False
        self.ws_connected = False
