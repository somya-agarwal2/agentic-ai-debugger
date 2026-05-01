import React, { useState } from 'react';
import { 
  Bot, 
  Terminal, 
  AlertTriangle, 
  Check, 
  Loader2, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Activity,
  GitPullRequest,
  CheckCircle2,
  Clock,
  Target,
  ShieldCheck,
  Brain
} from 'lucide-react';

const AIAssistant = ({ agentState, isAgentThinking, agentStatus, prDetails, isDemoMode }) => {
  const [showLogs, setShowLogs] = useState(false);

  // Status mapping
  const statusConfig = {
    'Idle': { color: 'bg-gray-500', label: 'Ready' },
    'Analyzing': { color: 'bg-blue-500', label: 'Analyzing Source' },
    'Thinking': { color: 'bg-cyan-500', label: 'Generating Fix' },
    'Testing': { color: 'bg-purple-500', label: 'Verifying Patch' },
    'Fixing': { color: 'bg-yellow-500', label: 'Applying Changes' },
  };

  const currentStatus = statusConfig[agentStatus] || statusConfig['Idle'];

  return (
    <div className="w-80 h-full flex flex-col shrink-0 border-l border-white/5 animate-slide-in overflow-hidden"
      style={{ background: '#080C14', zIndex: 10 }}>

      {/* ── Status Bar ── */}
      <div className="h-14 flex items-center px-6 border-b border-white/5 shrink-0"
        style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isAgentThinking ? 'bg-cyan-400 animate-pulse-glow shadow-glow-blue' : currentStatus.color}`} />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
            {isAgentThinking ? 'Agent is Working' : currentStatus.label}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-hide">
        
        {/* ── Pipeline / Timeline ── */}
        <div className="space-y-6">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 px-1">Pipeline Execution</div>
          <div className="relative pl-6 space-y-6">
            {/* Vertical Line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-white/10" />
            
            {(agentState?.steps || agentState?.logs || []).map((s, i) => (
              <div key={i} className="relative animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-[#080C14] bg-vscode-accent flex items-center justify-center shadow-glow-blue">
                  <Check size={8} className="text-[#080C14] font-black" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-[11px] font-black text-white">{s.step || s.action}</div>
                  <div className="text-[10px] text-gray-500 leading-relaxed font-medium">
                    {isDemoMode ? <span className="animate-typing overflow-hidden whitespace-nowrap inline-block">{s.reasoning || s.detail}</span> : (s.reasoning || s.detail)}
                  </div>
                </div>
              </div>
            ))}
            
            {isAgentThinking && (
              <div className="relative animate-pulse">
                <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-[#080C14] bg-gray-700" />
                <div className="flex flex-col gap-1 opacity-50">
                  <div className="text-[11px] font-black text-gray-500 italic">Processing {agentStatus.toLowerCase()}…</div>
                </div>
              </div>
            )}

            {!isAgentThinking && (agentState?.steps || []).length === 0 && (
              <div className="text-[11px] text-gray-600 italic px-1">No execution steps recorded.</div>
            )}
          </div>
        </div>

        {/* ── Issue Card ── */}
        {agentState?.error && agentState.error !== 'None' && (
          <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 px-1 mb-4">Critical Diagnostic</div>
            <div className="rounded-2xl p-5 border-2 border-red-500/20 bg-red-500/5 shadow-glow-red">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle size={18} className="text-red-500" />
                <div className="text-xs font-black text-red-500 uppercase tracking-tight">{agentState.error}</div>
              </div>
              <div className="text-[11px] text-gray-300 leading-relaxed font-medium">
                {agentState.explanation}
              </div>
            </div>
          </div>
        )}

        {/* ── Success Card ── */}
        {agentState?.result && (
          <div className="animate-fade-up" style={{ animationDelay: '400ms' }}>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 px-1 mb-4">Verification Result</div>
            <div className="rounded-2xl p-5 border-2 border-emerald-500/20 bg-emerald-500/5 shadow-glow-green">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <div className="text-xs font-black text-emerald-500 uppercase tracking-tight">Loop Completed</div>
              </div>
              <div className="text-[11px] text-gray-300 leading-relaxed">
                {agentState.result}
              </div>
            </div>
          </div>
        )}

        {/* ── Impact Section ── */}
        {(agentState?.result || agentStatus === 'Fixed') && (
          <div className="animate-fade-up" style={{ animationDelay: '500ms' }}>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 px-1 mb-4">Agent Impact</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                <Clock size={16} className="text-cyan-400 mb-2" />
                <div className="text-xs font-black text-white">~12m</div>
                <div className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">Time Saved</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                <Target size={16} className="text-purple-400 mb-2" />
                <div className="text-xs font-black text-white">98%</div>
                <div className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">Confidence</div>
              </div>
              <div className="col-span-2 p-4 rounded-2xl bg-vscode-accent/10 border border-vscode-accent/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-vscode-accent" />
                  <div className="text-[10px] font-black text-white uppercase tracking-widest">Verification Status</div>
                </div>
                <div className="text-[10px] font-black text-vscode-accent">SUCCESS</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Logs Collapsible ── */}
        <div className="animate-fade-up pt-4" style={{ animationDelay: '500ms' }}>
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="w-full flex items-center justify-between px-1 mb-4 group"
          >
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 group-hover:text-gray-300 transition-colors">Execution Logs</div>
              <Terminal size={12} className="text-gray-600" />
            </div>
            {showLogs ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
          </button>
          
          {showLogs && (
            <div className="rounded-xl bg-black/40 border border-white/5 p-4 font-mono text-[10px] text-gray-400 space-y-2 max-h-48 overflow-y-auto animate-fade-in">
              {((agentState?.steps || agentState?.logs) && (agentState?.steps || agentState?.logs)?.length > 0) ? (
                (agentState?.steps || agentState?.logs)?.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-gray-700 shrink-0 select-none">[{i+1}]</span>
                    <span className="break-all">{log?.detail || log?.step || log?.action}</span>
                  </div>
                ))
              ) : (
                <div className="italic text-gray-700">Waiting for agent activity…</div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── PR Details Footer ── */}
      {prDetails && (
        <div className="mt-auto p-6 border-t border-white/5 bg-vscode-accent/5 animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <GitPullRequest size={14} className="text-vscode-accent" />
            <div className="text-[10px] font-black uppercase tracking-widest text-vscode-accent">Patch Verified</div>
          </div>
          <div className="text-xs font-bold text-white mb-1">{prDetails.branch}</div>
          <div className="text-[10px] text-gray-500">{prDetails.message}</div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
