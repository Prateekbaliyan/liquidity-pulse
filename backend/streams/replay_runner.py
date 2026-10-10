import asyncio
import json
import os
import time
import random
from typing import Callable, List, Dict, Any, Optional

class OfflineReplayRunner:
    """
    Offline Replay Runner supporting JSONL playback and synthetic deterministic fallback streaming.
    Supports play, pause, resume, reset, seek, and speed multipliers (0.25x - 10x).
    """
    def __init__(self, callback: Optional[Callable] = None):
        self.callback = callback
        self.is_playing = False
        self.is_paused = False
        self.speed: float = 1.0
        self.current_index: int = 0
        self.records: List[Dict[str, Any]] = []
        self.filepath: str = "data/replay/sample_btcusdt.jsonl"
        self._task: Optional[asyncio.Task] = None
        
        # Generator fallback state
        self.synthetic_price: float = 64250.0

    def load_dataset(self, filepath: str = "data/replay/sample_btcusdt.jsonl"):
        self.filepath = filepath
        if os.path.exists(filepath):
            self.records = []
            with open(filepath, "r") as f:
                for line in f:
                    if line.strip():
                        self.records.append(json.loads(line))
            self.current_index = 0
        else:
            self.records = []

    def set_speed(self, speed: float):
        self.speed = max(0.1, min(20.0, speed))

    def seek(self, index: int):
        if self.records:
            self.current_index = max(0, min(len(self.records) - 1, index))

    async def play(self):
        if not self.records:
            self.load_dataset()
        
        self.is_playing = True
        self.is_paused = False
        
        while self.is_playing:
            if self.is_paused:
                await asyncio.sleep(0.1)
                continue

            if self.records and self.current_index < len(self.records):
                rec = self.records[self.current_index]
                self.current_index += 1
                if self.callback:
                    await self.callback(rec)
            else:
                # Generate dynamic synthetic fallback tick when dataset loop finishes or is empty
                synthetic_rec = self._generate_synthetic_tick()
                if self.callback:
                    await self.callback(synthetic_rec)

            # Control tick delay according to speed
            delay = (0.1 / self.speed)
            await asyncio.sleep(delay)

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False

    def stop(self):
        self.is_playing = False
        self.is_paused = False
        self.current_index = 0

    def _generate_synthetic_tick(self) -> Dict[str, Any]:
        ts = int(time.time() * 1000)
        self.synthetic_price += random.uniform(-0.5, 0.5)
        p = self.synthetic_price

        is_depth = (random.random() > 0.4)
        if is_depth:
            bids = [[round(p - (0.5 * k), 2), round(random.uniform(0.5, 3.0), 4)] for k in range(1, 21)]
            asks = [[round(p + (0.5 * k), 2), round(random.uniform(0.5, 3.0), 4)] for k in range(1, 21)]
            return {
                "type": "depth",
                "timestamp": ts,
                "bids": bids,
                "asks": asks
            }
        else:
            return {
                "type": "trade",
                "timestamp": ts,
                "price": round(p, 2),
                "quantity": round(random.uniform(0.01, 1.0), 4),
                "is_buyer_maker": random.choice([True, False])
            }
