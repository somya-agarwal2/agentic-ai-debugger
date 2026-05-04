import React, { useState, useEffect } from 'react';
import { Timer as TimerIcon, Play, CheckCircle2, XCircle, ChevronRight, Brain, Code as CodeIcon, Trophy, AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import Editor from '@monaco-editor/react';

const CHALLENGES= [
  {
    level: "Easy",
    title: "Calculate Average",
    code: `def calculate_average(nums):
    total = 0
    for num in nums:
        total += num
    average = total / len(nums) - 1   # bug
    return average`,
    solution: "average = total / len(nums)",
    hints: ["Check the calculated return value", "Why is there a '- 1' at the end?", "The formula for average is just total / count"],
    explanation: "You subtracted 1 from the average, which reduces the result incorrectly. The correct formula is total / length.",
    bugLine: 5
  },
  {
    level: "Medium",
    title: "Find Maximum",
    code: `def find_max(nums):
    max_val = nums[0]
    for i in range(1, len(nums) + 1): # bug
        if nums[i] > max_val:
            max_val = nums[i]
    return max_val`,
    solution: "for i in range(len(nums)):",
    hints: ["Check the loop boundary", "How many elements are in nums?", "Arrays are 0-indexed"],
    explanation: "The loop index goes out of bounds because range(1, len(nums) + 1) includes an index that doesn't exist.",
    bugLine: 3
  },
  {
    level: "Hard",
    title: "Binary Search",
    code: `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low < high: # bug
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
    solution: "while low <= high:",
    hints: ["Check the while condition", "What happens if target is at the last position?", "The loop should continue as long as the search range is valid"],
    explanation: "Check 'low < high' misses the case where low and high are equal, which is necessary for target at boundary.",
    bugLine: 4
  }
];

const normalize = (str) => str.replace(/\s/g, "");

const isExactMatch = (input, solution) => {
  return normalize(input) === normalize(solution);
};

const PERSONALITIES = {
  Friendly: { feedback: "Nice try! You're getting closer! ✨", success: "Amazing work! You're a natural! 🎉" },
  Strict: { feedback: "Incorrect logic. Analyze the constraints again.", success: "Logic verified. Correct." },
  Funny: { feedback: "Bro ye minus kyu kiya 😭", success: "Woaah, big brain move right there! 🧠🔥" }
};

const ChallengePage = ({ onBackToHome }) => {
  const [isCompleted, setIsCompleted] = useState(() => {
    return localStorage.getItem('daily_challenge_completed') === new Date().toDateString();
  });

  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const challenge = CHALLENGES[currentChallengeIndex];
  
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [isGameOver, setIsGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  
  // New States
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [personality, setPersonality] = useState('Friendly');
  const [isAISolving, setIsAISolving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [timeTaken, setTimeTaken] = useState(0);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [thinking, setThinking] = useState([]);

  useEffect(() => {
    if (!showSolution && !isGameOver) {
      setThinking([]);
      const t1 = setTimeout(() => setThinking(["🧠 Scanning variables..."]), 800);
      const t2 = setTimeout(() => setThinking(prev => [...prev, "🔍 Checking formula..."]), 1800);
      const t3 = setTimeout(() => setThinking(prev => [...prev, "⚠ Issue detected"]), 2800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [showSolution, isGameOver, currentChallengeIndex]);

  useEffect(() => {
    if (!isCompleted) {
      setUserInput('');
      setResult(null);
      setShowSolution(false);
      setIsGameOver(false);
      setIsTimerRunning(true);
      setTimeLeft(120);
      setHintLevel(0);
      setFeedback('');
      setShowSuccessBanner(false);
      setIsCorrect(false);
    }
  }, [currentChallengeIndex, isCompleted]);

  // Timer logic
  useEffect(() => {
    if (isCompleted) return;
    let timer;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimeUp();
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, isCompleted]);

  const handleTimeUp = () => {
    setIsGameOver(true);
    setIsTimerRunning(false);
    setShowSolution(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    setTotalAttempts(prev => prev + 1);
    const current = CHALLENGES[currentChallengeIndex];

    if (isExactMatch(userInput, current.solution)) {
      setIsCorrect(true);
      setResult('success');
      setCorrectAnswers(prev => prev + 1);
      setScore(prev => prev + (timeLeft * 10));
      setStreak(prev => prev + 1);
      setIsGameOver(true);
      setIsTimerRunning(false);
      setShowSolution(true);
      setShowSuccessBanner(true);
      setTimeTaken(120 - timeLeft);
      setFeedback(PERSONALITIES[personality].success);
    } else {
      setIsCorrect(false);
      setResult('fail');
      setStreak(0);
      setFeedback(PERSONALITIES[personality].feedback);
    }
  };

  const handleHint = () => {
    if (hintLevel < challenge.hints.length) {
      setHintLevel(prev => prev + 1);
    }
  };

  const handleRetry = () => {
    setUserInput('');
    setResult(null);
    setIsCorrect(false);
    setShowSolution(false);
    setIsGameOver(false);
    setIsTimerRunning(true);
    setTimeLeft(120);
    setHintLevel(0);
    setFeedback('');
    setIsAISolving(false);
  };

  const handleAISolve = () => {
    const current = CHALLENGES[currentChallengeIndex];
    setUserInput(current.solution);
    setFeedback("AI Agent: Solution applied to editor. Click 'Submit Fix' to verify the result.");
  };

  const handleNextChallenge = () => {
    if (currentChallengeIndex >= CHALLENGES.length - 1) {
      localStorage.setItem('daily_challenge_completed', new Date().toDateString());
      setIsCompleted(true);
    } else {
      setCurrentChallengeIndex(prev => prev + 1);
    }
  };

  if (isCompleted) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center animate-fade-in" style={{ background: '#050810' }}>
        <div className="max-w-md space-y-8">
          <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-glow-green animate-float">
            <CheckCircle2 size={48} className="text-emerald-400" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight text-white">Daily Challenge Completed!</h1>
            <p className="text-gray-400 font-medium">You've finished all challenges for today. See you tomorrow! 👋</p>
          </div>
          <div className="pt-8 flex flex-col gap-4">
            <button 
              onClick={onBackToHome}
              className="px-8 py-3 rounded-full bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all active:scale-95 flex items-center gap-2 mx-auto"
            >
              Back to Home <ChevronRight size={16} />
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('daily_challenge_completed');
                setIsCompleted(false);
                setCurrentChallengeIndex(0);
              }}
              className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors"
            >
              Reset Daily Status (Dev Mode)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 md:p-16 animate-fade-in relative overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 50%, #0d121f 0%, #05070a 100%)' }}>
      
      {/* AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {showSuccessBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-8 py-3 rounded-full bg-emerald-500 text-white font-black uppercase tracking-widest text-xs shadow-glow-green animate-fade-up flex items-center gap-3">
          <CheckCircle2 size={16} />
          Bug fixed in {timeTaken}s — Nice work!
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        
        {/* TOP NAVIGATION */}
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={onBackToHome}
            className="group flex items-center gap-2 py-2 transition-all active:scale-95"
          >
            <ArrowLeft size={14} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">Home</span>
          </button>
          
          <div className="hidden md:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-glow-blue" />
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Challenge Environment Active</span>
          </div>
        </div>

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex p-1.5 bg-white/[0.03] backdrop-blur-2xl rounded-2xl border border-white/5 shadow-2xl relative">
                {CHALLENGES.map((ch, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentChallengeIndex(idx)}
                    className={`relative px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 z-10 ${
                      currentChallengeIndex === idx 
                        ? 'text-white' 
                        : 'text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    {currentChallengeIndex === idx && (
                      <div className="absolute inset-0 bg-white/[0.05] border border-white/10 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.05)]" 
                           style={{ viewTransitionName: 'active-pill' }} />
                    )}
                    <span className="relative">{ch.level}</span>
                  </button>
                ))}
              </div>
              {streak > 2 && (
                <div className="px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-black uppercase tracking-widest text-orange-500 animate-pulse flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-glow-orange" />
                  Streak: {streak}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-6xl font-bold tracking-tight text-white flex items-center gap-4">
                {challenge.title} <span className="text-4xl opacity-50">#0{currentChallengeIndex + 1}</span>
              </h1>
              <p className="text-lg text-gray-400 font-medium tracking-tight max-w-xl">Identify the logic gap and implement a precision fix.</p>
            </div>
          </div>

          {/* TIMER & PERSONALITY */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">AI Companion</span>
              <select 
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-300 focus:outline-none focus:border-cyan-500/50 hover:bg-white/10 transition-all cursor-pointer"
              >
                <option value="Friendly">Friendly</option>
                <option value="Strict">Strict</option>
                <option value="Funny">Funny</option>
              </select>
            </div>

            <div className={`relative flex items-center gap-6 px-12 py-6 rounded-[2rem] border transition-all duration-500 backdrop-blur-3xl ${
              timeLeft < 30 
                ? 'bg-red-500/[0.03] border-red-500/20 text-red-500 animate-pulse' 
                : 'bg-white/[0.02] border-white/5 text-white'
            }`}>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-1">Time Remaining</span>
                <span className={`text-5xl font-mono font-medium tabular-nums tracking-tighter ${timeLeft < 30 ? 'text-red-500' : 'text-white'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {feedback && (
          <div className={`p-4 rounded-2xl border text-center font-black uppercase tracking-widest text-sm animate-fade-in ${
            result === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-glow-green' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT: CODE & INPUT */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* BUGGY CODE VIEW */}
            <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-[#090b10] group transition-all duration-500 hover:border-white/10">
              <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">source/bug_report.py</span>
                </div>
              </div>
              <div className="p-2 h-48 relative">
                <div className="absolute inset-0 bg-red-500/[0.02] pointer-events-none group-hover:bg-red-500/[0.05] transition-all" />
                <Editor
                  height="100%"
                  language="python"
                  theme="vs-dark"
                  value={challenge.code}
                  onMount={(editor, monaco) => {
                    const line = challenge.bugLine;
                    if (line) {
                      editor.deltaDecorations([], [
                        {
                          range: new monaco.Range(line, 1, line, 1),
                          options: {
                            isWholeLine: true,
                            className: 'bug-heatmap-line',
                          }
                        }
                      ]);
                    }
                  }}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: { top: 12 },
                    lineNumbers: 'on',
                    renderLineHighlight: 'none'
                  }}
                />
              </div>
            </div>

            <style>
              {`
                .bug-heatmap-line {
                  background: rgba(239, 68, 68, 0.05) !important;
                  box-shadow: inset 4px 0 0 #ef4444 !important;
                }
                .success-glow {
                  box-shadow: 0 0 40px rgba(34, 197, 94, 0.1) !important;
                  border-color: rgba(34, 197, 94, 0.3) !important;
                }
                .thinking-line {
                  animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                  opacity: 0;
                }
                @keyframes slideIn {
                  from { opacity: 0; transform: translateX(-10px); }
                  to { opacity: 1; transform: translateX(0); }
                }
              `}
            </style>

            {hintLevel > 0 && (
              <div className="space-y-3 animate-fade-in">
                {challenge.hints.slice(0, hintLevel).map((hint, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 text-xs text-cyan-300 flex items-center gap-3">
                    <Brain size={14} className="shrink-0" />
                    <span>Hint {i + 1}: {hint}</span>
                  </div>
                ))}
              </div>
            )}

            {/* USER INPUT EDITOR */}
            <div 
              className={`rounded-2xl overflow-hidden border bg-[#05070a] flex flex-col transition-all duration-500 ${
                result === 'success' 
                  ? 'border-emerald-500/30 success-glow' 
                  : 'border-white/5 focus-within:border-white/20'
              }`}
            >
              <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Your Resolution</span>
                {result === 'fail' && (
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={12} /> Logic Error Detected
                  </span>
                )}
              </div>
              <div className="p-2 h-48 md:h-64">
                <Editor
                  height="100%"
                  language="python"
                  theme="vs-dark"
                  value={userInput}
                  onChange={setUserInput}
                  options={{
                    readOnly: isGameOver,
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', monospace",
                    placeholder: "Write your fix here...",
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
              
              {/* ACTION BUTTONS */}
              <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between gap-3">
                <div className="flex gap-3">
                  <button 
                    onClick={handleHint}
                    disabled={isGameOver || hintLevel >= challenge.hints.length}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    Get Hint ({challenge.hints.length - hintLevel})
                  </button>
                  <button 
                    onClick={handleAISolve}
                    disabled={isGameOver || isAISolving}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-30"
                  >
                    Watch AI Solve
                  </button>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleRetry}
                    className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <RefreshCw size={14} className="text-gray-400" /> Retry
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isGameOver || !userInput.trim()}
                    className="px-8 py-2.5 rounded-full bg-vscode-accent text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-glow-blue disabled:opacity-40 disabled:grayscale"
                  >
                    Submit Fix
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: AI SOLUTION PANEL */}
          <div className="space-y-6">
            
            {showSolution ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 space-y-8 animate-fade-up backdrop-blur-xl">
                <div className="flex items-center gap-3 text-white">
                  <Brain size={18} className="text-gray-400" />
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em]">Neural Feedback</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">The Issue</span>
                    <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-red-500/40 pl-4">
                      "{challenge.explanation}"
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Comparison</span>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-[10px] font-mono flex justify-between items-center">
                        <span className="text-red-400">Before: total / len(nums) - 1</span>
                        <XCircle size={12} className="text-red-500" />
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-mono flex justify-between items-center">
                        <span className="text-emerald-400">After: total / len(nums)</span>
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                   <button 
                    onClick={handleNextChallenge}
                    className="w-full py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                   >
                     Next Challenge <ChevronRight size={16} />
                   </button>
                   {result === 'success' && (
                     <div className="text-center py-2 animate-bounce">
                       <span className="text-xl">Correct! 🎉</span>
                     </div>
                   )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-10 flex flex-col items-center justify-center text-center min-h-[360px] space-y-10 transition-all duration-500 backdrop-blur-sm">
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">Neural Status</h3>
                  <p className="text-xs text-gray-600 font-medium">Monitoring resolution steps...</p>
                </div>
                
                <div className="w-full space-y-4">
                  <div className="space-y-4 bg-white/[0.01] p-8 rounded-2xl border border-white/[0.03] text-left">
                    {thinking.length > 0 ? (
                      thinking.map((line, i) => (
                        <p key={i} className="thinking-line text-[11px] font-bold uppercase tracking-widest text-gray-300 flex items-center gap-4">
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          {line}
                        </p>
                      ))
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Initializing...</p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleTimeUp}
                  className="text-[10px] font-bold uppercase tracking-widest text-gray-700 hover:text-white transition-all duration-300"
                >
                  Terminate & Reveal
                </button>
              </div>
            )}

            {/* SCORE CARD */}
            <div className="rounded-3xl glass-panel p-6 border border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Current Score</span>
                    <div className="text-3xl font-black text-vscode-accent">{score.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-vscode-accent/10 border border-vscode-accent/20 shadow-glow-blue/10">
                    <Trophy size={20} className="text-vscode-accent" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Accuracy</div>
                    <div className="text-sm font-bold">{totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0}%</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Streak</div>
                    <div className="text-sm font-bold">🔥 {streak}</div>
                  </div>
                </div>
                <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-vscode-accent transition-all duration-1000 shadow-glow-blue" style={{ width: `${Math.min(100, (correctAnswers / CHALLENGES.length) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengePage;
