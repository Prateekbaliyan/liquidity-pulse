"use client";

import React, { useState } from 'react';

interface ReplayControlsProps {
  mode: 'LIVE' | 'REPLAY';
  onModeChange: (mode: 'LIVE' | 'REPLAY') => void;
}

export default function ReplayControls({ mode, onModeChange }: ReplayControlsProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [progress, setProgress] = useState<number>(15);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 font-sans text-xs shadow-sm">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onModeChange(mode === 'LIVE' ? 'REPLAY' : 'LIVE')}
          className={`px-3 py-1 rounded-md font-bold transition-colors text-xs ${
            mode === 'REPLAY'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          {mode === 'REPLAY' ? 'REPLAY MODE' : 'LIVE STREAM'}
        </button>

        {mode === 'REPLAY' && (
          <button
            onClick={togglePlay}
            className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-md text-xs transition-colors shadow-sm"
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
        )}
      </div>

      {mode === 'REPLAY' && (
        <div className="flex items-center space-x-3 flex-1 mx-4">
          <span className="text-xs text-slate-500 font-medium">SEEK:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded cursor-pointer"
          />
          <span className="text-xs text-slate-700 font-bold font-mono">{progress}%</span>
        </div>
      )}

      {mode === 'REPLAY' && (
        <div className="flex items-center space-x-1">
          <span className="text-xs text-slate-500 mr-1 font-medium">SPEED:</span>
          {[0.25, 0.5, 1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                speed === s
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
