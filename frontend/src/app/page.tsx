"use client";

import React, { useState } from 'react';
import { useMarketStream } from '@/hooks/useMarketStream';
import Chart from '@/components/Chart';
import DOMLadder from '@/components/DOMLadder';
import MetricsHUD from '@/components/MetricsHUD';
import SignalPanel from '@/components/SignalPanel';
import RiskPanel from '@/components/RiskPanel';
import EventFeed from '@/components/EventFeed';
import ReplayControls from '@/components/ReplayControls';
import BacktestPanel from '@/components/BacktestPanel';
import ModelMonitor from '@/components/ModelMonitor';
import AIAnalystPanel from '@/components/AIAnalystPanel';
import { Activity, Wifi, WifiOff, Coins } from 'lucide-react';

export default function TerminalPage() {
  const {
    symbol,
    mode,
    isConnected,
    latencyMs,
    feed,
    recentEvents,
    setSymbol,
    setMode
  } = useMarketStream();

  const [activeBottomTab, setActiveBottomTab] = useState<'events' | 'backtest' | 'model' | 'ai'>('events');

  return (
    <main className="flex flex-col h-screen w-screen bg-slate-100 text-slate-900 overflow-hidden font-sans select-none">
      {/* CLEAN WHITE & BLUE HEADER */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h1 className="text-base font-extrabold tracking-tight text-slate-900">
              LIQUIDITY<span className="text-blue-600">PULSE</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-1.5 bg-blue-50 border border-blue-200 px-3 py-1 rounded-md text-xs font-medium text-blue-700">
            <Coins className="w-3.5 h-3.5 text-blue-600" />
            <span>Crypto Perpetual Futures (Binance Live Stream)</span>
          </div>
        </div>

        {/* SYMBOL SELECTOR & STATUS */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'].map((sym) => (
              <button
                key={sym}
                onClick={() => setSymbol(sym)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  symbol === sym
                    ? 'bg-blue-600 text-white shadow font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* STATUS PILL */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-slate-50 border border-slate-200 font-mono">
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold text-[11px]">LIVE CONNECTED</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-red-600 font-bold text-[11px]">RECONNECTING</span>
                </>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              LATENCY: <span className="font-bold text-slate-800">{latencyMs}ms</span>
            </div>
          </div>
        </div>
      </header>

      {/* REPLAY CONTROL STRIP */}
      <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-200 shrink-0">
        <ReplayControls mode={mode} onModeChange={setMode} />
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 grid grid-cols-12 gap-2.5 p-2.5 overflow-hidden min-h-0">
        {/* LEFT CHART PANEL (6 COLS -> 50%) */}
        <div className="col-span-6 flex flex-col h-full overflow-hidden">
          <Chart
            symbol={symbol}
            currentPrice={feed?.price || 0}
            candleData={feed?.candle}
            events={feed?.events}
          />
        </div>

        {/* CENTER DOM LADDER (3 COLS -> 25%) */}
        <div className="col-span-3 flex flex-col h-full overflow-hidden">
          <DOMLadder orderbook={feed?.orderbook} />
        </div>

        {/* RIGHT METRICS & SIGNALS (3 COLS -> 25%) */}
        <div className="col-span-3 flex flex-col space-y-2.5 h-full overflow-y-auto">
          <MetricsHUD metrics={feed?.metrics} />
          <SignalPanel signal={feed?.signal} prediction={feed?.prediction} />
          <RiskPanel risk={feed?.risk} />
        </div>
      </div>

      {/* BOTTOM DOCK */}
      <div className="h-56 border-t border-slate-200 bg-white flex flex-col shrink-0 shadow-inner">
        {/* TAB BAR */}
        <div className="flex items-center space-x-1 px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveBottomTab('events')}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              activeBottomTab === 'events'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            ANOMALY EVENT FEED ({recentEvents.length})
          </button>

          <button
            onClick={() => setActiveBottomTab('backtest')}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              activeBottomTab === 'backtest'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            STRATEGY BACKTESTER
          </button>

          <button
            onClick={() => setActiveBottomTab('model')}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              activeBottomTab === 'model'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            ONNX MODEL MONITOR
          </button>

          <button
            onClick={() => setActiveBottomTab('ai')}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              activeBottomTab === 'ai'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            QUANT AI ANALYST
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 p-2 overflow-hidden bg-slate-50/50">
          {activeBottomTab === 'events' && <EventFeed events={recentEvents} />}
          {activeBottomTab === 'backtest' && <BacktestPanel symbol={symbol} />}
          {activeBottomTab === 'model' && <ModelMonitor prediction={feed?.prediction} />}
          {activeBottomTab === 'ai' && <AIAnalystPanel feed={feed} />}
        </div>
      </div>
    </main>
  );
}
