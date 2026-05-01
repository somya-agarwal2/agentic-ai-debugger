import React from 'react';
import { Search, Code2, AlertTriangle, Lightbulb, Wrench, CheckCircle, ShieldCheck, GitPullRequest } from 'lucide-react';

const STEPS = [
  { id: 'scan', label: 'Scanning Repository', icon: Search },
  { id: 'analyze', label: 'Analyzing Codebase', icon: Code2 },
  { id: 'detect', label: 'Detecting Anomalies', icon: AlertTriangle },
  { id: 'reason', label: 'Reasoning Logic', icon: Lightbulb },
  { id: 'generate', label: 'Generating Correction', icon: Wrench },
  { id: 'apply', label: 'Applying Fix', icon: CheckCircle },
  { id: 'verify', label: 'Verifying Results', icon: ShieldCheck },
  { id: 'pr', label: 'Preparing PR', icon: GitPullRequest },
];

const AgentPipeline = ({ currentStepId, status, explanation }) => {
  const currentIndex = STEPS.findIndex(s => s.id === currentStepId);

  return (
    <div className="flex flex-col gap-4 p-5 glass-panel rounded-3xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
          Agentic Pipeline
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-vscode-accent animate-pulse shadow-glow-blue" />
          <span className="text-[9px] font-bold text-vscode-accent uppercase tracking-widest">
            {status || 'Idle'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div 
              key={step.id} 
              className={`flex items-center gap-4 transition-all duration-500 ${
                isActive ? 'scale-105' : 'scale-100'
              } ${isPending ? 'opacity-30' : 'opacity-100'}`}
            >
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-500 ${
                isActive 
                  ? 'bg-vscode-accent/20 border-vscode-accent shadow-glow-blue' 
                  : isCompleted 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-white/5 border-white/10'
              }`}>
                <Icon size={14} className={isActive ? 'text-vscode-accent' : isCompleted ? 'text-green-500' : 'text-gray-600'} />
                {isCompleted && (
                  <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-lg">
                    <CheckCircle size={8} className="text-black" />
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <span className={`text-[11px] font-bold tracking-tight ${
                  isActive ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {step.label}
                </span>
                {isActive && ['reason', 'scan', 'analyze'].includes(step.id) && explanation && (
                  <span className="text-[9px] text-vscode-accent/80 font-medium animate-fade-in">
                    ↳ {explanation}
                  </span>
                )}
              </div>

              {isActive && (
                <div className="ml-auto">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-vscode-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 bg-vscode-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 bg-vscode-accent rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentPipeline;
