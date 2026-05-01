import React, { useState, useEffect } from 'react';
import FileTree from './components/FileTree';
import CodeEditor from './components/CodeEditor';
import AIAssistant from './components/AIAssistant';
import LandingPage from './components/LandingPage';
import LogsPanel from './components/LogsPanel';
import GuidedCursor from './components/GuidedCursor';
import { api } from './services/api';
import { Bot, X, AlertCircle, CheckCircle2, GitPullRequest, ExternalLink, Sparkles } from 'lucide-react';

const DEFAULT_FILES = [
  { id: '1', name: 'main.py', path: '/main.py', content: 'def calculate_sum(a, b):\n    # There is a logical bug here\n    result = a - b \n    return result\n\nprint("Result:", calculate_sum(5, 3))\n' },
  { id: '2', name: 'utils.py', path: '/utils.py', content: 'def multiply(a, b):\n    return a * b\n' },
  { id: '3', name: 'config.json', path: '/config.json', content: '{\n  "version": "1.0.0"\n}\n' }
];

const DEMO_FILES = [
  { 
    id: 'demo-1', 
    name: 'main.py', 
    path: '/main.py', 
    content: 'from operations.add import add\nfrom operations.subtract import subtract\nfrom operations.multiply import multiply\nfrom utils.logger import log\n\nlog("Starting calculations...")\n\nval_a, val_b = 10, 5\n\nlog(f"Adding {val_a} and {val_b}")\nprint("Add:", add(val_a, val_b))\n\nlog(f"Subtracting {val_b} from {val_a}")\nprint("Subtract:", subtract(val_a, val_b))\n\nlog(f"Multiplying {val_a} and {val_b}")\nprint("Multiply:", multiply(val_a, val_b))\n' 
  },
  { 
    id: 'demo-2', 
    name: 'add.py', 
    path: '/operations/add.py', 
    content: 'def add(a, b):\n    return a + b\n' 
  },
  { 
    id: 'demo-3', 
    name: 'subtract.py', 
    path: '/operations/subtract.py', 
    content: 'def subtract(a, b):\n    # Intentional bug: adding instead of subtracting\n    return a + b\n' 
  },
  { 
    id: 'demo-4', 
    name: 'multiply.py', 
    path: '/operations/multiply.py', 
    content: 'def multiply(a, b):\n    return a * b\n' 
  },
  { 
    id: 'demo-5', 
    name: 'logger.py', 
    path: '/utils/logger.py', 
    content: 'def log(message):\n    print(f"[LOG]: {message}")\n' 
  }
];

function App() {
  console.log("App Rendering...");
  const [screen, setScreen] = useState('landing');
  const [isInitializing, setIsInitializing] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [showPRModal, setShowPRModal] = useState(false);

  const [files, setFiles] = useState(DEFAULT_FILES);
  const [selectedFileId, setSelectedFileId] = useState('1');
  
  const [code, setCode] = useState('');
  const [suggestedCode, setSuggestedCode] = useState(null);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [agentState, setAgentState] = useState(null);

  const [isAgentMode, setIsAgentMode] = useState(false);
  const [agentStatus, setAgentStatus] = useState('Idle');
  const [prDetails, setPrDetails] = useState(null);
  const [rejectedIssues, setRejectedIssues] = useState([]);
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentRepoUrl, setCurrentRepoUrl] = useState('');
  const [demoStep, setDemoStep] = useState(0);
  const [fixApplied, setFixApplied] = useState(false);

  const addLog = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, message, type }]);
  };

  // Check auth and server status on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await api.checkAuth();
        if (res.user) setUser(res.user);
        setServerError(false);
      } catch (e) {
        console.error("Auth check failed:", e);
        if (!e.response) {
          setServerError(true);
        }
      }
    };
    checkUser();
  }, []);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (rejectedIssues.length > 0) {
      setRejectedIssues([]);
    }
  };

  // Demo Step Controller (State-Driven)
  useEffect(() => {
    if (!isDemoMode || screen !== 'workspace') return;

    let nextStep = demoStep;

    if (!isAgentMode) {
      nextStep = 0; // Enable Agent Mode
    } else if (isAgentThinking) {
      nextStep = 2; // AI is thinking
    } else if (agentStatus === 'Idle' || (agentStatus === 'Monitoring' && !agentState?.error)) {
      nextStep = 1; // Run Loop / Analyze
    } else if (agentState?.error && suggestedCode && !fixApplied) {
      nextStep = 4; // Apply Fix
    } else if (!user) {
      nextStep = 5; // Login GitHub
    } else if (!currentRepoUrl) {
      nextStep = 7; // Paste Repo
    } else if (fixApplied || agentState?.error === 'No issues found') {
      nextStep = 11; // Create PR
    }

    if (nextStep !== demoStep) {
      console.log("%c DEMO STATE SYNC ", "background: #22d3ee; color: #000; font-weight: bold", { 
        step: nextStep,
        isAgentMode, 
        isAgentThinking, 
        agentStatus, 
        hasError: !!agentState?.error, 
        hasUser: !!user, 
        hasRepo: !!currentRepoUrl,
        fixApplied
      });
      setDemoStep(nextStep);
    }
  }, [isDemoMode, screen, isAgentMode, isAgentThinking, agentStatus, agentState, user, currentRepoUrl, fixApplied, suggestedCode, demoStep]);

  const restartDemo = () => {
    setIsAgentMode(false);
    setAgentStatus('Idle');
    setAgentState(null);
    setSuggestedCode(null);
    setFixApplied(false);
    setUser(null);
    setCurrentRepoUrl('');
    addLog("Demo restarted.", "info");
  };

  // Load file content when selected
  useEffect(() => {
    const file = files.find(f => f.id === selectedFileId);
    if (file) {
      setCode(file.content);
      setSuggestedCode(null);
      setAgentState(null);
      setPrDetails(null);
      setAgentStatus(isAgentMode ? 'Monitoring' : 'Idle');
    }
  }, [selectedFileId, files]);

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const updateFileContent = (newContent, fileId = selectedFileId) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content: newContent } : f));
  };

  const abortControllerRef = React.useRef(null);
  const isAgentRunning = React.useRef(false);

  const runAutonomousLoop = async (fileContent, fileId) => {
    if (isAgentThinking) return;
    setIsAgentThinking(true);
    const fileName = files.find(f => f.id === fileId)?.name || 'file';
    addLog(`Analyzing ${fileName}...`, 'loading');
    setAgentStatus('Analyzing...');
    isAgentRunning.current = true;
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    try {
      if (isDemoMode) {
        // SIMULATED DEMO FLOW
        await runSimulatedAgentFlow();
        return;
      }

      const res = await api.runAgent(fileContent, abortControllerRef.current.signal);
      if (!isAgentRunning.current) return;

      // Check if this specific issue was already rejected
      const issueId = `${fileId}-${res?.line}-${res?.error}`;
      const isRejected = rejectedIssues.includes(issueId);

      if (isRejected && res?.error !== 'No issues found') {
        setAgentState({ ...res, isIgnored: true });
        setSuggestedCode(null);
        addLog(`Issue ignored by user: ${res.error}`, 'info');
        setAgentStatus('Monitoring');
        return;
      }
      
      setAgentState(res || null);
      if (isDemoMode && demoStep === 10) {
        advanceDemo(11);
      }
      
      // STRICT SEPARATION: Only extract code, never raw JSON or metadata
      let cleanCode = fileContent;
      if (res && typeof res === 'object' && res.fixed_code) {
        cleanCode = String(res.fixed_code).trim();
      } else if (typeof res === 'string') {
        // Fallback for unexpected string responses
        cleanCode = res.trim();
      }
      
      setSuggestedCode(cleanCode);
      
      if (res?.error && res.error !== 'No issues found') {
        addLog(`Issue detected in ${fileName}: ${res.error}`, 'info');
        setAgentStatus('Fix ready');
      } else {
        addLog(`No issues found in ${fileName}.`, 'success');
        setAgentStatus('Code is clean');
      }
    } catch (e) {
      if (e.message === "Canceled") return;
      addLog(`Analysis failed: ${e.message}`, 'error');
      if (isAgentRunning.current) setAgentStatus('Error');
      
      // AUTO-FALLBACK TO DEMO ON FAILURE
      if (!isDemoMode) {
        addLog("Switching to offline demo mode for stability...", "warning");
        setIsDemoMode(true);
      }
    } finally {
      if (isAgentRunning.current) {
        setIsAgentThinking(false);
        isAgentRunning.current = false;
      }
    }
  };

  const runSimulatedAgentFlow = async () => {
    const steps = [
      { status: 'Analyzing', log: "Scanning repository structure...", delay: 800 },
      { status: 'Thinking', log: "Analyzing function calls in operations/subtract.py...", delay: 1200 },
      { status: 'Thinking', log: "Comparing logic with intended operation 'subtract'...", delay: 1000 },
      { status: 'Fixing', log: "Anomaly detected! Expected 'a - b', found 'a + b'.", delay: 900 },
      { status: 'Fix ready', log: "Fix generated successfully.", delay: 600 }
    ];

    for (const step of steps) {
      setAgentStatus(step.status);
      addLog(step.log, 'loading');
      await new Promise(r => setTimeout(r, step.delay));
    }

    const mockRes = {
      error: "Logical Anomaly: Incorrect Subtraction",
      explanation: "The function 'subtract' is currently using the '+' operator instead of '-'. This causes it to return the sum rather than the difference.",
      fixed_code: "def subtract(a, b):\n    # Corrected: using subtraction operator\n    return a - b\n",
      line: 3,
      steps: [
        { step: "Scan", detail: "Repository structure verified" },
        { step: "Analyze", detail: "Logical flow audit completed" },
        { step: "Detection", detail: "Operator mismatch found in subtract.py" },
        { step: "Reasoning", detail: "Intent 'subtract' implies '-' operation" }
      ]
    };

    const issueId = `demo-3-3-Logical Anomaly: Incorrect Subtraction`;
    if (rejectedIssues.includes(issueId)) {
      setAgentState({ ...mockRes, isIgnored: true });
      setSuggestedCode(null);
      addLog("Issue ignored per user decision.", "info");
      setAgentStatus('Monitoring');
    } else {
      setAgentState(mockRes);
      setSuggestedCode(mockRes.fixed_code);
      addLog("AI Detection: Expected 'a - b', Found 'a + b'", "error");
      addLog("Fix ready for review.", "success");
      setAgentStatus('Fix ready');
    }
    setIsAgentThinking(false);
  };

  const handleCreatePR = async () => {
    if (isDemoMode) {
      addLog("Simulating Pull Request creation...", "loading");
      setIsAgentThinking(true);
      await new Promise(r => setTimeout(r, 1800));
      setIsAgentThinking(false);
      setShowPRModal(true);
      addLog("PR Created successfully (Simulated)", "success");
      return;
    }

    if (!user) {
      addLog("Please login with GitHub first", "error");
      return;
    }
    const currentFile = files?.find(f => f.id === selectedFileId);
    if (!currentFile || !suggestedCode) return;

    addLog(`Initiating Pull Request for ${currentFile.path}...`, 'loading');
    setIsAgentThinking(true);
    try {
      const res = await api.createPR(currentRepoUrl, currentFile.path, suggestedCode);
      if (res.success) {
        addLog(`Pull Request created successfully!`, 'success');
        addLog(`URL: ${res.pr_url}`, 'success');
        window.open(res.pr_url, '_blank');
      } else {
        addLog(`PR Failed: ${res.error}`, 'error');
      }
    } catch (e) {
      addLog(`PR Error: ${e.message}`, 'error');
    } finally {
      setIsAgentThinking(false);
    }
  };

  // Real-time analysis with debounce
  useEffect(() => {
    if (!isAgentMode || screen !== 'workspace' || !code) return;
    
    const currentFile = files.find(f => f.id === selectedFileId);
    if (currentFile && currentFile.content === code && agentStatus !== 'Monitoring') return;

    const timer = setTimeout(() => {
      updateFileContent(code, selectedFileId);
      runAutonomousLoop(code, selectedFileId);
    }, 1000);

    return () => clearTimeout(timer);
  }, [code, isAgentMode, screen, selectedFileId]);

  const manualRunTests = async () => {
    setIsAgentThinking(true);
    addLog("Running execution tests...", "loading");
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1200));
        const isFixed = code.includes('a - b');
        setAgentState(prev => ({ 
          ...prev, 
          result: isFixed ? "Success: All tests passed!" : "Failed: subtract(10, 5) returned 15 instead of 5",
          testOutput: isFixed ? "[LOG]: Starting calculations...\n[LOG]: Adding 10 and 5\nAdd: 15\n[LOG]: Subtracting 5 from 10\nSubtract: 5\n[LOG]: Multiplying 10 and 5\nMultiply: 50\n\nAll tests passed (3/3)" : "[LOG]: Starting calculations...\n[LOG]: Adding 10 and 5\nAdd: 15\n[LOG]: Subtracting 5 from 10\nSubtract: 15\n\nERROR: Assertion failed in subtract.py\nExpected: 5, Found: 15",
          testPassed: isFixed
        }));
        if (isFixed) {
          addLog("Tests passed successfully!", "success");
        } else {
          addLog("Tests failed: Logic mismatch in subtract.py", "error");
        }
        return;
      }

      const res = await api.runTests(code);
      setAgentState(prev => ({ 
        ...prev, 
        result: res.passed ? "Success: All tests passed!" : `Failed: ${res.error || 'Execution error'}`,
        testOutput: res.output,
        testPassed: res.passed
      }));
      if (res.passed) {
        addLog("Tests passed successfully!", "success");
      } else {
        addLog(`Tests failed: ${res.error}`, "error");
      }
    } catch (e) {
      console.error(e);
      addLog("Test execution failed.", "error");
    } finally { setIsAgentThinking(false); }
  };

  const manualRunAgent = () => {
    runAutonomousLoop(code, selectedFileId);
  };

  const toggleAgentMode = () => {
    const newMode = !isAgentMode;
    setIsAgentMode(newMode);
    
    if (!newMode) {
      // Turning OFF
      isAgentRunning.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsAgentThinking(false);
      setAgentStatus('Idle');
    } else {
      // Turning ON
      setAgentStatus('Monitoring');
    }
  };

  const handleFileApplied = () => {
    if (!suggestedCode || suggestedCode === code) {
      addLog("No changes to apply or invalid fix.", "info");
      return;
    }
    
    // Final safety trim
    const cleanCode = String(suggestedCode).trim();
    
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      addLog("Critical: Attempted to apply JSON as code. Aborting.", "error");
      return;
    }

    addLog("Applying AI fix to editor...", "success");
    setCode(cleanCode);
    updateFileContent(cleanCode);
    setSuggestedCode(null);
    setAgentStatus('Monitoring'); // Set back to Monitoring to allow next step detection
    setFixApplied(true);
    
    if (isDemoMode) {
      addLog("Logic Verified: subtract(10, 5) => 5 ✓", "success");
    }
  };

  const handleFileRejected = () => {
    if (agentState?.error) {
      const issueId = `${selectedFileId}-${agentState.line}-${agentState.error}`;
      setRejectedIssues(prev => [...prev, issueId]);
      addLog(`Issue rejected and ignored: ${agentState.error}`, 'info');
    }

    setAgentState(prev => ({
      ...prev,
      error: null,
      explanation: null
    }));
    setSuggestedCode(null);
    setAgentStatus('Monitoring');
    console.log("Fix rejected, closing panel.");
  };

  const loadFileContent = (fileId) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setSelectedFileId(fileId);
      // Content update is handled by useEffect
    }
  };

  // --- Landing Page Routing logic ---
  const handleEnterWorkspace = () => {
    setIsInitializing(true);
    setTimeout(() => {
      setIsInitializing(false);
      setScreen('workspace');
    }, 1200);
  };

  const handleDemoProject = async () => {
    setIsInitializing(true);
    addLog("Initializing demo project environment...", "loading");
    
    setTimeout(() => {
      setIsInitializing(false);
      setScreen('workspace');
      setFiles(DEMO_FILES);
      setSelectedFileId('demo-3'); // Start on subtract.py
      setIsAgentMode(false); // SHOULD START AS OFF
      setAgentStatus('Idle');
      setFixApplied(false);
      addLog("Demo loaded: 'Mathematics Operations' project.", "success");
      addLog("Hint: Look at subtract.py for the logic bug.", "info");
      
      // Analysis is triggered manually in Step 1
    }, 1200);
  };

  if (serverError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-center p-10" style={{ background: '#050B18', color: '#f1f5f9' }}>
        <div className="max-w-md">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2">Server Connection Error</h1>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            The AI backend server is currently unreachable. Please ensure the Flask app is running on localhost:5000.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full font-bold text-white transition-all active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'landing') {
    if (isInitializing) {
      return (
        <div className="h-screen w-screen bg-vscode-bg flex flex-col items-center justify-center text-vscode-text font-sans">
          <div className="w-10 h-10 border-4 border-vscode-border border-t-vscode-accent rounded-full animate-spin mb-6 shadow-lg shadow-blue-500/20" />
          <div className="animate-pulse tracking-[0.2em] uppercase text-xs font-semibold text-gray-400">
            Initializing AI Agent...
          </div>
        </div>
      );
    }
    return <LandingPage onEnter={handleEnterWorkspace} onDemo={handleDemoProject} />;
  }

  // --- Main Workspace ---
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-vscode-text font-sans animate-fade-in"
      style={{ background: '#0B0F19' }}>

      {isDemoMode && screen === 'workspace' && (
        <div className="h-10 bg-vscode-accent/10 border-b border-vscode-accent/20 flex items-center justify-between px-6 z-50 animate-fade-in backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles size={14} className="text-vscode-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-vscode-accent">
              🎯 Guided Demo — Follow the cursor to experience the agent flow
            </span>
          </div>
          <button 
            onClick={restartDemo}
            className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            Restart Demo
          </button>
        </div>
      )}
      <header className="h-14 flex items-center px-8 shrink-0 justify-between glass-panel"
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          zIndex: 40
        }}>
        <div
          className="font-black tracking-tighter text-lg flex items-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setScreen('landing')}
        >
          <Bot size={22} className="text-cyan-400 mr-2.5 animate-float" />
          <span className="text-gradient font-black">
            DevAgent <span className="text-[10px] text-gray-500 font-bold tracking-widest ml-2 opacity-50">PRO</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 mr-4">
            <span className={`text-[9px] font-black uppercase tracking-widest ${isDemoMode ? 'text-cyan-400' : 'text-gray-500'}`}>Demo</span>
            <button 
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`w-8 h-4 rounded-full relative transition-all duration-300 ${isDemoMode ? 'bg-cyan-500' : 'bg-gray-700'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-all duration-300 ${isDemoMode ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className={`text-[9px] font-black uppercase tracking-widest ${!isDemoMode ? 'text-blue-400' : 'text-gray-500'}`}>Real</span>
          </div>

          {isAgentThinking && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-400 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 shadow-glow-blue animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Agent Processing
            </div>
          )}
          
          {user ? (
            <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-full pl-1.5 pr-4 py-1.5">
              <img src={user.avatar_url || "https://github.com/identicons/demo.png"} alt={user.login} className="w-7 h-7 rounded-full border border-white/10 shadow-sm" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white leading-tight">{user.name || user.login}</span>
                <span className="text-[9px] text-gray-500 font-bold tracking-wider leading-tight">GitHub Connected</span>
              </div>
              <button 
                onClick={handleLogout}
                className="ml-2 p-1.5 hover:bg-white/10 rounded-full text-gray-500 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button 
              id="github-login-btn"
              onClick={() => {
                if (isDemoMode) {
                  setUser({ name: 'Demo User', login: 'demo-dev', avatar_url: '' });
                  addLog("Simulated GitHub login success.", "success");
                } else {
                  window.location.href = "http://localhost:5000/login/github";
                }
              }}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white px-5 py-2 rounded-full bg-vscode-accent hover:bg-vscode-accent/80 shadow-glow-blue transition-all active:scale-95"
            >
              Login with GitHub
            </button>
          )}
        </div>
      </header>


      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 flex flex-col shrink-0">
          <div className="flex-1 overflow-hidden">
            <FileTree 
              files={files} 
              setFiles={setFiles}
              selectedFileId={selectedFileId} 
              setSelectedFileId={loadFileContent}
              onLog={addLog}
              onRepoLoaded={setCurrentRepoUrl}
            />
          </div>
          <div className="h-64 shrink-0">
            <LogsPanel logs={logs} />
          </div>
        </div>
        
        <CodeEditor 
          code={code} 
          setCode={handleCodeChange} 
          suggestedCode={suggestedCode}
          agentState={agentState}
          isAgentThinking={isAgentThinking}
          isAgentMode={isAgentMode}
          setIsAgentMode={toggleAgentMode}
          onRunTests={manualRunTests}
          onRunAgent={manualRunAgent}
          onFixApplied={handleFileApplied}
          onFixRejected={handleFileRejected}
          onCreatePR={handleCreatePR}
          activeFileName={files?.find(f => f.id === selectedFileId)?.name || 'Editor'}
        />
        <AIAssistant 
          agentState={agentState} 
          isAgentThinking={isAgentThinking}
          agentStatus={agentStatus}
          prDetails={prDetails}
          isDemoMode={isDemoMode}
        />
      </div>

      {/* ── PR SUCCESS MODAL ── */}
      {showPRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowPRModal(false)} />
          <div className="relative w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(34,211,238,0.2)] animate-fade-up"
            style={{ background: '#0B0F19' }}>
            
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow-green">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              
              <h2 className="text-2xl font-black text-white mb-2">Pull Request Created!</h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed px-4">
                The AI fix has been successfully verified and packaged into a new PR on your repository.
              </p>
              
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-left mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <GitPullRequest size={18} className="text-white" />
                  <div className="text-xs font-black text-white uppercase tracking-tighter">user/demo-repo</div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-gray-600 font-bold">Branch</span>
                    <span className="text-cyan-400 font-black">fix/subtract-bug</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-gray-600 font-bold">Commit</span>
                    <span className="text-white font-black italic">"Fix incorrect subtraction logic"</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-gray-600 font-bold">Status</span>
                    <span className="flex items-center gap-1.5 text-green-400 font-black">
                      <ShieldCheck size={12} /> VERIFIED
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPRModal(false)}
                  className="flex-1 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-xs text-white uppercase tracking-widest transition-all"
                >
                  Close
                </button>
                <a 
                  href="https://github.com/demo/repo/pull/1" 
                  target="_blank"
                  className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-vscode-accent hover:opacity-90 rounded-2xl font-black text-xs text-white uppercase tracking-widest transition-all shadow-glow-blue"
                >
                  View PR <ExternalLink size={14} />
                </a>
              </div>
            </div>
            
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />
          </div>
        </div>
      )}
      {/* ── GUIDED CURSOR ── */}
      <GuidedCursor step={demoStep} isVisible={isDemoMode && screen === 'workspace'} />
    </div>
  );
}

function ShieldCheck({ size = 16, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default App;
