"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CandleData, AnomalyEvent, isIndianStock } from '@/hooks/useMarketStream';

interface ChartProps {
  symbol: string;
  currentPrice: number;
  candleData?: CandleData;
  events?: AnomalyEvent[];
}

const DEFAULT_SYMBOL_PRICES: Record<string, number> = {
  // Indian Heavyweights (NSE)
  RELIANCE: 2940.50,
  HDFCBANK: 1685.40,
  TCS: 4180.25,
  TATAMOTORS: 965.80,
  INFY: 1875.60,
  ICICIBANK: 1245.30,
  SBIN: 795.50,
  // Crypto
  BTCUSDT: 83020.0,
  ETHUSDT: 3480.0,
  BNBUSDT: 590.0,
  SOLUSDT: 152.0
};

export default function Chart({ symbol, currentPrice, candleData, events = [] }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<string>('1m');
  const chartInstanceRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const pocLineRef = useRef<any>(null);
  const currentSymbolRef = useRef<string>(symbol);

  const isIndia = isIndianStock(symbol);
  const currSign = isIndia ? '₹' : '$';

  // Helper to generate realistic historical candles for a specific coin/stock price
  const generateHistoryForSymbol = useCallback((sym: string, price: number) => {
    const base = price > 0 ? price : (DEFAULT_SYMBOL_PRICES[sym] || 2940.50);
    const isInd = isIndianStock(sym);
    const nowSec = Math.floor(Date.now() / 1000);
    const candles = [];
    let lastClose = base;
    const volStep = Math.max(isInd ? 0.25 : 0.04, base * (isInd ? 0.0002 : 0.00025));

    for (let i = 50; i >= 0; i--) {
      const time = nowSec - i * 5;
      const open = lastClose;
      const high = open + Math.random() * volStep;
      const low = open - Math.random() * volStep;
      const close = open + (Math.random() - 0.49) * (volStep * 0.85);
      lastClose = close;

      candles.push({
        time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
      });
    }
    return candles;
  }, []);

  // Initialize Lightweight Chart instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart: any = null;

    import('lightweight-charts').then((LightweightCharts) => {
      if (!chartContainerRef.current) return;

      chart = LightweightCharts.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight || 360,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#475569',
          fontSize: 11,
          fontFamily: 'sans-serif',
        },
        grid: {
          vertLines: { color: '#f8fafc' },
          horzLines: { color: '#f8fafc' },
        },
        rightPriceScale: {
          borderColor: '#e2e8f0',
          autoScale: true,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: '#e2e8f0',
          timeVisible: true,
          secondsVisible: true,
        },
        crosshair: {
          vertLine: { color: '#2563eb', width: 1, style: 2 },
          horzLine: { color: '#2563eb', width: 1, style: 2 },
        },
      });

      chartInstanceRef.current = chart;

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#16a34a',
        downColor: '#dc2626',
        borderVisible: false,
        wickUpColor: '#16a34a',
        wickDownColor: '#dc2626',
      });
      candlestickSeriesRef.current = candleSeries;

      // Seed initial candles for current symbol
      const initial = generateHistoryForSymbol(symbol, currentPrice);
      candleSeries.setData(initial);
      chart.timeScale().fitContent();

      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  // When symbol switches, cleanly reset candles to that symbol's exact price scale
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartInstanceRef.current) return;

    currentSymbolRef.current = symbol;

    // Remove old POC line
    if (pocLineRef.current) {
      try {
        candlestickSeriesRef.current.removePriceLine(pocLineRef.current);
      } catch (e) {}
      pocLineRef.current = null;
    }

    // Set new tailored candles
    const newCandles = generateHistoryForSymbol(symbol, currentPrice);
    candlestickSeriesRef.current.setData(newCandles);
    chartInstanceRef.current.timeScale().fitContent();
  }, [symbol, generateHistoryForSymbol]);

  // Update live tick / candle
  useEffect(() => {
    if (!candlestickSeriesRef.current || !currentPrice) return;

    // Avoid updating if candle price mismatch during symbol transition
    const baseTarget = DEFAULT_SYMBOL_PRICES[symbol] || 2940.50;
    if (Math.abs(currentPrice - baseTarget) / baseTarget > 0.6) {
      return;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const bucketTime = Math.floor(nowSec / 5) * 5;

    const candle = candleData ? {
      time: Math.floor(candleData.timestamp / 1000),
      open: candleData.open,
      high: candleData.high,
      low: candleData.low,
      close: candleData.close,
    } : {
      time: bucketTime,
      open: currentPrice - 0.1,
      high: currentPrice + 0.2,
      low: currentPrice - 0.2,
      close: currentPrice,
    };

    try {
      candlestickSeriesRef.current.update(candle);
    } catch (e) {}
  }, [currentPrice, candleData, symbol]);

  // Update POC horizontal line
  useEffect(() => {
    if (!candlestickSeriesRef.current || !candleData?.poc_price) return;
    try {
      if (pocLineRef.current) {
        candlestickSeriesRef.current.removePriceLine(pocLineRef.current);
      }
      pocLineRef.current = candlestickSeriesRef.current.createPriceLine({
        price: candleData.poc_price,
        color: '#d97706',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `POC ${currSign}${candleData.poc_price.toFixed(2)}`,
      });
    } catch (e) {}
  }, [candleData?.poc_price, currSign]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-extrabold text-slate-900 tracking-wide">{symbol}</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
              {isIndia ? 'NSE INDIA' : 'PERPETUAL'}
            </span>
          </div>
          <span className="text-xs text-blue-700 font-bold bg-blue-100/80 px-2.5 py-0.5 rounded border border-blue-200 font-mono">
            {currSign}{currentPrice > 0 ? currentPrice.toFixed(2) : '---'}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {['1s', '5s', '15s', '1m', '5m'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-0.5 text-xs font-semibold rounded transition-colors ${
                timeframe === tf
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-200/70 text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 min-h-[340px] w-full" ref={chartContainerRef}>
        {candleData?.poc_price && (
          <div className="absolute top-2 right-2 z-10 text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded shadow-sm font-mono">
            POC: {currSign}{candleData.poc_price.toFixed(2)} | VAH: {currSign}{candleData.vah.toFixed(2)} | VAL: {currSign}{candleData.val.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}
