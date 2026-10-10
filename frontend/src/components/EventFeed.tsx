"use client";

import React from 'react';
import { AnomalyEvent } from '@/hooks/useMarketStream';

interface EventFeedProps {
  events: AnomalyEvent[];
}

export default function EventFeed({ events }: EventFeedProps) {
  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">ANOMALY EVENT FEED</span>
          <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded font-bold animate-pulse">
            LIVE MONITOR
          </span>
        </div>
        <span className="text-xs text-slate-500 font-medium">{events.length} detected</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs py-8">
            Monitoring orderbook & trade streams for microstructure anomalies...
          </div>
        ) : (
          events.map((evt) => {
            const timeStr = new Date(evt.timestamp).toLocaleTimeString();
            const badgeColor =
              evt.type === 'LIQUIDITY_SWEEP'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : evt.type === 'FAKEOUT'
                ? 'bg-purple-100 text-purple-800 border-purple-300'
                : evt.type === 'POTENTIAL_ICEBERG'
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-red-100 text-red-800 border-red-300';

            const sideBg =
              evt.side === 'BID'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : evt.side === 'ASK'
                ? 'bg-red-100 text-red-800 border-red-300'
                : 'bg-slate-100 text-slate-700';

            return (
              <div
                key={evt.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs flex flex-col space-y-1 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                      {evt.type}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sideBg}`}>
                      {evt.side}
                    </span>
                    <span className="text-slate-800 font-bold font-mono">${evt.price.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
                </div>
                <p className="text-xs text-slate-600 leading-tight">{evt.details}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
