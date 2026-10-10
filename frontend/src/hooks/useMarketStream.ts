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

export function useMarketStream(backendUrl: string = 'http://localhost:8000') {
  const [symbol, setSymbolState] = useState<string>('BTCUSDT');
  const [mode, setModeState] = useState<'LIVE' | 'REPLAY'>('LIVE');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [feed, setFeed] = useState<MarketFeedMessage | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnomalyEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = useCallback(() => {
    const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' ? window.location.hostname : '127.0.0.1';
    const wsUrl = `${wsProtocol}//${host}:8000/ws/feed`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Start ping ticker
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
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Auto-reconnect after 2 seconds
        setTimeout(() => connectWebSocket(), 2000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      console.error("WS connection creation error:", e);
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
    try {
      await fetch(`${backendUrl}/api/stream/symbol`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: newSymbol })
      });
    } catch (e) {
      console.error("Error setting symbol:", e);
    }
  };

  const setMode = async (newMode: 'LIVE' | 'REPLAY') => {
    setModeState(newMode);
    try {
      await fetch(`${backendUrl}/api/stream/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
    } catch (e) {
      console.error("Error setting stream mode:", e);
    }
  };

  return {
    symbol,
    mode,
    isConnected,
    latencyMs,
    feed,
    recentEvents,
    setSymbol,
    setMode
  };
}
