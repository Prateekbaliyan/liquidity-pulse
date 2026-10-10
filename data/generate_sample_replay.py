import os
import json
import random
import time

def generate_sample_replay_jsonl(filepath: str = "data/replay/sample_btcusdt.jsonl", num_records: int = 500):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    start_ts = int(time.time() * 1000) - (num_records * 100)
    base_price = 64250.0
    
    records = []
    current_p = base_price
    
    for i in range(num_records):
        ts = start_ts + (i * 100)
        # Random walk
        current_p += random.uniform(-0.8, 0.8)
        
        # Bids & Asks
        bids = [[round(current_p - (0.5 * k), 2), round(random.uniform(0.5, 4.0), 4)] for k in range(1, 21)]
        asks = [[round(current_p + (0.5 * k), 2), round(random.uniform(0.5, 4.0), 4)] for k in range(1, 21)]
        
        if i % 3 == 0:
            rec = {
                "type": "depth",
                "timestamp": ts,
                "bids": bids,
                "asks": asks
            }
        else:
            rec = {
                "type": "trade",
                "timestamp": ts,
                "price": round(current_p, 2),
                "quantity": round(random.uniform(0.01, 1.5), 4),
                "is_buyer_maker": random.choice([True, False])
            }
        records.append(rec)

    with open(filepath, "w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")

    print(f"Generated sample replay dataset at {filepath} ({num_records} lines)")

if __name__ == "__main__":
    generate_sample_replay_jsonl()
