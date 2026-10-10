"use client";

import React from 'react';
import { MetricsData } from '@/hooks/useMarketStream';

interface MetricsHUDProps {
  metrics?: MetricsData;
}

export default function MetricsHUD({ metrics }: MetricsHUDProps) {
  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded-lg text-slate-400 text-xs shadow-sm">
        Calculating metrics...
      </div>
    );
  }

  const obiColor = metrics.obi > 0.1 ? 'text-emerald-600' : metrics.obi < -0.1 ? 'text-red-600' : 'text-slate-700';

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm shrink-0">
      <div className="flex items-center justify-between px-2.5 py-1 bg-slate-50 border-b border-slate-200">
        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">QUANT METRICS</span>
        <span className="text-[8px] text-blue-700 font-bold bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
          REALTIME
        </span>
      </div>

      <div className="p-1.5 grid grid-cols-2 gap-1.5 text-xs font-mono">
        {/* OBI CARD */}
        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] text-slate-500 font-sans font-bold">
            <span>OBI</span>
            <span className="text-[8px] font-mono text-slate-400">15s: {(metrics.obi_rolling_mean_15s * 100).toFixed(0)}%</span>
          </div>
          <span className={`text-sm font-extrabold my-0.5 ${obiColor}`}>
            {(metrics.obi * 100).toFixed(1)}%
          </span>
        </div>

        {/* STOIKOV MICRO PRICE */}
        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] text-slate-500 font-sans font-bold">
            <span>MICRO-PRICE</span>
            <span className={`text-[8px] font-mono font-bold ${metrics.micro_mid_divergence >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {metrics.micro_mid_divergence >= 0 ? '+' : ''}{metrics.micro_mid_divergence.toFixed(2)}
            </span>
          </div>
          <span className="text-sm font-extrabold my-0.5 text-blue-700 truncate">
            ${metrics.stoikov_micro_price.toFixed(2)}
          </span>
        </div>

        {/* CVD 1M / 5M */}
        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] text-slate-500 font-sans font-bold">
            <span>CVD 1M</span>
            <span className="text-[8px] font-mono text-slate-400">5m: {metrics.cvd_5m.toFixed(1)}</span>
          </div>
          <span className={`text-sm font-extrabold my-0.5 ${metrics.cvd_1m >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {metrics.cvd_1m >= 0 ? '+' : ''}{metrics.cvd_1m.toFixed(2)}
          </span>
        </div>

        {/* TRADE INTENSITY */}
        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] text-slate-500 font-sans font-bold">
            <span>INTENSITY</span>
            <span className="text-[8px] font-mono text-slate-400">Vol: {(metrics.realized_volatility * 100).toFixed(2)}%</span>
          </div>
          <span className="text-sm font-extrabold my-0.5 text-purple-700">
            {metrics.trade_intensity.toFixed(1)} <span className="text-[9px] text-slate-500 font-sans font-normal">t/s</span>
          </span>
        </div>
      </div>
    </div>
  );
}
