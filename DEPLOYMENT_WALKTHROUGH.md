# 🚀 LiquidityPulse — Complete Deployment Walkthrough Guide

This walkthrough provides step-by-step instructions to deploy LiquidityPulse across different environments (Local Machine, Docker Compose, Free Cloud Hosting, and Ubuntu Cloud VPS).

---

## 📋 Architecture Overview

* **Backend Service**: FastAPI WebSocket & REST API server (Port `8000`).
* **Frontend Service**: Next.js 14 App Router Terminal UI (Port `3000`).
* **Data Stream**: Connects to Binance Futures public stream (`wss://fstream.binance.com`).

---

## 🛠️ Option 1: Local Machine Deployment (Fastest)

### Step 1: Clone Repository
```bash
git clone https://github.com/Prateekbaliyan/liquidity-pulse.git
cd liquidity-pulse
```

### Step 2: Setup & Start Backend (Terminal 1)
```bash
# Create and activate virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
pip install onnxmltools greenlet aiosqlite

# Generate initial replay dataset & train ONNX ML model
python data/generate_sample_replay.py
python ml_pipeline/train_export.py

# Start Backend Server
python backend/main.py
```
* **Backend Live at**: `http://localhost:8000`
* **Swagger API Docs**: `http://localhost:8000/docs`
* **WebSocket Stream**: `ws://localhost:8000/ws/feed`

### Step 3: Setup & Start Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
* **Frontend Terminal UI Live at**: `http://localhost:3000`

---

## 🐳 Option 2: 1-Click Docker Compose Deployment

Both services and containers can be launched with Docker Compose:

```bash
docker-compose up --build -d
```

* **Frontend**: Open `http://localhost:3000`
* **Backend**: Open `http://localhost:8000/docs`
* **Stop Services**: `docker-compose down`

---

## ☁️ Option 3: Free Cloud Deployment (Vercel + Render / Railway)

### Part A: Deploy Backend (FastAPI on Render / Railway)
1. Push code to your GitHub repo: `https://github.com/Prateekbaliyan/liquidity-pulse`.
2. Go to [Render.com](https://render.com) or [Railway.app](https://railway.app).
3. Create a **New Web Service** connected to your repo.
4. Configure:
   * **Root Directory**: `.`
   * **Build Command**: `pip install -r backend/requirements.txt && pip install onnxmltools greenlet aiosqlite && python data/generate_sample_replay.py && python ml_pipeline/train_export.py`
   * **Start Command**: `python backend/main.py`
   * **Port**: `8000`
5. Copy your live backend URL (e.g. `https://liquidity-pulse-backend.onrender.com`).

### Part B: Deploy Frontend (Next.js on Vercel)
1. Go to [Vercel.com](https://vercel.com) and click **Add New Project**.
2. Select repository: `liquidity-pulse`.
3. Set **Root Directory** to `frontend`.
4. Add Environment Variable:
   * `NEXT_PUBLIC_BACKEND_URL`: `https://liquidity-pulse-backend.onrender.com`
5. Click **Deploy**. Vercel will build and assign an SSL domain (e.g. `https://liquidity-pulse.vercel.app`).

---

## 🖥️ Option 4: Production Linux VPS Deployment (Ubuntu 22.04 / AWS EC2)

### 1. Server Prerequisites
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv git nodejs npm nginx
sudo npm install -g pm2
```

### 2. Clone & Setup Project
```bash
git clone https://github.com/Prateekbaliyan/liquidity-pulse.git /var/www/liquidity-pulse
cd /var/www/liquidity-pulse

# Setup Python Backend
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
pip install onnxmltools greenlet aiosqlite
python data/generate_sample_replay.py
python ml_pipeline/train_export.py

# Setup Frontend
cd frontend
npm install
npm run build
```

### 3. Process Management via PM2
```bash
# Start Backend
pm2 start "python3 /var/www/liquidity-pulse/backend/main.py" --name "lp-backend"

# Start Frontend
cd /var/www/liquidity-pulse/frontend
pm2 start "npm start" --name "lp-frontend"

# Save PM2 state across reboots
pm2 save
pm2 startup
```

### 4. Nginx Reverse Proxy Configuration
Create `/etc/nginx/sites-available/liquidity-pulse`:
```nginx
server {
    server_name yourdomain.com;

    # Frontend Reverse Proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API & WebSocket Reverse Proxy
    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
    }
}
```

Enable site and install SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/liquidity-pulse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔍 Verification & Health Check

* Backend Health: `curl http://localhost:8000/health` $\rightarrow$ `{"status":"ok"}`
* Stream Status: `curl http://localhost:8000/api/status` $\rightarrow$ `{"status":"healthy","ws_connected":true}`
* Frontend UI: Open `http://localhost:3000` and check top header badge says **LIVE CONNECTED (1ms)**.
