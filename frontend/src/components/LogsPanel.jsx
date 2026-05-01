import React, { useEffect, useRef } from 'react';
import { Terminal, CheckCircle2, AlertCircle, Info, Activity } from 'lucide-react';

const LogsPanel = ({ logs }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={12} className="text-emerald-400" />;
      case 'error': return <AlertCircle size={12} className="text-red-400" />;
      case 'info': return <Info size={12} className="text-blue-400" />;
      case 'loading': return <Activity size={12} className="text-cyan-400 animate-spin" />;
      default: return <Terminal size={12} className="text-gray-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/40 border-t border-white/5 overflow-hidden">
      <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5 bg-white/[0.02]">
        <Terminal size={14} className="text-gray-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
          Agent Logs
        </span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-2 scrollbar-thin"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 italic">
            Waiting for agent activity...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-3 animate-fade-in">
              <span className="text-gray-700 shrink-0 select-none">[{log.time}]</span>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">{getIcon(log.type)}</span>
                <span className={log.type === 'error' ? 'text-red-400' : 'text-gray-300'}>
                  {log.message}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogsPanel;
