"use client";

import React, { useState } from 'react';

interface BacktestSummary {
  total_return_pct: number;
  win_rate_pct: number;
  profit_factor: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  total_trades: number;
}

interface EquityPoint {
  timestamp: number;
  equity: number;
}

export default function BacktestPanel({ symbol }: { symbol: string }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<BacktestSummary | null>(null);
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          initial_capital: 10000.0,
          order_size: 0.1,
          fee_rate: 0.0005,
          latency_ms: 25.0,
          signal_threshold: 0.65
        })
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setEquityCurve(data.equity_curve || []);
      }
    } catch (e) {
      console.error("Backtest execution failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">STRATEGY BACKTESTING ENGINE</span>
        <button
          onClick={runBacktest}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-md transition-colors shadow-sm"
        >
          {loading ? 'RUNNING...' : 'EXECUTE BACKTEST'}
        </button>
      </div>

      {summary ? (
        <div className="flex flex-col space-y-3 flex-1 overflow-y-auto">
          {/* METRICS GRID */}
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
              <span className="text-slate-500 font-sans font-bold text-[10px]">TOTAL RETURN</span>
              <div className={`text-sm font-bold mt-0.5 ${summary.total_return_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {summary.total_return_pct >= 0 ? '+' : ''}{summary.total_return_pct.toFixed(2)}%
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
              <span className="text-slate-500 font-sans font-bold text-[10px]">WIN RATE</span>
              <div className="text-sm font-bold text-blue-700 mt-0.5">{summary.win_rate_pct.toFixed(1)}%</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
              <span className="text-slate-500 font-sans font-bold text-[10px]">PROFIT FACTOR</span>
              <div className="text-sm font-bold text-amber-700 mt-0.5">{summary.profit_factor.toFixed(2)}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
              <span className="text-slate-500 font-sans font-bold text-[10px]">SHARPE RATIO</span>
              <div className="text-sm font-bold text-purple-700 mt-0.5">{summary.sharpe_ratio.toFixed(2)}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
              <span className="text-slate-500 font-sans font-bold text-[10px]">SORTINO RATIO</span>
              <div className="text-sm font-bold text-indigo-700 mt-0.5">{summary.sortino_ratio.toFixed(2)}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
              <span className="text-slate-500 font-sans font-bold text-[10px]">MAX DRAWDOWN</span>
              <div className="text-sm font-bold text-red-600 mt-0.5">-{summary.max_drawdown_pct.toFixed(2)}%</div>
            </div>
          </div>

          {/* SVG EQUITY CURVE */}
          {equityCurve.length > 1 && (
            <div className="flex flex-col bg-slate-50 border border-slate-200 p-2 rounded-lg flex-1">
              <span className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wide">EQUITY CURVE ($10,000 BASE)</span>
              <div className="relative h-28 w-full">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                  {(() => {
                    const minEq = Math.min(...equityCurve.map(e => e.equity));
                    const maxEq = Math.max(...equityCurve.map(e => e.equity));
                    const range = Math.max(1, maxEq - minEq);
                    const points = equityCurve.map((e, idx) => {
                      const x = (idx / (equityCurve.length - 1)) * 100;
                      const y = 50 - ((e.equity - minEq) / range) * 45 - 2;
                      return `${x},${y}`;
                    }).join(" ");
                    return (
                      <polyline
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2"
                        points={points}
                      />
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 text-xs py-8">
          Click &quot;EXECUTE BACKTEST&quot; to run historical strategy simulation.
        </div>
      )}
    </div>
  );
}
