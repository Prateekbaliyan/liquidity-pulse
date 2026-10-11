"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export interface OrderBookData {
  bids: [number, number][];
  asks: [number, number][];
  spread: number;
  spread_bps: number;
}

export interface MetricsData {
  obi: number;
  obi_rolling_mean_15s: number;
  stoikov_micro_price: number;
  micro_mid_divergence: number;
  cvd_1m: number;
  cvd_5m: number;
  trade_intensity: number;
  realized_volatility: number;
}

export interface PredictionData {
  direction: 'UP' | 'NEUTRAL' | 'DOWN';
  probabilities: { UP: number; NEUTRAL: number; DOWN: number };
  confidence: number;
  latency_ms: number;
  feature_attributions?: Record<string, number>;
}

export interface SignalData {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  strength: number;
  reasons: string[];
}

export interface RiskData {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  slippage_est_bps: number;
  adjusted_confidence: number;
}

export interface AnomalyEvent {
  id: string;
  timestamp: number;
  type: 'LIQUIDITY_SWEEP' | 'FAKEOUT' | 'POTENTIAL_ICEBERG' | 'POTENTIAL_SPOOF';
  side: 'BID' | 'ASK' | 'BOTH';
  price: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
}

export interface CandleData {
  timestamp: number;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buy_volume: number;
  sell_volume: number;
  poc_price: number;
  vah: number;
  val: number;
}

export interface MarketFeedMessage {
  timestamp: number;
  symbol: string;
  price: number;
  orderbook: OrderBookData;
  metrics: MetricsData;
  prediction: PredictionData;
  signal: SignalData;
  risk: RiskData;
  events: AnomalyEvent[];
  candle?: CandleData;
}

export const INDIAN_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2940.50, sector: 'Energy & Retail' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1685.40, sector: 'Banking & Finance' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: 4180.25, sector: 'IT Services' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 965.80, sector: 'Auto & EV' },
  { symbol: 'INFY', name: 'Infosys', price: 1875.60, sector: 'IT Services' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 1245.30, sector: 'Banking' },
  { symbol: 'SBIN', name: 'State Bank of India', price: 795.50, sector: 'PSU Bank' },
];

export const CRYPTO_SYMBOLS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin Futures', price: 83020.0 },
  { symbol: 'ETHUSDT', name: 'Ethereum Futures', price: 3480.0 },
  { symbol: 'SOLUSDT', name: 'Solana Futures', price: 152.0 },
  { symbol: 'BNBUSDT', name: 'BNB Futures', price: 590.0 },
];

export const isIndianStock = (sym: string): boolean => {
  return INDIAN_STOCKS.some((s) => s.symbol === sym);
};

const BASE_PRICES: Record<string, number> = {
  // Indian Heavyweight Equities
  RELIANCE: 2940.50,
  HDFCBANK: 1685.40,
  TCS: 4180.25,
  TATAMOTORS: 965.80,
  INFY: 1875.60,
  ICICIBANK: 1245.30,
  SBIN: 795.50,
  // Crypto Perpetual Futures
  BTCUSDT: 83020.0,
  ETHUSDT: 3480.0,
  BNBUSDT: 590.0,
  SOLUSDT: 152.0
};

export function useMarketStream(backendUrl: string = 'http://localhost:8000') {
  const [symbol, setSymbolState] = useState<string>('RELIANCE');
  const [mode, setModeState] = useState<'LIVE' | 'REPLAY'>('LIVE');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number>(3);
  const [feed, setFeed] = useState<MarketFeedMessage | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnomalyEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simTickerRef = useRef<NodeJS.Timeout | null>(null);

  // Simulation persistent state
  const simStateRef = useRef<{
    price: number;
    cvd: number;
    candle: CandleData;
    lastEventTime: number;
  }>({
    price: 2940.50,
    cvd: 4500.0,
    candle: {
      timestamp: Math.floor(Date.now() / 60000) * 60000,
      interval: '1m',
      open: 2938.0,
      high: 2942.5,
      low: 2936.0,
      close: 2940.50,
      volume: 14200,
      buy_volume: 8500,
      sell_volume: 5700,
      poc_price: 2940.50,
      vah: 2941.5,
      val: 2938.5
    },
    lastEventTime: Date.now()
  });

  // When symbol changes, reset base simulation state
  useEffect(() => {
    const base = BASE_PRICES[symbol] || 2940.50;
    const isIndia = isIndianStock(symbol);
    simStateRef.current.price = base;
    simStateRef.current.cvd = isIndia ? 8500 : 14.5;
    simStateRef.current.candle = {
      timestamp: Math.floor(Date.now() / 60000) * 60000,
      interval: '1m',
      open: base,
      high: Number((base + base * (isIndia ? 0.0003 : 0.0004)).toFixed(2)),
      low: Number((base - base * (isIndia ? 0.0003 : 0.0004)).toFixed(2)),
      close: base,
      volume: isIndia ? 45000 : 12.0,
      buy_volume: isIndia ? 26000 : 7.0,
      sell_volume: isIndia ? 19000 : 5.0,
      poc_price: base,
      vah: Number((base + base * 0.0002).toFixed(2)),
      val: Number((base - base * 0.0002).toFixed(2))
    };
  }, [symbol]);

  // Autonomous Simulation Engine
  useEffect(() => {
    if (isConnected) {
      if (simTickerRef.current) clearInterval(simTickerRef.current);
      return;
    }

    setIsSimulated(true);

    simTickerRef.current = setInterval(() => {
      const now = Date.now();
      const state = simStateRef.current;
      const isIndia = isIndianStock(symbol);

      // NSE Tick Size is ₹0.05
      const tickStep = isIndia ? 0.05 : 0.01;
      const rawDelta = (Math.random() - 0.49) * (state.price * 0.00015);
      const roundedSteps = Math.round(rawDelta / tickStep);
      const newPrice = Number((state.price + roundedSteps * tickStep).toFixed(2));
      state.price = newPrice;

      // Update candle
      const candleMin = Math.floor(now / 60000) * 60000;
      if (candleMin > state.candle.timestamp) {
        state.candle = {
          timestamp: candleMin,
          interval: '1m',
          open: newPrice,
          high: newPrice,
          low: newPrice,
          close: newPrice,
          volume: isIndia ? 500 : 0.5,
          buy_volume: isIndia ? 300 : 0.3,
          sell_volume: isIndia ? 200 : 0.2,
          poc_price: newPrice,
          vah: Number((newPrice + (isIndia ? 0.5 : 1.0)).toFixed(2)),
          val: Number((newPrice - (isIndia ? 0.5 : 1.0)).toFixed(2))
        };
      } else {
        state.candle.high = Math.max(state.candle.high, newPrice);
        state.candle.low = Math.min(state.candle.low, newPrice);
        state.candle.close = newPrice;
        state.candle.volume += isIndia ? Math.round(Math.random() * 450 + 50) : Math.random() * 0.4;
      }

      // Generate 10 bids & asks
      const spreadStep = isIndia ? 0.05 : Math.max(0.01, newPrice * 0.00002);
      const bids: [number, number][] = [];
      const asks: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const bp = Number((newPrice - (i + 1) * spreadStep).toFixed(2));
        const bq = isIndia
          ? Math.round((Math.random() * 8500 + 1200))
          : Number((Math.random() * 2.8 + 0.3).toFixed(3));
        bids.push([bp, bq]);

        const ap = Number((newPrice + (i + 1) * spreadStep).toFixed(2));
        const aq = isIndia
          ? Math.round((Math.random() * 8500 + 1200))
          : Number((Math.random() * 2.8 + 0.3).toFixed(3));
        asks.push([ap, aq]);
      }

      // Add liquidity wall (Institutions in India / Whales in Crypto)
      if (Math.random() > 0.6) {
        bids[3][1] = isIndia ? bids[3][1] + 35000 : Number((bids[3][1] + 6.5).toFixed(3));
      } else if (Math.random() > 0.6) {
        asks[4][1] = isIndia ? asks[4][1] + 42000 : Number((asks[4][1] + 7.2).toFixed(3));
      }

      const totBid = bids.reduce((acc, b) => acc + b[1], 0);
      const totAsk = asks.reduce((acc, a) => acc + a[1], 0);
      const obi = Number(((totBid - totAsk) / (totBid + totAsk)).toFixed(3));
      const stoikov = Number(((bids[0][0] * totAsk + asks[0][0] * totBid) / (totBid + totAsk)).toFixed(2));

      state.cvd += (obi > 0 ? 1 : -1) * (isIndia ? Math.round(Math.random() * 800 + 200) : Math.random() * 0.8);
      const cvd1m = isIndia ? Math.round(state.cvd) : Number(state.cvd.toFixed(1));

      // Trigger Anomaly events periodically (every 22 seconds)
      const newEvents: AnomalyEvent[] = [];
      if (now - state.lastEventTime > 22000) {
        state.lastEventTime = now;
        const types: AnomalyEvent['type'][] = ['LIQUIDITY_SWEEP', 'POTENTIAL_SPOOF', 'POTENTIAL_ICEBERG', 'FAKEOUT'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const side = obi > 0 ? 'BID' : 'ASK';
        const currSign = isIndia ? '₹' : '$';
        const volDesc = isIndia
          ? `${Math.round(Math.random() * 45000 + 15000).toLocaleString('en-IN')} shares`
          : `${(Math.random() * 12 + 4).toFixed(1)} BTC size`;

        const evt: AnomalyEvent = {
          id: `sim_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: now,
          type: chosenType,
          side: side,
          price: newPrice,
          severity: Math.random() > 0.4 ? 'HIGH' : 'MEDIUM',
          details: `${chosenType.replace('_', ' ')} detected on ${side} level at ${currSign}${newPrice.toFixed(2)} with ${volDesc}`
        };
        newEvents.push(evt);
        setRecentEvents((prev) => [evt, ...prev].slice(0, 50));
      }

      // Prediction & Signal
      const isBull = obi > 0.08;
      const isBear = obi < -0.08;
      const dir: 'UP' | 'NEUTRAL' | 'DOWN' = isBull ? 'UP' : isBear ? 'DOWN' : 'NEUTRAL';
      const conf = Number((0.74 + Math.abs(obi) * 0.25).toFixed(3));
      const sigDir: 'LONG' | 'SHORT' | 'NEUTRAL' = isBull ? 'LONG' : isBear ? 'SHORT' : 'NEUTRAL';

      const simulatedFeed: MarketFeedMessage = {
        timestamp: now,
        symbol: symbol,
        price: newPrice,
        orderbook: {
          bids,
          asks,
          spread: Number((asks[0][0] - bids[0][0]).toFixed(2)),
          spread_bps: Number((((asks[0][0] - bids[0][0]) / newPrice) * 10000).toFixed(2))
        },
        metrics: {
          obi,
          obi_rolling_mean_15s: Number((obi * 0.85).toFixed(3)),
          stoikov_micro_price: stoikov,
          micro_mid_divergence: Number((stoikov - newPrice).toFixed(3)),
          cvd_1m: cvd1m,
          cvd_5m: isIndia ? Math.round(cvd1m * 2.2) : Number((cvd1m * 2.5).toFixed(1)),
          trade_intensity: Number((Math.random() * 35 + 15).toFixed(1)),
          realized_volatility: Number((0.008 + Math.random() * 0.004).toFixed(4))
        },
        prediction: {
          direction: dir,
          probabilities: {
            UP: isBull ? conf : Number(((1 - conf) * 0.5).toFixed(2)),
            NEUTRAL: 0.15,
            DOWN: isBear ? conf : Number(((1 - conf) * 0.5).toFixed(2))
          },
          confidence: conf,
          latency_ms: 1.4,
          feature_attributions: {
            obi_depth_ratio: 0.38,
            micro_price_divergence: 0.27,
            cvd_delta: 0.21,
            trade_intensity: 0.14
          }
        },
        signal: {
          direction: sigDir,
          strength: Math.round(conf * 100),
          reasons: isBull
            ? [isIndia ? 'NSE Institutional Accumulation > +18%' : 'Orderbook Imbalance Delta > +0.18', 'Cumulative Volume Delta positive', 'Stoikov micro-price > mid-price']
            : isBear
            ? [isIndia ? 'Institutional Selling Pressure < -18%' : 'Orderbook Imbalance Delta < -0.18', 'Cumulative Volume Delta negative', 'Stoikov micro-price < mid-price']
            : ['Equilibrium liquidity balanced', isIndia ? 'Spread tight at ₹0.05' : 'Spread compressed within 1.2 bps']
        },
        risk: {
          level: Math.abs(obi) > 0.4 ? 'HIGH' : 'LOW',
          slippage_est_bps: Number((Math.random() * 0.6 + 0.2).toFixed(2)),
          adjusted_confidence: Number((conf * 0.94).toFixed(3))
        },
        events: newEvents,
        candle: state.candle
      };

      setFeed(simulatedFeed);
      setLatencyMs(Math.round(Math.random() * 2 + 1));
    }, 1000);

    return () => {
      if (simTickerRef.current) clearInterval(simTickerRef.current);
    };
  }, [isConnected, symbol]);

  // Real WebSocket Connector (resolves NEXT_PUBLIC_WS_URL, cleans scheme, connects)
  const connectWebSocket = useCallback(() => {
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (wsUrl) {
      wsUrl = wsUrl.trim();
      wsUrl = wsUrl.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');
      if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        wsUrl = `wss://${wsUrl}`;
      }
      if (!wsUrl.includes('/ws/feed')) {
        wsUrl = wsUrl.replace(/\/+$/, '') + '/ws/feed';
      }
    } else if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        wsUrl = 'ws://127.0.0.1:8000/ws/feed';
      }
    }

    if (!wsUrl) {
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsSimulated(false);
        if (simTickerRef.current) clearInterval(simTickerRef.current);

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const startT = performance.now();
            ws.send(JSON.stringify({ command: 'ping', timestamp: startT }));
          }
        }, 3000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            const roundtrip = performance.now() - data.timestamp;
            setLatencyMs(Math.round(roundtrip));
            return;
          }

          setFeed(data);

          if (data.events && data.events.length > 0) {
            setRecentEvents((prev) => {
              const newEvts = [...data.events, ...prev];
              return newEvts.slice(0, 100);
            });
          }
        } catch (e) {
          console.error("Feed parse error:", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsSimulated(true);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        setTimeout(() => connectWebSocket(), 4000);
      };

      ws.onerror = () => {
        setIsConnected(false);
        setIsSimulated(true);
      };
    } catch (e) {
      setIsConnected(false);
      setIsSimulated(true);
    }
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [connectWebSocket]);

  const setSymbol = async (newSymbol: string) => {
    setSymbolState(newSymbol);
  };

  const setMode = async (newMode: 'LIVE' | 'REPLAY') => {
    setModeState(newMode);
  };

  return {
    symbol,
    mode,
    isConnected,
    isSimulated,
    latencyMs,
    feed,
    recentEvents,
    setSymbol,
    setMode
  };
}
