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

const BASE_PRICES: Record<string, number> = {
  BTCUSDT: 83020.0,
  ETHUSDT: 3480.0,
  BNBUSDT: 590.0,
  SOLUSDT: 152.0
};

export function useMarketStream(backendUrl: string = 'http://localhost:8000') {
  const [symbol, setSymbolState] = useState<string>('BTCUSDT');
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
    price: 83020.0,
    cvd: 14.5,
    candle: {
      timestamp: Math.floor(Date.now() / 60000) * 60000,
      interval: '1m',
      open: 83015.0,
      high: 83025.0,
      low: 83010.0,
      close: 83020.0,
      volume: 48.2,
      buy_volume: 28.1,
      sell_volume: 20.1,
      poc_price: 83020.0,
      vah: 83023.0,
      val: 83015.0
    },
    lastEventTime: Date.now()
  });

  // When symbol changes, reset base simulation price
  useEffect(() => {
    const base = BASE_PRICES[symbol] || 83020.0;
    simStateRef.current.price = base;
    simStateRef.current.candle = {
      timestamp: Math.floor(Date.now() / 60000) * 60000,
      interval: '1m',
      open: base,
      high: base + base * 0.0004,
      low: base - base * 0.0004,
      close: base,
      volume: 12.0,
      buy_volume: 7.0,
      sell_volume: 5.0,
      poc_price: base,
      vah: base + base * 0.0002,
      val: base - base * 0.0002
    };
  }, [symbol]);

  // Autonomous Simulation Engine (activates whenever live WebSocket is not yet connected)
  useEffect(() => {
    if (isConnected) {
      if (simTickerRef.current) clearInterval(simTickerRef.current);
      return;
    }

    setIsSimulated(true);

    simTickerRef.current = setInterval(() => {
      const now = Date.now();
      const state = simStateRef.current;
      const tickDelta = (Math.random() - 0.49) * (state.price * 0.00015);
      const newPrice = Math.round((state.price + tickDelta) * 100) / 100;
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
          volume: 0.5,
          buy_volume: 0.3,
          sell_volume: 0.2,
          poc_price: newPrice,
          vah: newPrice + 1.0,
          val: newPrice - 1.0
        };
      } else {
        state.candle.high = Math.max(state.candle.high, newPrice);
        state.candle.low = Math.min(state.candle.low, newPrice);
        state.candle.close = newPrice;
        state.candle.volume += Math.random() * 0.4;
      }

      // Generate 10 bids & asks
      const spreadStep = Math.max(0.1, newPrice * 0.00002);
      const bids: [number, number][] = [];
      const asks: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const bp = Math.round((newPrice - (i + 1) * spreadStep) * 100) / 100;
        const bq = Math.round((Math.random() * 2.8 + 0.3) * 1000) / 1000;
        bids.push([bp, bq]);

        const ap = Math.round((newPrice + (i + 1) * spreadStep) * 100) / 100;
        const aq = Math.round((Math.random() * 2.8 + 0.3) * 1000) / 1000;
        asks.push([ap, aq]);
      }

      // Add occasional liquidity wall
      if (Math.random() > 0.6) {
        bids[3][1] = Math.round((bids[3][1] + 6.5) * 1000) / 1000;
      } else if (Math.random() > 0.6) {
        asks[4][1] = Math.round((asks[4][1] + 7.2) * 1000) / 1000;
      }

      const totBid = bids.reduce((acc, b) => acc + b[1], 0);
      const totAsk = asks.reduce((acc, a) => acc + a[1], 0);
      const obi = Math.round(((totBid - totAsk) / (totBid + totAsk)) * 1000) / 1000;
      const stoikov = Math.round(((bids[0][0] * totAsk + asks[0][0] * totBid) / (totBid + totAsk)) * 100) / 100;

      state.cvd += (obi > 0 ? 1 : -1) * (Math.random() * 0.8);
      const cvd1m = Math.round(state.cvd * 10) / 10;

      // Check anomalies (calm interval)
      const newEvents: AnomalyEvent[] = [];
      if (now - state.lastEventTime > 25000) {
        state.lastEventTime = now;
        const types: AnomalyEvent['type'][] = ['LIQUIDITY_SWEEP', 'POTENTIAL_SPOOF', 'POTENTIAL_ICEBERG', 'FAKEOUT'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const side = obi > 0 ? 'BID' : 'ASK';
        const evt: AnomalyEvent = {
          id: `sim_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: now,
          type: chosenType,
          side: side,
          price: newPrice,
          severity: Math.random() > 0.4 ? 'HIGH' : 'MEDIUM',
          details: `${chosenType.replace('_', ' ')} detected on ${side} level at $${newPrice.toFixed(2)} with ${(Math.random() * 12 + 4).toFixed(1)} BTC size`
        };
        newEvents.push(evt);
        setRecentEvents((prev) => [evt, ...prev].slice(0, 50));
      }

      // Prediction & Signal
      const isBull = obi > 0.08;
      const isBear = obi < -0.08;
      const dir: 'UP' | 'NEUTRAL' | 'DOWN' = isBull ? 'UP' : isBear ? 'DOWN' : 'NEUTRAL';
      const conf = Math.round((0.74 + Math.abs(obi) * 0.25) * 1000) / 1000;
      const sigDir: 'LONG' | 'SHORT' | 'NEUTRAL' = isBull ? 'LONG' : isBear ? 'SHORT' : 'NEUTRAL';

      const simulatedFeed: MarketFeedMessage = {
        timestamp: now,
        symbol: symbol,
        price: newPrice,
        orderbook: {
          bids,
          asks,
          spread: Math.round((asks[0][0] - bids[0][0]) * 100) / 100,
          spread_bps: Math.round(((asks[0][0] - bids[0][0]) / newPrice) * 100000) / 10
        },
        metrics: {
          obi,
          obi_rolling_mean_15s: Math.round((obi * 0.85) * 1000) / 1000,
          stoikov_micro_price: stoikov,
          micro_mid_divergence: Math.round((stoikov - newPrice) * 100) / 100,
          cvd_1m: cvd1m,
          cvd_5m: Math.round(cvd1m * 2.5 * 10) / 10,
          trade_intensity: Math.round((Math.random() * 35 + 15) * 10) / 10,
          realized_volatility: Math.round((0.008 + Math.random() * 0.004) * 10000) / 10000
        },
        prediction: {
          direction: dir,
          probabilities: {
            UP: isBull ? conf : Math.round((1 - conf) * 0.5 * 100) / 100,
            NEUTRAL: 0.15,
            DOWN: isBear ? conf : Math.round((1 - conf) * 0.5 * 100) / 100
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
            ? ['Orderbook Imbalance Delta > +0.18', 'Cumulative Volume Delta positive', 'Stoikov micro-price > mid-price']
            : isBear
            ? ['Orderbook Imbalance Delta < -0.18', 'Cumulative Volume Delta negative', 'Stoikov micro-price < mid-price']
            : ['Equilibrium liquidity balanced', 'Spread compressed within 1.2 bps']
        },
        risk: {
          level: Math.abs(obi) > 0.4 ? 'HIGH' : 'LOW',
          slippage_est_bps: Math.round((Math.random() * 0.8 + 0.4) * 10) / 10,
          adjusted_confidence: Math.round((conf * 0.94) * 1000) / 1000
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
      // Stay on autonomous engine
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
