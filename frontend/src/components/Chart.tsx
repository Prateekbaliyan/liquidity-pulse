"use client";

import React, { useEffect, useRef, useState } from 'react';
import { CandleData, AnomalyEvent } from '@/hooks/useMarketStream';

interface ChartProps {
  symbol: string;
  currentPrice: number;
  candleData?: CandleData;
  events?: AnomalyEvent[];
}

export default function Chart({ symbol, currentPrice, candleData, events = [] }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<string>('1m');
  const chartInstanceRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const pocLineRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart: any = null;

    // Dynamically load lightweight-charts client-side
    import('lightweight-charts').then((LightweightCharts) => {
      if (!chartContainerRef.current) return;

      chart = LightweightCharts.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight || 380,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#475569',
          fontSize: 11,
          fontFamily: 'sans-serif',
        },
        grid: {
          vertLines: { color: '#f1f5f9' },
          horzLines: { color: '#f1f5f9' },
        },
        rightPriceScale: {
          borderColor: '#e2e8f0',
          autoScale: true,
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

      // Seed initial dummy historical ticks
      const nowSec = Math.floor(Date.now() / 1000);
      const base = currentPrice || 64250.0;
      const initialCandles = [];
      let lastClose = base;

      for (let i = 60; i >= 0; i--) {
        const time = nowSec - i * 5;
        const open = lastClose;
        const high = open + (Math.random() * 2.0);
        const low = open - (Math.random() * 2.0);
        const close = open + ((Math.random() - 0.48) * 1.5);
        lastClose = close;

        initialCandles.push({
          time,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
        });
      }

      candleSeries.setData(initialCandles);

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

  // Update realtime candlestick
  useEffect(() => {
    if (!candlestickSeriesRef.current || !currentPrice) return;

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
      open: currentPrice - 0.2,
      high: currentPrice + 0.5,
      low: currentPrice - 0.5,
      close: currentPrice,
    };

    try {
      candlestickSeriesRef.current.update(candle);
    } catch (e) {}
  }, [currentPrice, candleData]);

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
        title: `POC ${candleData.poc_price.toFixed(2)}`,
      });
    } catch (e) {}
  }, [candleData?.poc_price]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{symbol} PERPETUAL FUTURES</span>
          <span className="text-xs text-blue-700 font-bold bg-blue-100/80 px-2.5 py-0.5 rounded border border-blue-200 font-mono">
            ${currentPrice > 0 ? currentPrice.toFixed(2) : '---'}
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

      <div className="relative flex-1 min-h-[360px] w-full" ref={chartContainerRef}>
        {candleData?.poc_price && (
          <div className="absolute top-2 right-2 z-10 text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded shadow-sm">
            POC: ${candleData.poc_price.toFixed(2)} | VAH: ${candleData.vah.toFixed(2)} | VAL: ${candleData.val.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}
