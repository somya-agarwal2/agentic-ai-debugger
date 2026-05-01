import React from 'react';
import { AlertCircle, FileCode2, ChevronRight, CheckCircle2 } from 'lucide-react';

const IssuesPanel = ({ issues, onIssueClick, selectedIssueId, isAnalyzing, progress }) => {
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            Detected Issues ({issues.length})
          </span>
        </div>
        {isAnalyzing && (
          <div className="flex items-center gap-2">
             <div className="text-[9px] font-bold text-cyan-400 animate-pulse">
                {progress}%
             </div>
             <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                />
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {Array.isArray(issues) && issues.length > 0 ? (
          issues.map((issue, index) => (
            <div
              key={issue?.id || Math.random()}
              data-testid={`issue-card-${index}`}
              onClick={() => {
                if (!issue) return;
                onIssueClick(issue);
              }}
              className={`issue-item group flex flex-col p-3 rounded-xl cursor-pointer transition-all border relative ${
                selectedIssueId === issue?.fileId 
                  ? 'bg-red-500/10 border-red-500/20 shadow-glow-red' 
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
              }`}
            >
              {/* Decision Sequence Badge */}
              <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md bg-cyan-500 flex items-center justify-center text-[9px] font-black text-black shadow-glow-blue z-10">
                {index + 1}
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <FileCode2 size={12} className="text-gray-500 group-hover:text-red-400 transition-colors" />
                <span className="text-[11px] font-black text-gray-200 truncate flex-1">
                  {issue?.fileName || "Unknown File"}
                </span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest ${
                  issue?.severity === 'High' ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30' :
                  issue?.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {issue?.severity || 'Med'}
                </span>
                <ChevronRight size={12} className={`text-gray-700 group-hover:text-red-400 transition-all ${selectedIssueId === issue?.fileId ? 'translate-x-0.5 text-red-400' : ''}`} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[8px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded border border-white/5 font-bold uppercase tracking-widest">
                  {issue?.category || 'Logic'}
                </span>
                {issue?.priority_reason && (
                  <span className="text-[8px] text-gray-600 font-bold italic">
                    Reason: {issue.priority_reason}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed font-medium">
                {issue?.error || "Detected issue"}
              </p>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            {isAnalyzing ? (
              <>
                <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mb-3" />
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Analyzing Repository...</p>
              </>
            ) : (
              <>
                <CheckCircle2 size={24} className="text-gray-700 mb-2" />
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">No issues found</p>
                <p className="text-[9px] text-gray-600 mt-1">Run repository analysis to scan for bugs.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IssuesPanel;
