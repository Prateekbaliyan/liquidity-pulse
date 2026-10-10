# LiquidityPulse — Real-Time Market Microstructure & Quantitative Anomaly Intelligence Platform

LiquidityPulse is a production-grade, ultra-low latency quantitative analytical platform for high-frequency order book microstructure processing, dynamic anomaly detection, ONNX ML inference, signal fusion, and event-driven backtesting.

---

## Key Features

1. **L2 Order Book Engine**: Bisect-sorted L2 book tracking top 20 bids/asks with snapshot/delta synchronization, Stoikov Micro-price calculation, depth sums, and rolling sliding window history.
2. **Quantitative Microstructure Metrics**:
   - Depth-Weighted Order Book Imbalance (OBI) with exponential distance decay weighting ($w_i = e^{-\lambda \cdot |P_i - P_{mid}|}$).
   - Micro-mid divergence ($P_{micro} - P_{mid}$).
   - Order book elasticity slopes (linear regression fit on cumulative volume vs price depth).
   - Kyle's Lambda price impact ($\frac{|\Delta P|}{\text{Volume}}$) & Amihud illiquidity.
   - Cumulative Volume Delta (CVD) 1m/5m, velocity, and trade intensity z-score.
   - Realized volatility and price velocity.
3. **Microstructure Anomaly Detectors**:
   - **Liquidity Sweeps**: 15m extrema breaches ($\ge 0.15\%$) with trade delta z-scores $> 2.0$ and fast price reversion.
   - **Fakeouts**: Upward/downward breakout attempts with adverse CVD divergence and rapid rejection.
   - **Potential Icebergs**: Executed trade volume $\ge 1.5\times$ visible depth with continuous order replenishment.
   - **Potential Spoof / Layering**: Large limit order cancellations in top 5 levels in $< 800\text{ms}$ with low fill ratio.
4. **Sub-5ms ONNX ML Pipeline**:
   - 23-dimension Float32 microstructure feature vector.
   - LightGBM multiclass classifier trained with chronological walk-forward splitting.
   - Exported to `model.onnx` with ONNX Runtime CPU inference and top feature attribution extraction.
5. **Signal Fusion & Analytical Risk Engine**:
   - Combines ML probabilities, OBI, CVD velocity, micro divergence, and anomaly scores into `LONG`, `SHORT`, or `NEUTRAL` signals with human-readable rationale tags.
   - Risk tier classification (`LOW`, `MEDIUM`, `HIGH`, `EXTREME`), slippage estimation (bps), and risk-discounted confidence.
6. **Event-Driven Backtester**:
   - Full historical simulation using micro-aware taker fill modeling:

$$\text{Effective Fill} = P_{mid} \pm \left(\frac{\text{Spread}}{2} + \text{Slippage}(\text{Size}, \text{Depth})\right) + \text{Latency Penalty}$$

7. **Dark Bloom Quantitative Terminal**:
   - Client-side safe TradingView lightweight charts with POC horizontal lines.
   - Real-time DOM L2 Depth Ladder with volume bars and wall highlights.
   - Metrics HUD, Anomaly Event Feed, Deterministic Replay controls, Strategy Backtest runner, ONNX Model Monitor, and Structured Quantitative AI Analyst panel.

---

## Directory Structure

```text
liquidityPulse/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── api/
│   │   ├── routes.py
│   │   └── websocket.py
│   ├── core/
│   │   ├── engine.py
│   │   ├── orderbook.py
│   │   ├── metrics.py
│   │   ├── detectors.py
│   │   ├── signals.py
│   │   ├── risk.py
│   │   ├── candles.py
│   │   └── schemas.py
│   ├── streams/
│   │   ├── binance_client.py
│   │   ├── replay_runner.py
│   │   └── stream_manager.py
│   ├── storage/
│   │   ├── database.py
│   │   ├── models.py
│   │   └── repository.py
│   └── tests/
│       ├── test_orderbook.py
│       ├── test_metrics.py
│       ├── test_detectors.py
│       ├── test_signals.py
│       └── test_replay.py
├── ml_pipeline/
│   ├── train_export.py
│   ├── inference.py
│   ├── evaluate.py
│   ├── feature_schema.py
│   └── artifacts/
│       ├── model.onnx
│       ├── feature_schema.json
│       └── model_metadata.json
├── backtesting/
│   ├── engine.py
│   ├── simulator.py
│   └── metrics.py
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── src/
│       ├── app/
│       │   ├── page.tsx
│       │   ├── layout.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── Chart.tsx
│       │   ├── DOMLadder.tsx
│       │   ├── MetricsHUD.tsx
│       │   ├── EventFeed.tsx
│       │   ├── SignalPanel.tsx
│       │   ├── RiskPanel.tsx
│       │   ├── ReplayControls.tsx
│       │   ├── BacktestPanel.tsx
│       │   ├── ModelMonitor.tsx
│       │   └── AIAnalystPanel.tsx
│       └── hooks/
│           └── useMarketStream.ts
├── data/
│   └── replay/
│       └── sample_btcusdt.jsonl
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start Instructions

### 1. Backend & ML Setup

```bash
# Create and activate Python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install Python requirements
pip install -r backend/requirements.txt

# Generate sample replay dataset & train ONNX ML model
python data/generate_sample_replay.py
python ml_pipeline/train_export.py

# Run backend test suite
pytest backend/tests

# Start FastAPI backend server
python backend/main.py
```

The backend server runs on `http://localhost:8000`. API docs available at `http://localhost:8000/docs`. WebSocket stream is live at `ws://localhost:8000/ws/feed`.

### 2. Frontend Terminal Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` to access the Quantitative Terminal UI.

### 3. Docker Compose Deployment

```bash
docker-compose up --build
```

---

## Epistemological Disclaimer

LiquidityPulse is strictly an analytical research platform. Outlier orderbook behavior and rapid order updates are classified using probabilistic terminology (*anomalous order flow*, *potential spoofing-like activity*, *potential iceberg activity*, *liquidity sweep*, *fakeout*). The system never makes deterministic claims of market manipulation or trader intent.
