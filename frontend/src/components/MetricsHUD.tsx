"use client";

import React from 'react';
import { MetricsData } from '@/hooks/useMarketStream';

interface MetricsHUDProps {
  metrics?: MetricsData;
}

export default function MetricsHUD({ metrics }: MetricsHUDProps) {
  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white border border-slate-200 rounded-xl p-4 text-slate-400 text-xs shadow-sm">
        Calculating metrics...
      </div>
    );
  }

  const obiColor = metrics.obi > 0.1 ? 'text-emerald-600' : metrics.obi < -0.1 ? 'text-red-600' : 'text-slate-700';

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">QUANT METRICS</span>
        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          REALTIME
        </span>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2 text-xs font-mono">
        {/* OBI CARD */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-sans font-bold uppercase">ORDER BOOK IMBALANCE</span>
          <span className={`text-base font-bold my-1 ${obiColor}`}>
            {(metrics.obi * 100).toFixed(1)}%
          </span>
          <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-200 pt-1 mt-1 font-sans">
            <span>15s Mean:</span>
            <span className="font-bold text-slate-800 font-mono">{(metrics.obi_rolling_mean_15s * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* STOIKOV MICRO PRICE */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-sans font-bold uppercase">MICRO-PRICE</span>
          <span className="text-base font-bold my-1 text-blue-700">
            ${metrics.stoikov_micro_price.toFixed(2)}
          </span>
          <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-200 pt-1 mt-1 font-sans">
            <span>Mid Div:</span>
            <span className={`font-bold font-mono ${metrics.micro_mid_divergence >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {metrics.micro_mid_divergence >= 0 ? '+' : ''}{metrics.micro_mid_divergence.toFixed(3)}
            </span>
          </div>
        </div>

        {/* CVD 1M & 5M */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-sans font-bold uppercase">CVD 1M / 5M</span>
          <span className={`text-base font-bold my-1 ${metrics.cvd_1m >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {metrics.cvd_1m >= 0 ? '+' : ''}{metrics.cvd_1m.toFixed(2)}
          </span>
          <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-200 pt-1 mt-1 font-sans">
            <span>5m Delta:</span>
            <span className="font-bold text-slate-800 font-mono">{metrics.cvd_5m >= 0 ? '+' : ''}{metrics.cvd_5m.toFixed(1)}</span>
          </div>
        </div>

        {/* TRADE INTENSITY */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-sans font-bold uppercase">INTENSITY / VOL</span>
          <span className="text-base font-bold my-1 text-purple-700">
            {metrics.trade_intensity.toFixed(1)} <span className="text-[10px] text-slate-500 font-sans">t/s</span>
          </span>
          <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-200 pt-1 mt-1 font-sans">
            <span>Realized Vol:</span>
            <span className="font-bold text-slate-800 font-mono">{(metrics.realized_volatility * 100).toFixed(3)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
