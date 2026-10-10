# 📘 LiquidityPulse — Master Project Guide & Technical Report

---

## 📑 Table of Contents (Is Report Mein Sab Kuch Cover Hai)
1. **[Q1. Yeh Asal Mein Kis Chiz Ka Stock Hai? Dollar ($83,000+) Ka Kya Matlab Hai?](#1-yeh-kis-chiz-ka-stock-hai-dollar-values-ka-kya-matlab-hai)**
2. **[Q2. Normal Companies (Tata, Reliance, Apple) Ke Stocks Kyun Nahi Use Kiye?](#2-normal-companies-ke-stocks-kyun-nahi-use-kiye)**
3. **[Q3. Mujhe Kaise Pata Chalega Khareedna (BUY) Hai Ya Bechna (SELL)?](#3-mujhe-kaise-pata-chalega-khareedna-hai-ya-bechna)**
4. **[Q4. System Parde Ke Peeche Kaise Check Kar Raha Hai? (Internal Math & ML Logic)](#4-system-parde-ke-peeche-kaise-check-kar-raha-hai)**
5. **[Q5. Screen Ke Neeche Wale 4 Main Tabs/Functions Kya Hain? (Complete Deep-Dive)](#5-screen-ke-neeche-wale-4-main-functions-deep-dive)**
   - *Tab 1: Anomaly Event Feed (100)*
   - *Tab 2: Strategy Backtester*
   - *Tab 3: ONNX Model Monitor*
   - *Tab 4: Quant AI Analyst*
6. **[Q6. Poora Workflow Kaise Kaam Karta Hai? (Aasan Step-by-Step Flow)](#6-poora-workflow-kaise-kaam-karta-hai)**
7. **[Q7. UI White & Blue Light Theme Kyun Kiya Gaya Aur Kaise Banaya?](#7-ui-styling--white--blue-light-theme)**
8. **[Q8. Complete Technology Stack Matrix (Kaunsi File Kya Karti Hai)](#8-complete-technology-stack-matrix)**
9. **[Q9. System Ko Run Kaise Karna Hai? (Commands & Ports)](#9-system-ko-run-kaise-karna-hai)**

---

## 1. Yeh Kis Chiz Ka Stock Hai? Dollar Values Ka Kya Matlab Hai?

* **Yeh Normal Company Ka Stock (Tata, Reliance, Infosys, Apple) Nahi Hai.**
* Yeh **Cryptocurrency Perpetual Futures Contracts** ka live institutional trading data hai:
  * **BTCUSDT:** Bitcoin ki price USDT (Tether Dollar) mein. Screen pe jo **$83,112.25** dikh raha hai, woh **1 Bitcoin ki real-time international dollar price** hai.
  * **ETHUSDT:** Ethereum ki dollar price (~$2,500 - $3,500).
  * **SOLUSDT:** Solana ki dollar price (~$150 - $220).
  * **BNBUSDT:** Binance Coin ki dollar price.

---

## 2. Normal Companies Ke Stocks Kyun Nahi Use Kiye?

1. **Zero-Cost Public Data:** Indian stock exchanges (NSE/BSE via Zerodha, Upstox) ya US stock exchanges (Nasdaq, NYSE) tick-by-tick orderbook ka L2 depth stream free mein nahi dete. Unke liye paid broker API keys, demat accounts aur monthly exchange data fees lagti hai.
2. **24x7 Non-Stop Market:** Normal stock market din mein sirf 6 ghante (9:15 AM - 3:30 PM) chalta hai aur weekends par band rehta hai. Crypto futures market **24 ghante, 365 din bina ruke** chalta hai, jisse system ko kisi bhi samay test kiya ja sakta hai.
3. **Free 100ms Ultra-Fast WebSockets:** Binance Futures bina kisi API key ya payment ke public WebSocket endpoint (`wss://fstream.binance.com`) par **100 millisecond** ki speed se institutional-grade L2 Order Book depth aur actual trades ka data deta hai.

---

## 3. Mujhe Kaise Pata Chalega Khareedna Hai Ya Bechna?

Screen par trade lene ke liye aapko **4 Main Steps** dekhne hote hain:

### Step 1: `SIGNAL FUSION CARD` Dekhein (Right Side Middle)
* 🟢 **`LONG` (Green):** **Khareedna hai (BUY).** System ke AI aur buyers ke pressure ne Buy signal diya hai.
* 🔴 **`SHORT` (Red):** **Bechna hai (SELL).** Market mein heavy selling pressure hai.
* ⚪ **`NEUTRAL` (Grey):** **Kuch mat karo, wait karo.** Market sideways ya confuse hai.
* **Strength Meter:** Agar strength **65% ya usse zyada** ho, tabhi signal strong mana jata hai.

### Step 2: `ORDER BOOK IMBALANCE (OBI)` Aur `CVD` Se Confirm Karein
* **OBI (Order Book Imbalance):**
  * Agar **`+20%` se `+60%` (Green)** hai $\rightarrow$ Order book mein buyers bohot zyada hain (Khareedne ka support strong hai).
  * Agar **`-20%` se `-60%` (Red)** hai $\rightarrow$ Sellers order book par haavi hain (Girne ka khatra hai).
* **CVD (Cumulative Volume Delta):**
  * Agar **Positive (`+`)** hai $\rightarrow$ Log sach mein aggressive market orders maar kar khareed rahe hain.
  * Agar **Negative (`-`)** hai $\rightarrow$ Log panic selling kar rahe hain.

### Step 3: `RISK GAUGES` Check Karein
* **`LOW` ya `MEDIUM`:** Slippage kam hai aur market safe hai, trade le sakte hain.
* **`HIGH` ya `EXTREME`:** Market mein achanak jhatka lag sakta hai, aisi sthiti mein trade avoid karein.

### 💡 Quick Decision Rule Table:

| Market Situation | Screen Par Kya Dikhna Chahiye | Aapko Kya Karna Hai |
| :--- | :--- | :--- |
| **Strong Buy Setup** | Signal = `LONG`, Strength $> 65\%$, OBI = Positive Green, Risk = `LOW` | **Khareedo (BUY)** |
| **Strong Sell Setup** | Signal = `SHORT`, Strength $> 65\%$, OBI = Negative Red, Risk = `LOW` | **Becho (SELL)** |
| **No-Trade Zone** | Signal = `NEUTRAL`, OBI near $0\%$, ya Risk = `EXTREME` | **Wait Karo (Kuch Mat Karo)** |

---

## 4. System Parde Ke Peeche Kaise Check Kar Raha Hai?

Har 100 millisecond (1 second mein 10 baar) system yeh 7-step mathematical aur AI process chalata hai:

1. **Binance Se Data Aana:** Binance har 100ms mein top 20 buyers aur top 20 sellers ka packet fekta hai.
2. **Weighted OBI Calculation:** Current price ke paas wale orders ko zyada importance (exponential decay weight) di jaati hai taaki pata chale buyers haavi hain ya sellers:
   $$\text{OBI} = \frac{\sum V_{bid} - \sum V_{ask}}{\sum V_{bid} + \sum V_{ask}}$$
3. **Stoikov Micro-Price (Magnetic Pull):** Agar buyers bohot zyada hain, toh price upar khinchegi. Stoikov formula gravitational pull calculate karta hai:
   $$P_{micro} = P_{bid} \cdot \left(\frac{V_{ask}}{V_{bid} + V_{ask}}\right) + P_{ask} \cdot \left(\frac{V_{bid}}{V_{bid} + V_{ask}}\right)$$
4. **CVD (Asli Volume):** Taker Buy volume aur Taker Sell volume ka difference check hota hai ki log sach mein button daba kar khareed rahe hain ya sirf order laga ke cancel kar rahe hain.
5. **Anomaly Detectors (Fraud/Trap Pakadna):** Code 4 cheezein check karta hai:
   - *Spoofing:* Bada order 800ms ke andar cancel hua?
   - *Iceberg:* Visible depth se 1.5x zyada hidden volume execute hua?
   - *Liquidity Sweep:* Price stop-loss tod kar 15s mein reverse hui?
6. **23-Dim Feature Vector $\rightarrow$ ONNX AI Brain:** Yeh 23 mathematical numbers pre-trained LightGBM Machine Learning model ko diye jaate hain, jo **1.2 millisecond** mein UP/DOWN/NEUTRAL probability nikalta hai.
7. **Signal Fusion (Points Table Voting):**
   - ML Vote: 35% weight
   - OBI Weight: 25% weight
   - CVD Velocity: 20% weight
   - Micro-Price: 15% weight
   - Jab total score **$> 65\%$** hota hai, tab card par **`LONG`** ya **`SHORT`** signal aata hai.

---

## 5. Screen Ke Neeche Wale 4 Main Functions (Deep-Dive)

Screen ke bottom dock mein yeh 4 specialized tools diye gaye hain:

### 🔹 Tab 1: ANOMALY EVENT FEED (100) — Whale & Trap Radar
* **`(100)` Ka Matlab:** System memory buffer mein pichle **100 taaza suspicious events** ka live record rakhta hai.
* **Yeh Kaun-Kaun Si 4 Chalaakiyan Live Pakadta Hai?**
  1. **LIQUIDITY SWEEP:** Jab price stop-loss hunt karke 15 second mein wapas bounce kar jaati hai.
  2. **FAKEOUT:** Price upar jaati dikhti hai par parde ke peeche actual volume bech raha hota hai (retail buyers ko fasana).
  3. **POTENTIAL ICEBERG:** Kisi rate par sirf 1 Bitcoin dikh raha tha par wahan 10 Bitcoin bik gaye (hidden whale order).
  4. **POTENTIAL SPOOFING:** Bada 100 BTC order lagana aur 800ms ke andar cancel kar dena.
* **Fayda:** Fake breakouts aur stop-loss traps mein fasne se bachata hai.

### 🔹 Tab 2: STRATEGY BACKTESTER — Profit Simulator
* **Kyun Hai?** Bina real paisa lagaye yeh dekhne ke liye ki pichle hazaron trades par system ke rules par trading ki hoti toh kitna munafa banta.
* **`EXECUTE BACKTEST` Button Dabane Par Kya Hota Hai?**
  * Real trading fees deduct hoti hai (**0.05% Taker Fee**).
  * Real internet lag add hota hai (**25ms Latency Delay**).
  * Slippage penalty deduct hoti hai.
* **Output:**
  * **TOTAL RETURN (%):** Total munafa (e.g. `+14.5%`).
  * **WIN RATE (%):** Kitne % trades jeeti (e.g. `68.2%`).
  * **PROFIT FACTOR:** Total Profit $\div$ Total Loss ($> 1.5$ is excellent).
  * **EQUITY CURVE:** $10,000 capital ka live profit graph.

### 🔹 Tab 3: ONNX MODEL MONITOR — AI Brain Ka Live X-Ray
* **Kyun Hai?** AI model ko transparent banane ke liye taaki pata chale AI ne Buy ya Sell kyun bola.
* **Kya Dikhata Hai?**
  * **CPU Latency (1.2ms):** AI palk jhapakkne se 80 guna tezi se soch raha hai.
  * **Probabilities Bar:** UP (Green %), NEUTRAL (Grey %), DOWN (Red %).
  * **Top Feature Attributions:** AI ne kis number (CVD, OBI, Price return) ko dekh kar vote diya.

### 🔹 Tab 4: QUANT AI ANALYST — Personal Financial Assistant
* **Kyun Hai?** Agar screen par numbers dekh kar samajh na aaye, toh **`ANALYZE STATE`** button dabate hi yeh Senior Analyst ki tarah pure market ka summary text likhta hai:
  * **`[OBSERVED METRICS]`:** Market mein kitne % buyers/sellers hain.
  * **`[MODEL OUTPUT]`:** Machine learning model UP bol raha hai ya DOWN.
  * **`[PROBABILISTIC INTERPRETATION]`:** Plain simple summary ki market mein buying momentum hai ya selling pressure.

---

## 6. Poora Workflow Kaise Kaam Karta Hai?

```text
[ 1. Binance International Market ]
               │  (Har 100ms mein live data packet bhejta hai)
               ▼
[ 2. High-Speed Data Pipe (WebSocket) ]
               │  (Data ko bina lag ke backend tak laata hai)
               ▼
[ 3. Math Engine (OrderBook & Quant Calculator) ]
               │  (Check karta hai: Buyers kitne % hain? Koi fraud/spoofing toh nahi?)
               ▼
[ 4. AI Brain (ONNX Machine Learning Model) ]
               │  (1.2 millisecond mein sochta hai: UP jane ke chances kitne hain?)
               ▼
[ 5. Decision Maker (Signal Fusion Card) ]
               │  (Final Vote: Agar score 65% se zyada hai toh BUY ya SELL bolta hai)
               ▼
[ 6. Aapki Screen (White & Blue Terminal) ]
                  (Chart, Order Book aur Signal turant Green/Red ho jaate hain!)
```

---

## 7. UI Styling — White & Blue Light Theme

* User preference ke hisaab se dark/hacker look ko hata kar **Clean White & Blue Financial Daylight Design** kiya gaya:
  * **Background:** Crisp White (`#ffffff`) aur Light Slate (`#f8fafc`).
  * **Typography:** Clean, readable modern financial sans-serif fonts.
  * **TradingView Chart:** Bright light canvas with green/red candlesticks.
  * **DOM Ladder:** Soft green bids aur soft red asks with wall highlight badges.

---

## 8. Complete Technology Stack Matrix

| Layer | Technology | File / Directory | Purpose & Kaam |
| :--- | :--- | :--- | :--- |
| **Backend Server** | Python 3.14 + FastAPI + Uvicorn | `backend/main.py` | Asynchronous REST API aur WebSocket server. |
| **Order Book Logic** | Bisect In-Memory Sorted Structures | `backend/core/orderbook.py` | Top 20 depth levels ko bina lag ke maintain karta hai. |
| **Quant Math Engine**| NumPy + SciPy | `backend/core/metrics.py` | OBI, CVD, Stoikov Micro-price, Kyle's Lambda calculate karta hai. |
| **Machine Learning** | LightGBM + ONNX Runtime | `ml_pipeline/` | 23 Microstructure features par train hua sub-2ms CPU inference model. |
| **Backtesting Engine**| Event-Driven Simulator | `backtesting/` | Realistic slippage aur fee modeling ke sath simulation run karta hai. |
| **Streaming Client** | WebSockets (Async) | `backend/streams/` | Binance Futures live stream se auto-reconnect fallback stream. |
| **Frontend UI** | Next.js 14 + React 18 | `frontend/src/app/` | Single-page modern quantitative trading dashboard. |
| **Financial Charting**| Lightweight Charts (TradingView) | `frontend/src/components/Chart.tsx` | Client-side safe dynamic candlestick chart engine. |

---

## 9. System Ko Run Kaise Karna Hai?

```bash
# 1. Backend Server Run Karna (Terminal 1)
.\venv\Scripts\activate
python backend/main.py
# URL: http://localhost:8000 (Docs: http://localhost:8000/docs)

# 2. Frontend Terminal Run Karna (Terminal 2)
cd frontend
npm run dev
# URL: http://localhost:3000
```
