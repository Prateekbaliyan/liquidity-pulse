"use client";

import React from 'react';
import { PredictionData } from '@/hooks/useMarketStream';

interface ModelMonitorProps {
  prediction?: PredictionData;
}

export default function ModelMonitor({ prediction }: ModelMonitorProps) {
  if (!prediction) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 text-slate-400 text-xs shadow-sm">
        Loading ONNX Inference Session...
      </div>
    );
  }

  const probs = prediction.probabilities || { DOWN: 0.33, NEUTRAL: 0.34, UP: 0.33 };
  const attributions = prediction.feature_attributions || {};

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-3 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">ONNX MODEL MONITOR</span>
        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
          CPU LATENCY: {prediction.latency_ms.toFixed(1)}ms
        </span>
      </div>

      {/* Class Probabilities Bar */}
      <div className="flex flex-col space-y-1 mb-3">
        <div className="flex items-center justify-between text-[10px] font-bold font-mono">
          <span className="text-red-600">DOWN: {(probs.DOWN * 100).toFixed(1)}%</span>
          <span className="text-slate-600">NEUTRAL: {(probs.NEUTRAL * 100).toFixed(1)}%</span>
          <span className="text-emerald-600">UP: {(probs.UP * 100).toFixed(1)}%</span>
        </div>
        <div className="flex h-2.5 rounded-md overflow-hidden border border-slate-200 w-full bg-slate-100">
          <div className="bg-red-500 transition-all duration-300" style={{ width: `${probs.DOWN * 100}%` }} />
          <div className="bg-slate-400 transition-all duration-300" style={{ width: `${probs.NEUTRAL * 100}%` }} />
          <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${probs.UP * 100}%` }} />
        </div>
      </div>

      {/* Top Feature Attributions */}
      {Object.keys(attributions).length > 0 && (
        <div className="flex flex-col space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">TOP FEATURE ATTRIBUTIONS</span>
          <div className="space-y-1 text-xs font-mono">
            {Object.entries(attributions).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100">
                <span className="text-slate-600 font-sans text-[11px]">{k}</span>
                <span className={`font-bold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {v >= 0 ? '+' : ''}{v.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
