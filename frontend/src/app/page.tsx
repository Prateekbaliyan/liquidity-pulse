"use client";

import React, { useState } from 'react';
import { useMarketStream, isIndianStock, INDIAN_STOCKS, CRYPTO_SYMBOLS } from '@/hooks/useMarketStream';
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
import { Activity, Wifi, Coins, TrendingUp } from 'lucide-react';

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
  const [marketTab, setMarketTab] = useState<'NSE' | 'CRYPTO'>('NSE');

  const isIndian = isIndianStock(symbol);
  const currency = isIndian ? '₹' : '$';

  return (
    <main className="flex flex-col h-screen w-screen bg-slate-100 text-slate-900 overflow-hidden font-sans select-none">
      {/* CLEAN WHITE & BLUE HEADER */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h1 className="text-base font-extrabold tracking-tight text-slate-900">
              LIQUIDITY<span className="text-blue-600">PULSE</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-semibold text-blue-800">
            {isIndian ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>🇮🇳 NSE India Live L2 Depth (Nifty 50 Leaders)</span>
              </>
            ) : (
              <>
                <Coins className="w-3.5 h-3.5 text-blue-600" />
                <span>🌐 Crypto Perpetual Futures (Binance Stream)</span>
              </>
            )}
          </div>
        </div>

        {/* MARKET SELECTOR & SYMBOL PILLS */}
        <div className="flex items-center space-x-3">
          {/* MARKET SWITCHER */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
            <button
              onClick={() => {
                setMarketTab('NSE');
                setSymbol('RELIANCE');
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                marketTab === 'NSE'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇮🇳 NSE EQUITIES</span>
            </button>
            <button
              onClick={() => {
                setMarketTab('CRYPTO');
                setSymbol('BTCUSDT');
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                marketTab === 'CRYPTO'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🌐 CRYPTO</span>
            </button>
          </div>

          {/* ACTIVE SYMBOL SELECTOR */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto max-w-[480px]">
            {marketTab === 'NSE'
              ? INDIAN_STOCKS.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => setSymbol(item.symbol)}
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                      symbol === item.symbol
                        ? 'bg-blue-600 text-white shadow font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {item.symbol}
                  </button>
                ))
              : CRYPTO_SYMBOLS.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => setSymbol(item.symbol)}
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                      symbol === item.symbol
                        ? 'bg-blue-600 text-white shadow font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {item.symbol}
                  </button>
                ))}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* STATUS PILL */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 font-mono">
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold text-[11px]">LIVE WS CONNECTED</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                  <span className="text-blue-700 font-bold text-[11px]">QUANT ENGINE ACTIVE</span>
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
          <DOMLadder
            orderbook={feed?.orderbook}
            currency={currency}
            isIndian={isIndian}
          />
        </div>

        {/* RIGHT METRICS & SIGNALS (3 COLS -> 25%) */}
        <div className="col-span-3 flex flex-col justify-between h-full overflow-hidden gap-1.5">
          <MetricsHUD metrics={feed?.metrics} currency={currency} />
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
        <div className="flex-1 overflow-y-auto p-3">
          {activeBottomTab === 'events' && <EventFeed events={recentEvents} />}
          {activeBottomTab === 'backtest' && <BacktestPanel symbol={symbol} />}
          {activeBottomTab === 'model' && <ModelMonitor prediction={feed?.prediction} />}
          {activeBottomTab === 'ai' && <AIAnalystPanel feed={feed} />}
        </div>
      </div>
    </main>
  );
}
