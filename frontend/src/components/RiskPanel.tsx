"use client";

import React from 'react';
import { RiskData } from '@/hooks/useMarketStream';

interface RiskPanelProps {
  risk?: RiskData;
}

export default function RiskPanel({ risk }: RiskPanelProps) {
  if (!risk) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 text-slate-400 text-xs shadow-sm">
        Evaluating market risk...
      </div>
    );
  }

  const levelColor =
    risk.level === 'LOW'
      ? 'text-emerald-800 border-emerald-300 bg-emerald-50'
      : risk.level === 'MEDIUM'
      ? 'text-blue-800 border-blue-300 bg-blue-50'
      : risk.level === 'HIGH'
      ? 'text-amber-800 border-amber-300 bg-amber-50'
      : 'text-red-800 border-red-300 bg-red-50';

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">RISK GAUGES</span>
        <span className="text-[10px] text-slate-400 font-semibold">ANALYTICAL</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className={`p-2 rounded-lg border ${levelColor} flex flex-col items-center justify-center`}>
          <span className="text-[9px] font-bold text-slate-500 uppercase">RISK TIER</span>
          <span className="text-xs font-bold mt-0.5">{risk.level}</span>
        </div>

        <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold text-slate-500 uppercase">EST SLIPPAGE</span>
          <span className="text-xs font-bold text-amber-700 mt-0.5 font-mono">{risk.slippage_est_bps.toFixed(2)} bps</span>
        </div>

        <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold text-slate-500 uppercase">RISK-ADJ CONF</span>
          <span className="text-xs font-bold text-blue-700 mt-0.5 font-mono">{risk.adjusted_confidence.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
