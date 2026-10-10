"use client";

import React from 'react';
import { OrderBookData } from '@/hooks/useMarketStream';

interface DOMLadderProps {
  orderbook?: OrderBookData;
}

export default function DOMLadder({ orderbook }: DOMLadderProps) {
  if (!orderbook || (!orderbook.bids.length && !orderbook.asks.length)) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white border border-slate-200 rounded-xl p-4 text-slate-400 text-xs shadow-sm">
        Connecting to Order Book Stream...
      </div>
    );
  }

  const bids = orderbook.bids.slice(0, 10);
  const asks = orderbook.asks.slice(0, 10).reverse();

  const maxBidVol = Math.max(...bids.map((b) => b[1]), 1.0);
  const maxAskVol = Math.max(...asks.map((a) => a[1]), 1.0);
  const maxVol = Math.max(maxBidVol, maxAskVol);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 font-sans">
        <span className="font-bold text-slate-800 text-xs uppercase tracking-wide">DOM ORDERBOOK</span>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500">Spread:</span>
          <span className="text-blue-700 font-bold font-mono">${orderbook.spread.toFixed(2)}</span>
          <span className="text-slate-400 font-mono">({orderbook.spread_bps.toFixed(2)} bps)</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between overflow-y-auto divide-y divide-slate-100">
        {/* ASKS (RED) */}
        <div className="flex flex-col space-y-0.5 p-1 bg-red-50/40">
          {asks.map(([price, size], i) => {
            const widthPct = Math.min(100, (size / maxVol) * 100);
            const isWall = size > maxAskVol * 0.7;
            return (
              <div key={`ask-${i}`} className="relative flex items-center justify-between h-5 px-2 rounded overflow-hidden">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-red-200/50 transition-all duration-150"
                  style={{ width: `${widthPct}%` }}
                />
                <span className="relative z-10 text-red-700 font-bold font-mono">${price.toFixed(2)}</span>
                <div className="relative z-10 flex items-center space-x-1 font-mono">
                  {isWall && (
                    <span className="text-[9px] bg-red-600 text-white font-sans font-bold px-1 rounded">WALL</span>
                  )}
                  <span className="text-slate-700 font-semibold">{size.toFixed(3)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MID PRICE SPREAD BAR */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-y border-slate-200 font-sans">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">INSIDE SPREAD</span>
          <span className="text-xs text-blue-700 font-bold font-mono">${orderbook.spread.toFixed(2)}</span>
        </div>

        {/* BIDS (GREEN) */}
        <div className="flex flex-col space-y-0.5 p-1 bg-emerald-50/40">
          {bids.map(([price, size], i) => {
            const widthPct = Math.min(100, (size / maxVol) * 100);
            const isWall = size > maxBidVol * 0.7;
            return (
              <div key={`bid-${i}`} className="relative flex items-center justify-between h-5 px-2 rounded overflow-hidden">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-200/50 transition-all duration-150"
                  style={{ width: `${widthPct}%` }}
                />
                <span className="relative z-10 text-emerald-700 font-bold font-mono">${price.toFixed(2)}</span>
                <div className="relative z-10 flex items-center space-x-1 font-mono">
                  {isWall && (
                    <span className="text-[9px] bg-emerald-600 text-white font-sans font-bold px-1 rounded">WALL</span>
                  )}
                  <span className="text-slate-700 font-semibold">{size.toFixed(3)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
