"use client";

import React, { useState } from 'react';
import { MarketFeedMessage } from '@/hooks/useMarketStream';

interface AIAnalystPanelProps {
  feed: MarketFeedMessage | null;
}

export default function AIAnalystPanel({ feed }: AIAnalystPanelProps) {
  const [analysis, setAnalysis] = useState<{
    observed: string[];
    modelOutput: string[];
    interpretation: string[];
  } | null>(null);

  const generateAnalysis = () => {
    if (!feed) return;

    const obiPct = (feed.metrics.obi * 100).toFixed(1);
    const cvdVal = feed.metrics.cvd_1m.toFixed(2);
    const microDiv = feed.metrics.micro_mid_divergence.toFixed(3);
    const sigDir = feed.signal.direction;
    const sigStr = (feed.signal.strength * 100).toFixed(0);
    const mlDir = feed.prediction.direction;
    const mlConf = feed.prediction.confidence.toFixed(1);

    const observed = [
      `Order Book Imbalance (OBI): ${obiPct}% across top 10 levels.`,
      `1m Cumulative Volume Delta (CVD): ${cvdVal} units.`,
      `Stoikov Micro-Price Divergence: ${microDiv} relative to mid price ($${feed.price.toFixed(2)}).`,
      `Active Anomaly Events Detected: ${feed.events.length} in current sliding window.`
    ];

    const modelOutput = [
      `ONNX Multiclass Prediction: ${mlDir} with ${mlConf}% confidence.`,
      `Signal Fusion Output: ${sigDir} (Strength: ${sigStr}%).`,
      `Risk Assessment Level: ${feed.risk.level} with estimated slippage ${feed.risk.slippage_est_bps.toFixed(2)} bps.`
    ];

    const interpretation = [
      sigDir === 'LONG'
        ? `Order flow dynamics indicate positive bid-side liquidity imbalance and taker buy volume expansion, suggesting potential upward price momentum.`
        : sigDir === 'SHORT'
        ? `Order flow dynamics indicate ask-side depth dominance and taker sell volume pressure, suggesting potential downside market vulnerability.`
        : `Order flow metrics demonstrate balanced bid/ask depth and neutral taker volume delta, indicating range-bound consolidation.`,
      `Microstructure anomaly engines report strictly probabilistic patterns (anomalous order flow / potential sweep activity). No deterministic claims of institutional intent are inferred.`
    ];

    setAnalysis({ observed, modelOutput, interpretation });
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-3 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">QUANTITATIVE AI ANALYST</span>
          <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-bold px-2 py-0.5 rounded">
            STRUCTURED REASONING
          </span>
        </div>
        <button
          onClick={generateAnalysis}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-md transition-colors shadow-sm"
        >
          ANALYZE STATE
        </button>
      </div>

      {analysis ? (
        <div className="flex flex-col space-y-2.5 overflow-y-auto text-xs flex-1">
          {/* OBSERVED SECTION */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="text-[10px] text-blue-700 font-bold bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200 inline-block mb-1.5">
              [OBSERVED METRICS]
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-700 font-mono text-[11px]">
              {analysis.observed.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* MODEL OUTPUT SECTION */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200 inline-block mb-1.5">
              [MODEL OUTPUT]
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-700 font-mono text-[11px]">
              {analysis.modelOutput.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* INTERPRETATION SECTION */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="text-[10px] text-purple-700 font-bold bg-purple-100/80 px-2 py-0.5 rounded border border-purple-200 inline-block mb-1.5">
              [PROBABILISTIC INTERPRETATION]
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              {analysis.interpretation.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 text-xs py-8">
          Click &quot;ANALYZE STATE&quot; to perform structured quantitative reasoning over real-time market state.
        </div>
      )}
    </div>
  );
}
