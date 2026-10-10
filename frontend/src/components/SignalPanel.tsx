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
      <div className="bg-white border border-slate-200 rounded-lg p-2 text-slate-400 text-xs shadow-sm">
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
    : 'bg-slate-100 text-slate-700 border-slate-300 font-semibold';

  const pct = Math.round(signal.strength * 100);

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm p-2 shrink-0">
      <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">SIGNAL FUSION CARD</span>
        <span className="text-[8px] text-slate-400 font-semibold">ML + ORDERFLOW</span>
      </div>

      <div className="flex items-center justify-between my-0.5">
        <div className={`px-2 py-0.5 rounded text-[11px] border ${badgeBg}`}>
          {signal.direction}
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[8px] text-slate-500 font-bold uppercase">STRENGTH</span>
          <span className="text-xs font-extrabold text-slate-900 font-mono">{pct}%</span>
        </div>
      </div>

      {/* Progress meter */}
      <div className="w-full bg-slate-100 rounded-full h-1 my-1 overflow-hidden border border-slate-200">
        <div
          className={`h-full transition-all duration-300 ${
            isLong ? 'bg-emerald-600' : isShort ? 'bg-red-600' : 'bg-slate-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Rationale tags */}
      {signal.reasons && signal.reasons.length > 0 && (
        <div className="text-[9px] text-slate-600 font-medium truncate pt-0.5">
          • {signal.reasons[0]}
        </div>
      )}
    </div>
  );
}
