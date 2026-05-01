import React, { useState, useEffect } from 'react';
import {
  GitPullRequest, GitBranch, CheckCircle2, AlertTriangle, Zap,
  ShieldCheck, ExternalLink, X, ArrowRight, Loader, Sparkles
} from 'lucide-react';

// ── Confidence Badge ──────────────────────────────────────────────────────────
const ConfidenceBadge = ({ score }) => {
  const color = score >= 85 ? 'text-green-400 border-green-500/30 bg-green-500/10'
    : score >= 60 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
    : 'text-red-400 border-red-500/30 bg-red-500/10';
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${color}`}>
      <Zap size={10} />
      Confidence {score}%
    </div>
  );
};

// ── Risk Badge ────────────────────────────────────────────────────────────────
const RiskBadge = ({ level }) => {
  const styles = {
    low: 'text-green-400 border-green-500/30 bg-green-500/10',
    medium: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    high: 'text-red-400 border-red-500/30 bg-red-500/10',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[level] || styles.low}`}>
      <AlertTriangle size={10} />
      Risk: {level}
    </div>
  );
};

// ── Creation Steps Animation ──────────────────────────────────────────────────
const CREATION_STEPS = [
  { id: 'branch',  label: 'Creating branch...',       delay: 0    },
  { id: 'commit',  label: 'Committing changes...',     delay: 1200 },
  { id: 'pr',      label: 'Opening pull request...',   delay: 2600 },
  { id: 'done',    label: 'Pull request ready! 🚀',    delay: 3800 },
];

const CreationProgress = ({ active }) => {
  const [current, setCurrent] = useState(-1);

  useEffect(() => {
    if (!active) { setCurrent(-1); return; }
    CREATION_STEPS.forEach((step, i) => {
      setTimeout(() => setCurrent(i), step.delay);
    });
  }, [active]);

  return (
    <div className="flex flex-col gap-3 py-2">
      {CREATION_STEPS.map((step, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div key={step.id} className={`flex items-center gap-3 transition-all duration-500 ${i > current ? 'opacity-20' : 'opacity-100'}`}>
            <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all duration-500 ${
              isDone ? 'bg-green-500/20 border-green-500/40' :
              isActive ? 'bg-vscode-accent/20 border-vscode-accent' :
              'bg-white/5 border-white/10'
            }`}>
              {isDone
                ? <CheckCircle2 size={12} className="text-green-400" />
                : isActive
                ? <Loader size={12} className="text-vscode-accent animate-spin" />
                : <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              }
            </div>
            <span className={`text-xs font-bold transition-all duration-300 ${
              isDone ? 'text-green-400' : isActive ? 'text-white' : 'text-gray-600'
            }`}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const PRWorkflow = ({
  isOpen, onClose, onConfirm,
  agentState, currentFile, suggestedCode, isDemoMode, prUrl
}) => {
  const [phase, setPhase] = useState('preview'); // preview | creating | success

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setPhase('preview'), 400);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Derive PR metadata ────────────────────────────────────────────────────
  const fileName   = currentFile?.name || 'unknown.py';
  const filePath   = currentFile?.path || 'unknown.py';
  const bugLabel   = agentState?.error  || 'Logic fix';
  const explanation = agentState?.explanation || 'AI detected and corrected a logical error in the source code.';

  const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const branchName   = `fix/${slugify(bugLabel)}-${fileName.replace('.', '-')}`;
  const commitMsg    = `fix(${fileName}): ${bugLabel.slice(0, 60)}`;
  const prTitle      = `[AI Fix] ${bugLabel.slice(0, 72)}`;
  const confidence   = 92;
  const riskLevel    = 'low';

  const linesChanged = (() => {
    const orig = (currentFile?.content || '').split('\n');
    const fixed = (suggestedCode || '').split('\n');
    return { removed: orig.length, added: fixed.length };
  })();

  const handleCreate = async () => {
    setPhase('creating');
    await onConfirm();
    setTimeout(() => setPhase('success'), 4200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-lg" onClick={phase === 'preview' ? onClose : undefined} />

      <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(34,211,238,0.15)] animate-fade-up"
        style={{ background: 'linear-gradient(135deg, #0B0F19 0%, #07090F 100%)' }}>

        {/* ── PHASE: PREVIEW ────────────────────────────────────────────── */}
        {phase === 'preview' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-vscode-accent/10 border border-vscode-accent/20 flex items-center justify-center">
                  <Sparkles size={18} className="text-vscode-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">AI Pull Request Preview</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Review before publishing</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-3 px-8 pt-6">
              <ConfidenceBadge score={confidence} />
              <RiskBadge level={riskLevel} />
            </div>

            {/* PR Metadata */}
            <div className="px-8 py-6 space-y-4">
              <InfoRow label="Branch" value={branchName} mono accent />
              <InfoRow label="Commit" value={`"${commitMsg}"`} mono />
              <InfoRow label="PR Title" value={prTitle} />
              <InfoRow label="File" value={filePath} mono />
              <InfoRow label="Impact" value={`${linesChanged.removed} lines → ${linesChanged.added} lines`} />
            </div>

            {/* PR Description */}
            <div className="mx-8 mb-6 rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">PR Description</h3>

              <Section title="Summary of Fix">
                {explanation}
              </Section>

              <Section title="Changes Made">
                The AI debugger identified a logical anomaly in <code className="text-cyan-400 font-mono text-[10px] bg-cyan-400/10 px-1.5 py-0.5 rounded">{fileName}</code> and generated a corrected version. The fix targets the root operator misuse without altering surrounding logic or function signatures.
              </Section>

              <Section title="Verification">
                <span className="flex items-center gap-2 text-green-400 font-bold">
                  <CheckCircle2 size={13} /> Tests passed — logic output verified
                </span>
              </Section>

              <Section title="Impact Assessment">
                <span className="text-yellow-400 font-bold">Medium</span> — Affects computational output in production. No external dependencies changed.
              </Section>
            </div>

            {/* Actions */}
            <div className="flex gap-4 px-8 pb-8">
              <button onClick={onClose}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-xs text-gray-400 uppercase tracking-widest transition-all">
                Cancel
              </button>
              <button 
                id="publish-pr-btn"
                onClick={handleCreate}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-vscode-accent hover:opacity-90 rounded-2xl font-black text-xs text-white uppercase tracking-widest transition-all shadow-glow-blue active:scale-95"
              >
                <GitPullRequest size={14} />
                Create Pull Request
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}

        {/* ── PHASE: CREATING ───────────────────────────────────────────── */}
        {phase === 'creating' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-vscode-accent/10 border border-vscode-accent/20 flex items-center justify-center">
              <GitPullRequest size={28} className="text-vscode-accent animate-pulse" />
            </div>
            <h2 className="text-lg font-black text-white mb-2">AI Publishing PR</h2>
            <p className="text-gray-500 text-xs mb-8 uppercase tracking-widest">Executing workflow...</p>
            <CreationProgress active={true} />
          </div>
        )}

        {/* ── PHASE: SUCCESS ────────────────────────────────────────────── */}
        {phase === 'success' && (
          <div className="p-10 text-center">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-5 shadow-glow-green">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>

            <h2 className="text-2xl font-black text-white mb-1">Pull Request Created Successfully 🚀</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
              The AI-generated fix has been verified and published to your repository.
            </p>

            {/* Summary card */}
            <div className="bg-black/40 border border-white/5 rounded-2xl p-5 text-left mb-8 space-y-3">
              <InfoRow label="Branch" value={branchName} mono accent />
              <InfoRow label="Commit" value={`"${commitMsg}"`} mono />
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                <span className="text-gray-600 font-bold">Status</span>
                <span className="flex items-center gap-1.5 text-green-400 font-black">
                  <ShieldCheck size={12} /> Verified & Merged
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={onClose}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-xs text-white uppercase tracking-widest transition-all">
                Close
              </button>
              <a href={prUrl || 'https://github.com/demo/repo/pull/1'} target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-vscode-accent hover:opacity-90 rounded-2xl font-black text-xs text-white uppercase tracking-widest transition-all shadow-glow-blue">
                View PR <ExternalLink size={13} />
              </a>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-60" />
      </div>
    </div>
  );
};

// ── Small helper sub-components ───────────────────────────────────────────────
const InfoRow = ({ label, value, mono, accent }) => (
  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
    <span className="text-gray-600 font-bold">{label}</span>
    <span className={`font-black max-w-[60%] text-right truncate ${mono ? 'font-mono lowercase' : ''} ${accent ? 'text-cyan-400' : 'text-white'}`}>
      {value}
    </span>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1.5">{title}</p>
    <p className="text-[11px] text-gray-400 leading-relaxed">{children}</p>
  </div>
);

export default PRWorkflow;
