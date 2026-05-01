import React from 'react';
import { X, Check, ArrowRight } from 'lucide-react';

const DiffViewer = ({ original, modified, onApply, onReject }) => {
  const getLines = (text) => text.split('\n');
  const oldLines = getLines(original);
  const newLines = getLines(modified);

  return (
    <div className="flex flex-col h-full glass-panel overflow-hidden border border-white/10 rounded-2xl animate-fade-in shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-[10px] font-black uppercase tracking-widest text-cyan-400 shadow-glow-blue">
            Review Changes
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all active:scale-95"
          >
            <X size={14} /> Reject
          </button>
          <button
            onClick={onApply}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-cyan-500 shadow-glow-blue text-white text-xs font-bold hover:opacity-90 transition-all active:scale-95"
          >
            <Check size={14} /> Apply Fix
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden font-mono text-[13px] leading-relaxed">
        {/* Left Side: Original */}
        <div className="flex-1 overflow-auto border-r border-white/5 bg-red-500/[0.02]">
          <div className="p-4 space-y-0.5">
            {oldLines.map((line, i) => {
              const isChanged = line !== newLines[i];
              return (
                <div key={i} className={`flex gap-4 px-2 ${isChanged ? 'bg-red-500/20 text-red-200' : 'text-gray-500'}`}>
                  <span className="w-8 shrink-0 text-right opacity-30 select-none">{i + 1}</span>
                  <span className="truncate">{line || ' '}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Modified */}
        <div className="flex-1 overflow-auto bg-green-500/[0.02]">
          <div className="p-4 space-y-0.5">
            {newLines.map((line, i) => {
              const isChanged = line !== oldLines[i];
              return (
                <div key={i} className={`flex gap-4 px-2 ${isChanged ? 'bg-green-500/20 text-green-200' : 'text-gray-400'}`}>
                  <span className="w-8 shrink-0 text-right opacity-30 select-none">{i + 1}</span>
                  <span className="truncate">{line || ' '}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;
