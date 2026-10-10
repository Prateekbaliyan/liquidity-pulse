"use client";

import React from 'react';
import { SignalData, PredictionData } from '@/hooks/useMarketStream';

interface SignalPanelProps {
  signal?: SignalData;
  prediction?: PredictionData;
}

export default function SignalPanel({ signal, prediction }: SignalPanelProps) {
  if (!signal) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 text-slate-400 text-xs shadow-sm">
        Fusing quant signals...
      </div>
    );
  }

  const isLong = signal.direction === 'LONG';
  const isShort = signal.direction === 'SHORT';

  const badgeBg = isLong
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
    : isShort
    ? 'bg-red-100 text-red-800 border-red-300 font-bold'
    : 'bg-slate-100 text-slate-700 border-slate-300';

  const pct = Math.round(signal.strength * 100);

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">SIGNAL FUSION CARD</span>
        <span className="text-[10px] text-slate-400 font-semibold">ML + ORDERFLOW</span>
      </div>

      <div className="flex items-center justify-between my-1">
        <div className={`px-3 py-1 rounded-md text-sm border ${badgeBg}`}>
          {signal.direction}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-500 font-bold uppercase">STRENGTH</span>
          <span className="text-sm font-bold text-slate-900 font-mono">{pct}%</span>
        </div>
      </div>

      {/* Progress meter */}
      <div className="w-full bg-slate-100 rounded-full h-2 my-2 overflow-hidden border border-slate-200">
        <div
          className={`h-full transition-all duration-300 ${
            isLong ? 'bg-emerald-600' : isShort ? 'bg-red-600' : 'bg-slate-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Rationale tags */}
      <div className="flex flex-wrap gap-1 mt-2">
        {signal.reasons.map((r, idx) => (
          <span
            key={idx}
            className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium"
          >
            • {r}
          </span>
        ))}
      </div>
    </div>
  );
}
