import React, { useState, useRef, useEffect } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { Activity, Settings, Play, Zap, ShieldAlert, Loader2, FileCode2, Search, X, AlertTriangle, GitBranch, Check, GitPullRequest, Terminal } from 'lucide-react';

const CodeEditor = ({
  code = '', setCode, originalCode, suggestedCode = null, agentState = null,
  isAgentThinking, isAgentMode, setIsAgentMode,
  onRunTests, onRunAgent,
  onFixApplied, onFixRejected, onCreatePR,
  activeFileName = 'main.py',
}) => {
  const [hoveredBtn, setHoveredBtn] = useState(null);
  
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const decorationIds = useRef([]);

  const computeInlineDiff = (original, suggested) => {
    if (!original || !suggested) return [];
    const originalLines = original.split('\n');
    const suggestedLines = suggested.split('\n');
    const diffs = [];

    // Simple line-by-line diff for inline guidance
    const maxLines = Math.max(originalLines.length, suggestedLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (originalLines[i] !== suggestedLines[i] && suggestedLines[i] !== undefined) {
        diffs.push({
          lineNumber: i + 1,
          originalLine: originalLines[i] || '',
          suggestedLine: suggestedLines[i] || ''
        });
      }
    }
    return diffs;
  };

  useEffect(() => {
    try {
      if (editorRef.current && monacoRef.current) {
        const model = editorRef.current.getModel();
        if (!model) return;

        let newDecorations = [];

        // 1. Error Markers (from agentState)
        if (agentState?.error && agentState.error !== 'None' && agentState.line) {
          const line = parseInt(agentState.line, 10);
          if (!isNaN(line)) {
            const markers = [{
              message: agentState?.explanation || agentState.error,
              severity: monacoRef.current.MarkerSeverity.Error,
              startLineNumber: line,
              startColumn: 1,
              endLineNumber: line,
              endColumn: 1000,
            }];
            monacoRef.current.editor.setModelMarkers(model, 'agent-error', markers);
          }
        } else {
          monacoRef.current.editor.setModelMarkers(model, 'agent-error', []);
        }

        // 2. Inline Suggestions (Ghost Text & Highlights)
        if (suggestedCode && suggestedCode !== code && agentState?.error !== 'No issues found') {
          const diffs = computeInlineDiff(code, suggestedCode);
          diffs.forEach(diff => {
            newDecorations.push({
              range: new monacoRef.current.Range(diff.lineNumber, 1, diff.lineNumber, 1000),
              options: {
                isWholeLine: true,
                className: 'line-error-highlight', // Defined in CSS
                glyphMarginClassName: 'error-glyph',
                after: {
                  content: `  ${diff.suggestedLine.trim()}`,
                  inlineClassName: 'ghost-text-suggestion'
                }
              }
            });
          });
        }

        decorationIds.current = editorRef.current.deltaDecorations(decorationIds.current, newDecorations);
      }
    } catch (e) {
      console.error("Monaco Decoration Error:", e);
    }
  }, [agentState, code, suggestedCode]);

  const handleEditorChange = (value) => {
    if (setCode) setCode(value || '');
  };

  const Btn = ({ id, onClick, disabled, icon: Icon, iconColor, label, variant = 'ghost' }) => {
    const isLoading = isAgentThinking && hoveredBtn === id;
    const base = 'relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed select-none';
    const variants = {
      ghost: `${base} bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/20 text-gray-300 hover:text-white hover:scale-105 active:scale-95`,
      primary: `${base} bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-900/40 hover:shadow-blue-800/60 hover:scale-105 active:scale-95`,
    };
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHoveredBtn(id)}
        onMouseLeave={() => setHoveredBtn(null)}
        className={variants[variant]}
      >
        {isAgentThinking && variant === 'primary'
          ? <Loader2 size={13} className="animate-spin" />
          : <Icon size={13} className={iconColor} />
        }
        {isAgentThinking && variant === 'primary' ? 'Working…' : label}
      </button>
    );
  };

  const [panelHeight, setPanelHeight] = useState(window.innerHeight * 0.4);
  const isResizing = useRef(false);

  const startResizing = (e) => {
    isResizing.current = true;
    e.preventDefault();
  };

  const stopResizing = () => {
    isResizing.current = false;
  };

  const resize = (e) => {
    if (!isResizing.current) return;
    const newHeight = window.innerHeight - e.clientY - 32; // Offset for outer container padding
    if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
      setPanelHeight(newHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden px-4 py-4"
      style={{ background: '#0B0F19' }}>

      <div className="flex-1 flex flex-col rounded-3xl overflow-hidden elevated-card relative bg-[#1e1e1e]">
        {/* ── Action Bar ── */}
        <div className="h-14 flex items-center px-6 gap-4 justify-between shrink-0 border-b border-white/5"
          style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(20px)' }}>

          <button
            id="agent-toggle"
            onClick={setIsAgentMode}
            className={`flex items-center gap-3 px-4 py-2 rounded-full border text-xs font-black tracking-tight transition-all duration-300 ${
              isAgentMode
                ? 'border-green-500/40 bg-green-500/10 text-green-400 shadow-glow-green'
                : 'border-white/10 bg-white/5 text-gray-500 hover:border-white/20 hover:text-gray-400'
            }`}
          >
            <ShieldAlert size={14} className={isAgentMode ? 'text-green-400' : 'text-gray-600'} />
            Agent Mode
            <div className={`w-8 h-4 rounded-full relative transition-all duration-300 ${isAgentMode ? 'bg-green-500' : 'bg-gray-700'}`}>
              <div className={`w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-all duration-300 shadow ${isAgentMode ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>

          <div className="flex items-center gap-3">
            {isAgentMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-widest text-cyan-400 animate-pulse">
                <Activity size={12} />
                AI is analyzing in real-time...
              </div>
            )}
            <Btn id="test"    onClick={onRunTests} disabled={isAgentThinking} icon={Play}     iconColor="text-emerald-400" label="Run Tests" />
            <Btn id="agent-loop-btn"   onClick={onRunAgent} disabled={isAgentThinking} icon={Zap}      iconColor="text-white" label="Run Loop" variant="primary" />
          </div>
        </div>

        <div className="flex items-center h-11 border-b border-white/5 shrink-0 overflow-x-auto"
          style={{ background: 'rgba(8, 12, 20, 0.4)' }}>
          <div className="flex items-center gap-2.5 px-6 h-full border-r border-white/5 text-xs font-black text-white bg-white/[0.03] shrink-0 relative">
            <FileCode2 size={14} className="text-vscode-accent animate-float" />
            {activeFileName}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-vscode-accent shadow-glow-blue" />
          </div>
        </div>

        {/* ── Main Editor ── */}
        <div className="flex-1 relative group min-h-0">
          <Editor
            height="100%"
            language="python"
            theme="vs-dark"
            value={code || ''}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              readOnly: false,
              minimap: { enabled: false },
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 24,
              wordWrap: 'on',
              automaticLayout: true,
              padding: { top: 20, bottom: 20 },
              renderLineHighlight: 'all',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
            }}
          />

          {/* Floating Success Badge */}
          {agentState?.error === 'No issues found' && (
            <div className="absolute top-4 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 shadow-glow-green backdrop-blur-md animate-fade-in">
              <Check size={16} className="text-green-400" />
              <span className="text-xs font-black uppercase tracking-widest text-green-400">
                Code is clean — no issues found
              </span>
            </div>
          )}

          {/* Floating Ignored Badge */}
          {agentState?.isIgnored && (
            <div className="absolute top-4 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 shadow-glow-yellow backdrop-blur-md animate-fade-in">
              <AlertTriangle size={16} className="text-yellow-400" />
              <span className="text-xs font-black uppercase tracking-widest text-yellow-400">
                Ignored Issue — User chose not to fix
              </span>
            </div>
          )}

          {/* Execution Output (Console) */}
          {agentState?.testOutput && (
            <div className="absolute bottom-4 left-6 right-6 z-10 rounded-xl overflow-hidden border border-white/10 shadow-2xl animate-fade-up"
              style={{ background: 'rgba(8, 12, 20, 0.9)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-2">
                  <Terminal size={12} className={agentState.testPassed ? 'text-green-400' : 'text-red-400'} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Execution Output</span>
                </div>
                <button onClick={() => setCode(code)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={12} />
                </button>
              </div>
              <div className="p-4 font-mono text-[11px] max-h-32 overflow-y-auto">
                <div className={agentState.testPassed ? 'text-green-400' : 'text-red-300'}>
                  {agentState.testOutput}
                </div>
                {agentState.result && (
                  <div className={`mt-2 pt-2 border-t border-white/5 text-[10px] font-bold uppercase tracking-widest ${agentState.testPassed ? 'text-green-500' : 'text-red-500'}`}>
                    Status: {agentState.result}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── AI Suggested Fix Resizable Panel ── */}
        {agentState?.error && agentState.error !== 'No issues found' && (
          <>
            {/* Draggable Divider */}
            <div
              onMouseDown={startResizing}
              className={`h-1.5 w-full cursor-ns-resize hover:bg-cyan-500/50 transition-colors z-30 flex items-center justify-center group ${isResizing ? 'bg-cyan-500' : 'bg-white/5'}`}
            >
              <div className="w-12 h-0.5 rounded-full bg-white/20 group-hover:bg-white/40" />
            </div>

            <div 
              style={{ height: `${panelHeight}px`, background: '#0B0F19' }}
              className="flex flex-col shrink-0 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] z-20 relative"
            >
              <div className="h-12 flex items-center justify-between px-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-glow-blue" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
                    AI Suggested Fix
                  </span>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={onFixRejected} 
                    disabled={isAgentThinking}
                    className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all disabled:opacity-40"
                  >
                    Reject
                  </button>
                  <button 
                    id="apply-fix-btn"
                    onClick={onFixApplied}
                    disabled={isAgentThinking}
                    className="px-5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/10 hover:border-cyan-400/30 transition-all active:scale-95 disabled:opacity-40"
                  >
                    Apply Fix
                  </button>
                  <button 
                    id="create-pr-btn"
                    onClick={onCreatePR}
                    disabled={isAgentThinking}
                    className="flex items-center gap-2 px-5 py-1.5 rounded-lg bg-vscode-accent shadow-glow-blue text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 disabled:opacity-40"
                  >
                    <GitPullRequest size={12} />
                    Create PR
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className="w-1/3 min-w-[300px] border-r border-white/5 p-6 overflow-y-auto bg-black/20">
                  <div className="space-y-6">
                    {agentState?.error && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle size={14} className="text-red-400" />
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-red-400">Detected Issue</h3>
                        </div>
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-xs font-bold text-gray-200">
                          {agentState.error}
                        </div>
                      </div>
                    )}
                    {agentState?.explanation && (
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 px-1">Explanation</h3>
                        <p className="text-[11px] text-gray-400 leading-relaxed px-1">
                          {agentState.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 relative">
                  <div className="absolute top-3 right-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500">
                    <GitBranch size={10} className="text-cyan-400" />
                    Diff Preview
                  </div>
                  <DiffEditor
                    height="100%"
                    original={code || ''}
                    modified={suggestedCode || ''}
                    language="python"
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      lineHeight: 22,
                      renderSideBySide: true,
                      padding: { top: 12, bottom: 12 },
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
