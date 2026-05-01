import React, { useState, useEffect, useRef } from 'react';
import { Bot, Zap, CheckCircle, GitPullRequest, ArrowRight, Play, Upload, Search, Wrench, ChevronRight } from 'lucide-react';
import SmartTooltip from './SmartTooltip';
import DocsModal from './DocsModal';

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ── Animated Loading Dots ──
function LoadingDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c === 3 ? 1 : c + 1), 400);
    return () => clearInterval(id);
  }, []);
  return <span className="inline-block w-8 text-left">{'·'.repeat(count)}</span>;
}

// ── Live Demo ──
const BUGGY_CODE = [
  { text: 'def calculate_sum(a, b):', type: 'normal' },
  { text: '    result = a - b  # wrong op', type: 'bug' },
  { text: '    return result', type: 'normal' },
];
const FIXED_CODE = [
  { text: 'def calculate_sum(a, b):', type: 'normal' },
  { text: '    result = a + b  # fixed ✓', type: 'fixed' },
  { text: '    return result', type: 'normal' },
];

const AGENT_STEPS = [
  'Scanning code structure',
  'Identifying intent mismatch',
  'Generating fix patch',
  'Completed',
];

function LiveDemo() {
  const [ref, inView] = useInView(0.25);
  const [phase, setPhase] = useState(0);
  // phase: 0=idle 1=highlight-bug 2=analyzing 3=fixed 4=passed
  const [agentStep, setAgentStep] = useState(-1);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    const run = async () => {
      await delay(600);  setPhase(1);  setAgentStep(0);
      await delay(1000); setPhase(2);  setAgentStep(1);
      await delay(1400); setPhase(3);  setAgentStep(2);
      await delay(900);  setPhase(4);  setAgentStep(3);
      // Loop after pause
      await delay(3000);
      setPhase(0); setAgentStep(-1);
      started.current = false;
    };
    run();
  }, [inView]);

  // Restart loop when phase returns to 0
  useEffect(() => {
    if (phase === 0 && inView && !started.current) {
      const t = setTimeout(() => {
        started.current = true;
        (async () => {
          await delay(600);  setPhase(1); setAgentStep(0);
          await delay(1000); setPhase(2); setAgentStep(1);
          await delay(1400); setPhase(3); setAgentStep(2);
          await delay(900);  setPhase(4); setAgentStep(3);
          await delay(3000);
          setPhase(0); setAgentStep(-1);
          started.current = false;
        })();
      }, 800);
      return () => clearTimeout(t);
    }
  }, [phase, inView]);

  const code = phase >= 3 ? FIXED_CODE : BUGGY_CODE;

  const statusLabel = phase === 0 ? { text: 'Idle', cls: 'bg-gray-800 text-gray-400' }
    : phase === 1 ? { text: 'Bug Detected', cls: 'bg-red-900/60 text-red-400 animate-pulse' }
    : phase === 2 ? { text: 'Analyzing…', cls: 'bg-yellow-900/60 text-yellow-300 animate-pulse' }
    : phase === 3 ? { text: 'Fix Applied', cls: 'bg-purple-900/60 text-purple-300' }
    : { text: 'Tests Passed ✓', cls: 'bg-green-900/60 text-green-400' };

  return (
    <section ref={ref} className="py-28 px-6" style={{ background: '#0b0f17' }}>
      <div className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-3">Live Demo</p>
          <h2 className="text-4xl font-bold text-white">Watch the agent work</h2>
          <p className="text-gray-400 mt-3 text-sm">Auto-cycles in real-time — no interaction needed</p>
        </div>

        <div className={`grid md:grid-cols-2 gap-6 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* ── Code Panel ── */}
          <div className="rounded-2xl overflow-hidden border border-[#1f2937] shadow-2xl">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#1f2937]" style={{ background: '#161b22' }}>
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-3 text-xs text-gray-500 font-mono">main.py</span>
              <span className={`ml-auto text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider transition-all duration-500 ${statusLabel.cls}`}>
                {statusLabel.text}
              </span>
            </div>
            <div className="p-5 font-mono text-sm leading-8 min-h-[140px]" style={{ background: '#0d1117' }}>
              {code?.map((line, i) => (
                <div
                  key={`${phase}-${i}`}
                  className={`flex items-center px-2 rounded transition-all duration-500 ${
                    line.type === 'bug'
                      ? 'bg-red-500/15 border-l-2 border-red-500'
                      : line.type === 'fixed'
                      ? 'bg-emerald-500/15 border-l-2 border-emerald-400'
                      : ''
                  }`}
                >
                  <span className="text-gray-600 select-none w-6 text-right mr-4 text-xs">{i + 1}</span>
                  <span className={
                    line.type === 'bug' ? 'text-red-300' :
                    line.type === 'fixed' ? 'text-emerald-300' :
                    'text-gray-300'
                  }>{line.text}</span>
                </div>
              ))}
              {phase === 2 && (
                <div className="mt-4 px-2 text-yellow-400 text-xs animate-pulse font-mono">
                  # AI is analyzing<LoadingDots />
                </div>
              )}
              {phase === 4 && (
                <div className="mt-4 px-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-500/30 text-green-400 text-xs font-semibold">
                    <CheckCircle size={13} /> All tests passed — 3/3
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Agent Panel ── */}
          <div className="rounded-2xl overflow-hidden border border-[#1f2937] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2937]" style={{ background: '#161b22' }}>
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-cyan-400" />
                <span className="text-xs text-gray-400 font-semibold">AI Agent</span>
              </div>
              {agentStep >= 0 && agentStep < 3 && (
                <div className="flex gap-1">
                  {[0,1,2]?.map(i => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i <= agentStep ? 'bg-cyan-400' : 'bg-gray-700'}`} />
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 flex-1 flex flex-col gap-3" style={{ background: '#0d1117' }}>
              <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Reasoning Steps</div>

              {AGENT_STEPS?.map((step, i) => {
                const isActive = agentStep === i;
                const isDone = agentStep > i;
                const isPending = agentStep < i;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
                      isActive ? 'border-cyan-500/40 bg-cyan-900/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]' :
                      isDone   ? 'border-green-500/20 bg-green-900/10' :
                                 'border-[#1f2937] bg-[#111827] opacity-40'
                    }`}
                    style={{ transitionDelay: `${i * 60}ms` }}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                      isDone   ? 'bg-green-500/30 border border-green-500' :
                      isActive ? 'bg-cyan-500/30 border border-cyan-400 animate-pulse' :
                                 'border border-gray-700'
                    }`}>
                      {isDone ? (
                        <CheckCircle size={12} className="text-green-400" />
                      ) : isActive ? (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-600" />
                      )}
                    </div>
                    <span className={`text-sm transition-colors duration-300 ${
                      isDone ? 'text-green-300' : isActive ? 'text-cyan-200 font-medium' : 'text-gray-500'
                    }`}>
                      {step}
                      {isActive && i < 3 && <LoadingDots />}
                    </span>
                  </div>
                );
              })}

              {phase === 4 && (
                <div className="mt-auto p-3 rounded-xl bg-green-900/20 border border-green-500/30 flex items-center gap-2">
                  <GitPullRequest size={14} className="text-green-400 shrink-0" />
                  <div>
                    <div className="text-green-300 text-xs font-semibold">Mock PR Ready</div>
                    <div className="text-green-500/70 text-[10px]">branch: auto-fix-7814 · 1 file changed</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Hero Demo Card (right-column, glassmorphism) ──
const CARD_CODE = [
  { text: 'def calculate_sum(a, b):', t: 'n' },
  { text: '    result = a - b  # bug', t: 'bug' },
  { text: '    return result', t: 'n' },
];
const CARD_FIXED = [
  { text: 'def calculate_sum(a, b):', t: 'n' },
  { text: '    result = a + b  # fixed ✓', t: 'fixed' },
  { text: '    return result', t: 'n' },
];
const CARD_AGENT = ['Scanning structure', 'Identifying bug', 'Generating fix', 'Tests passed'];

function HeroDemoCard() {
  const [phase, setPhase] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      while (true) {
        setPhase(0); await delay(700);
        setPhase(1); await delay(900);
        setPhase(2); await delay(1100);
        setPhase(3); await delay(900);
        setPhase(4); await delay(2600);
      }
    })();
  }, []);

  const code = phase >= 3 ? CARD_FIXED : CARD_CODE;
  const statusCls = phase === 0 ? 'text-gray-500 bg-gray-800/60 border-gray-700'
    : phase === 1 ? 'text-red-400 bg-red-900/40 border-red-500/30 animate-pulse'
    : phase === 2 ? 'text-yellow-300 bg-yellow-900/40 border-yellow-500/30 animate-pulse'
    : phase === 3 ? 'text-purple-300 bg-purple-900/40 border-purple-500/30'
    : 'text-emerald-300 bg-emerald-900/40 border-emerald-500/30';
  const statusText = ['Idle', 'Bug Detected', 'AI Scanning…', 'Fix Applied', 'Tests Passed ✓'][phase];

  return (
    <div className="animate-fade-up animate-fill-both animate-delay-200 w-full"
      style={{ animationDelay: '0.25s', animationFillMode: 'both' }}
    >
      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        style={{
          background: 'rgba(13,17,23,0.75)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          boxShadow: '0 0 0 1px rgba(34,211,238,0.08), 0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(34,211,238,0.06)',
        }}
      >
        {/* Titlebar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8"
          style={{ background: 'rgba(22,27,34,0.8)' }}>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-3 text-xs text-gray-500 font-mono">main.py</span>
          </div>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider transition-all duration-400 ${statusCls}`}>
            {statusText}
          </span>
        </div>

        {/* Code */}
        <div className="p-4 font-mono text-xs leading-7 border-b border-white/5" style={{ background: 'rgba(11,15,23,0.6)' }}>
          {code?.map((line, i) => (
            <div key={`hc${phase}${i}`} className={`px-2 py-0.5 rounded transition-all duration-500 ${
              line.t === 'bug'   ? 'bg-red-500/12 border-l-2 border-red-500 text-red-300' :
              line.t === 'fixed' ? 'bg-emerald-500/12 border-l-2 border-emerald-400 text-emerald-300' :
              'text-gray-400'
            }`}>
              <span className="text-gray-700 select-none mr-3">{i + 1}</span>{line.text}
            </div>
          ))}
          {phase === 2 && (
            <div className="mt-2 px-2 text-yellow-400 text-[11px] animate-pulse font-mono">
              # AI analyzing<LoadingDots />
            </div>
          )}
          {phase === 4 && (
            <div className="mt-2 px-2">
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                <CheckCircle size={11} /> All tests passed — 3/3
              </span>
            </div>
          )}
        </div>

        {/* Agent Steps */}
        <div className="p-4" style={{ background: 'rgba(11,15,23,0.5)' }}>
          <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-3">Agent Reasoning</div>
          <div className="flex flex-col gap-2">
            {CARD_AGENT?.map((s, i) => {
              const active = phase === i + 1;
              const done = phase > i + 1;
              return (
                <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-400 ${
                  active ? 'border-cyan-500/30 bg-cyan-900/15' :
                  done   ? 'border-green-500/15 bg-green-900/10' :
                           'border-transparent opacity-25'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                    done   ? 'border-green-400' : active ? 'border-cyan-400' : 'border-gray-700'
                  }`}>
                    {done   ? <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> :
                     active ? <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" /> :
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />}
                  </div>
                  <span className={`text-xs ${done ? 'text-green-300' : active ? 'text-cyan-200' : 'text-gray-500'}`}>
                    {s}{active && <LoadingDots />}
                  </span>
                </div>
              );
            })}
          </div>
          {phase === 4 && (
            <div className="mt-3 p-2.5 rounded-xl bg-green-900/20 border border-green-500/25 flex items-center gap-2">
              <GitPullRequest size={12} className="text-green-400 shrink-0" />
              <div>
                <div className="text-green-300 text-[11px] font-semibold">Mock PR Ready</div>
                <div className="text-green-500/60 text-[10px]">branch: auto-fix-7814 · 1 file</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compact Hero Demo Strip ──
const STRIP_CODE = [
  { text: 'def calculate_sum(a, b):', t: 'n' },
  { text: '    result = a - b  # bug', t: 'bug' },
  { text: '    return result', t: 'n' },
];
const STRIP_FIXED = [
  { text: 'def calculate_sum(a, b):', t: 'n' },
  { text: '    result = a + b  # fixed ✓', t: 'fixed' },
  { text: '    return result', t: 'n' },
];

function HeroDemoStrip() {
  const [ref, inView] = useInView(0.3);
  const [phase, setPhase] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    (async () => {
      while (true) {
        setPhase(0); await delay(800);
        setPhase(1); await delay(900);
        setPhase(2); await delay(1200);
        setPhase(3); await delay(1000);
        setPhase(4); await delay(2800);
      }
    })();
  }, [inView]);

  const code = phase >= 3 ? STRIP_FIXED : STRIP_CODE;
  const labels = [
    null,
    { t: 'Bug detected', c: 'text-red-400 bg-red-900/40 border-red-500/30' },
    { t: 'AI analyzing…', c: 'text-yellow-300 bg-yellow-900/40 border-yellow-500/30 animate-pulse' },
    { t: 'Fix applied', c: 'text-purple-300 bg-purple-900/40 border-purple-500/30' },
    { t: 'Tests passed ✓', c: 'text-emerald-300 bg-emerald-900/40 border-emerald-500/30' },
  ];
  const lbl = phase > 0 ? labels[phase] : null;

  return (
    <div id="demo-strip" ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ background: '#0d1117', borderTop: '1px solid #1f2937', borderBottom: '1px solid #1f2937' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs text-gray-400 font-semibold tracking-wide uppercase">Live Preview</span>
          </div>
          {lbl && (
            <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-all duration-400 ${lbl.c}`}>{lbl.t}</span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Code side */}
          <div className="rounded-xl overflow-hidden border border-[#1f2937]">
            <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: '#161b22', borderBottom: '1px solid #1f2937' }}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="ml-2 text-[11px] text-gray-500 font-mono">main.py</span>
            </div>
            <div className="p-4 font-mono text-xs leading-7" style={{ background: '#0d1117' }}>
              {code?.map((line, i) => (
                <div key={`s${phase}${i}`} className={`px-2 rounded transition-all duration-500 ${
                  line.t === 'bug'   ? 'bg-red-500/12 border-l-2 border-red-500 text-red-300' :
                  line.t === 'fixed' ? 'bg-emerald-500/12 border-l-2 border-emerald-400 text-emerald-300' :
                  'text-gray-400'
                }`}>
                  <span className="text-gray-700 select-none mr-3">{i + 1}</span>{line.text}
                </div>
              ))}
              {phase === 2 && <div className="mt-3 px-2 text-yellow-400 text-[11px] animate-pulse font-mono"># AI analyzing<LoadingDots /></div>}
            </div>
          </div>

          {/* Agent side */}
          <div className="rounded-xl border border-[#1f2937] flex flex-col" style={{ background: '#0d1117' }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid #1f2937', background: '#161b22' }}>
              <Bot size={13} className="text-cyan-400" />
              <span className="text-[11px] text-gray-400 font-semibold">Agent Reasoning</span>
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1">
              {['Scanning structure', 'Identifying bug', 'Generating fix', 'Tests passed']?.map((s, i) => {
                const active = phase === i + 1;
                const done = phase > i + 1;
                return (
                  <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-400 ${
                    active ? 'border-cyan-500/30 bg-cyan-900/15' :
                    done   ? 'border-green-500/15 bg-green-900/8' :
                             'border-transparent opacity-30'
                  }`}>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      done   ? 'border-green-400 bg-green-900/40' :
                      active ? 'border-cyan-400 bg-cyan-900/40' :
                               'border-gray-700'
                    }`}>
                      {done   ? <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> :
                       active ? <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" /> :
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />}
                    </div>
                    <span className={`text-xs ${
                      done ? 'text-green-300' : active ? 'text-cyan-200' : 'text-gray-500'
                    }`}>{s}{active && <LoadingDots />}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Agent Timeline ──
const TIMELINE = [
  { icon: '🔍', label: 'Scanning', desc: 'Continuously monitors file changes in real time' },
  { icon: '🧠', label: 'Analyzing', desc: 'OpenAI GPT-4o detects logical errors and intent mismatches' },
  { icon: '🔧', label: 'Fixing', desc: 'Generates and applies deterministic code patches' },
  { icon: '✅', label: 'Testing', desc: 'Runs automated test suite with retry logic' },
  { icon: '🚀', label: 'PR Created', desc: 'Opens pull request with full diff and explanation' },
];

function AgentTimeline() {
  const [ref, inView] = useInView(0.1);
  return (
    <section id="pipeline" ref={ref} className="py-28 px-6" style={{ background: '#0e1420' }}>
      <div className="max-w-2xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-3">Pipeline</p>
          <h2 className="text-4xl font-bold text-white">The agent loop</h2>
        </div>
        <div className="relative">
          <div className="absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-cyan-500/50 via-blue-500/30 to-transparent" />
          <div className="space-y-6">
            {TIMELINE?.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-5 transition-all duration-600 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'}`}
                style={{ transitionDelay: `${i * 140}ms` }}
              >
                <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center text-xl border-2 shrink-0 transition-all duration-500 ${
                  i === 0 && inView
                    ? 'border-cyan-400 bg-cyan-900/30 shadow-[0_0_16px_rgba(34,211,238,0.3)]'
                    : 'border-[#1f2937] bg-[#111827]'
                }`} style={{ transitionDelay: `${i * 140}ms` }}>
                  {item.icon}
                </div>
                <div className="pt-2.5">
                  <div className="font-semibold text-white mb-1">{item.label}</div>
                  <div className="text-sm text-gray-400 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Main Landing Page ──
const LandingPage = ({ onEnter, onDemo, onChallenge }) => {
  const [howRef, howInView] = useInView(0.1);
  const [featRef, featInView] = useInView(0.1);
  const [feedbackRef, feedbackInView] = useInView(0.2);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  const FEATURES = [
    { icon: <Zap size={22} />, color: 'blue',   title: 'AI Debugging',     desc: 'Deep logical analysis by GPT-4o to catch intent mismatches and syntax errors.' },
    { icon: <Bot size={22} />, color: 'purple', title: 'Auto Fix',         desc: 'Deterministic, context-aware code patches generated instantly.' },
    { icon: <CheckCircle size={22} />, color: 'orange', title: 'Test Validation', desc: 'Retry logic — if the fix fails tests, the agent learns and retries.' },
    { icon: <GitPullRequest size={22} />, color: 'green', title: 'PR Simulation', desc: 'Packages tested patches into clean pull requests automatically.' },
  ];

  const colorMap = {
    blue:   { bg: 'bg-blue-900/25',   border: 'border-blue-500/20',   text: 'text-blue-400',   glow: 'hover:shadow-[0_0_20px_rgba(96,165,250,0.2)]' },
    purple: { bg: 'bg-purple-900/25', border: 'border-purple-500/20', text: 'text-purple-400', glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]' },
    orange: { bg: 'bg-orange-900/25', border: 'border-orange-500/20', text: 'text-orange-400', glow: 'hover:shadow-[0_0_20px_rgba(251,146,60,0.2)]' },
    green:  { bg: 'bg-green-900/25',  border: 'border-green-500/20',  text: 'text-green-400',  glow: 'hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]' },
  };

  return (
    <div className="min-h-screen font-sans text-white overflow-x-hidden" style={{ background: '#050B18' }}>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5 border-b border-white/[0.05]"
        style={{ background: 'rgba(5,11,24,0.7)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center font-black text-xl tracking-tighter">
          <Bot className="text-cyan-400 mr-2.5" size={24} />
          AgentSmiths
        </div>
        <div className="hidden lg:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</a>
          <a href="#pipeline" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">How it works</a>
          <SmartTooltip message="Solve daily logic puzzles & earn badges!">
            <button 
              onClick={onChallenge} 
              className="group relative px-4 py-1.5 rounded-full text-sm font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/30 rounded-full blur-[2px] group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 transition-all" />
              <span className="relative z-10 flex items-center gap-2">
                Challenge
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              </span>
            </button>
          </SmartTooltip>
          <button 
            onClick={() => setIsDocsOpen(true)}
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Docs
          </button>
          <a href="#roadmap" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Roadmap</a>
          <a href="#contact" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Contact</a>
        </div>
        <button onClick={onEnter} className="btn-primary text-sm font-bold px-6 py-2.5 rounded-full text-white flex items-center gap-2">
          Workspace <ArrowRight size={16} />
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center px-6 pt-24 pb-10 overflow-hidden" id="hero">
        
        {/* Deep Radial Glows */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[100vw] h-[100vh] rounded-full pointer-events-none opacity-40 animate-glow-pulse"
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(37,99,235,0.15) 0%, transparent 60%)', filter: 'blur(100px)' }} />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        
        {/* Dots Pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1.5px, transparent 1.5px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 10%, transparent 100%)'
        }} />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* LEFT ─ Text */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-5 py-2 mb-8 text-[11px] font-bold tracking-[0.2em] uppercase text-cyan-400/80">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
              Production Ready Agent
            </div>
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
              Welcome to<br />
              <span className="text-gradient">AgentSmiths</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400/80 mb-10 leading-relaxed max-w-lg">
              The first AI agent that monitors, diagnoses, and repairs logical flaws in your codebase autonomously.
            </p>
            <div className="flex flex-wrap gap-5">
              <button onClick={onEnter} className="btn-primary flex items-center gap-2.5 px-9 py-4 rounded-full font-extrabold text-base text-white">
                Open Workspace <ArrowRight size={20} />
              </button>
              <button onClick={onDemo} className="btn-secondary flex items-center gap-2.5 px-9 py-4 rounded-full font-extrabold text-base text-gray-200 border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10 hover:border-cyan-400/30 hover:shadow-glow-blue">
                <Play size={20} className="text-cyan-400" /> Start Interactive Demo
              </button>
            </div>
            
            <div className="mt-12 flex items-center gap-6 opacity-40">
              <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Trusted by modern teams</div>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <a href="#how-it-works"
              className="inline-flex items-center gap-1.5 mt-8 text-gray-600 hover:text-cyan-400 transition-colors text-xs tracking-wide"
              style={{ textDecoration: 'none' }}
            >
              <ChevronRight size={13} className="rotate-90" /> Scroll to learn more
            </a>
          </div>

          {/* RIGHT ─ Inline Demo Card */}
          <HeroDemoCard />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" ref={howRef} className="py-32 px-6 relative" style={{ background: '#050B18' }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-20 transition-all duration-1000 ${howInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-4">Autonomous Process</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Simple. Agentic. Powerful.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Upload size={28} />, step: '01', title: 'Load Code', desc: 'Sync your GitHub repository or paste code directly into the workspace.' },
              { icon: <Search size={28} />, step: '02', title: 'AI Analysis', desc: 'Agent performs deep structural and logical audit using OpenAI GPT-4o.' },
              { icon: <Wrench size={28} />, step: '03', title: 'Auto Patch', desc: 'Fixes are validated through test suites and packaged into PRs.' },
            ]?.map((card, i) => (
              <div key={i}
                className={`group glass-panel rounded-3xl p-10 transition-all duration-700 ${howInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-900/20 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:border-cyan-400/50 transition-all duration-500 shadow-lg shadow-cyan-500/5">{card.icon}</div>
                  <span className="text-5xl font-black text-white/[0.03] select-none">{card.step}</span>
                </div>
                <h3 className="font-extrabold text-white text-xl mb-3 tracking-tight">{card.title}</h3>
                <p className="text-gray-400/80 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO STRIP ── */}
      <section className="relative py-20 px-6 border-y border-white/[0.05]" style={{ background: 'rgba(5,11,24,0.5)' }}>
         <LiveDemo />
      </section>

      {/* ── FEATURES ── */}
      <section ref={featRef} className="py-32 px-6 relative" style={{ background: '#050B18' }}>
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-20 transition-all duration-1000 ${featInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-4">Core Capabilities</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Built for Production.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES?.map((f, i) => {
              const c = colorMap[f.color];
              return (
                <div key={i}
                  className={`group glass-panel rounded-3xl p-8 hover:bg-white/[0.02] transition-all duration-700 ${featInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className={`w-12 h-12 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center ${c.text} mb-6 group-hover:scale-110 transition-transform`}>{f.icon}</div>
                  <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-400/70 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AGENT TIMELINE ── */}
      <AgentTimeline />

      {/* ── ROADMAP ── */}
      <section id="roadmap" className="py-32 px-6 relative overflow-hidden" style={{ background: '#050B18' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-black mb-4">The Future</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Project Roadmap</h2>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 hidden md:block" />
            {[
              { phase: 'Q1 2024', title: 'Agent Core', status: 'Completed', desc: 'Core reasoning engine and GPT-4o integration.', active: false },
              { phase: 'Q2 2024', title: 'Multi-Language', status: 'In Progress', desc: 'Support for JS, Go, and Rust ecosystems.', active: true },
              { phase: 'Q3 2024', title: 'IDE Extensions', status: 'Planned', desc: 'Native VS Code and JetBrains extension suite.', active: false },
              { phase: 'Q4 2024', title: 'Self-Hosted', status: 'Planned', desc: 'Enterprise-grade local agent deployment.', active: false },
            ].map((item, i) => (
              <div key={i} className={`relative p-8 rounded-3xl border transition-all duration-500 ${item.active ? 'border-cyan-500/50 bg-cyan-500/5 shadow-glow-blue/10' : 'border-white/5 bg-white/[0.02]'}`}>
                <div className={`w-3 h-3 rounded-full absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 ${item.active ? 'bg-cyan-400 shadow-glow-blue' : 'bg-gray-800 border border-white/10'}`} />
                <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">{item.phase}</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mb-4 ${item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : item.active ? 'bg-cyan-500/10 text-cyan-400 animate-pulse' : 'bg-white/5 text-gray-500'}`}>
                  {item.status}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-32 px-6 relative" style={{ background: '#0b0f17' }}>
        <div className="max-w-4xl mx-auto glass-panel rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">Get in touch.</h2>
              <p className="text-gray-400 max-w-lg mx-auto">Have questions about the agentic workflow or need enterprise support? Our team is here to help.</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6">
              <a href="mailto:support@agentsmiths.ai" className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all group flex items-center gap-3">
                <Bot size={20} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">support@agentsmiths.ai</span>
              </a>
              <div className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all group flex items-center gap-3 cursor-pointer">
                <GitPullRequest size={20} className="text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">Join Discord</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEEDBACK & QUERIES ── */}
      <section id="feedback" ref={feedbackRef} className={`py-32 px-6 relative transition-all duration-1000 ${feedbackInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ background: '#050B18' }}>
        <div className="max-w-4xl mx-auto glass-panel rounded-3xl p-10 border border-white/10">
          <div className="text-center mb-12">
            <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-black mb-4">We want to hear from you</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Feedback, Queries & Recommendations</h2>
          </div>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Name</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/50 transition-colors" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/50 transition-colors" placeholder="john@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type</label>
              <select className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none">
                <option>Feedback</option>
                <option>Query</option>
                <option>Recommendation to Improve</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Message</label>
              <textarea rows={5} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/50 transition-colors resize-none" placeholder="How can we improve?"></textarea>
            </div>
            <button className="btn-primary w-full py-4 rounded-xl font-bold text-white mt-4">
              Submit
            </button>
          </form>
        </div>
      </section>

      <footer className="py-12 border-t border-white/[0.05] text-center" style={{ background: '#050B18' }}>
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
           <Bot size={18} className="text-cyan-400" />
           <span className="font-bold text-sm tracking-tighter text-white">AgentSmiths</span>
        </div>
        <div className="text-[11px] text-gray-500 font-medium tracking-wide">
          &copy; 2024 AgentSmiths. All rights reserved.
        </div>
      </footer>
      
      {/* Docs Modal Overlay */}
      <DocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
    </div>
  );
};

export default LandingPage;
