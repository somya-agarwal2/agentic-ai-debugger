import React, { useState, useEffect } from 'react';
import FileTree from './components/FileTree';
import CodeEditor from './components/CodeEditor';
import AIAssistant from './components/AIAssistant';
import LandingPage from './components/LandingPage';
import LogsPanel from './components/LogsPanel';
import CursorGuide from './components/demo/CursorGuide';
import AgentPipeline from './components/AgentPipeline';
import PRWorkflow from './components/PRWorkflow';
import IssuesPanel from './components/IssuesPanel';
import ChallengePage from './components/challenge/ChallengePage';
import { api } from './services/api';
import { useDemoController } from './hooks/useDemoController';
import { DEMO_STEPS } from './constants/demoSteps';
import { Bot, X, AlertCircle, CheckCircle2, GitPullRequest, ExternalLink, Sparkles, ShieldCheck, Search, LayoutPanelLeft } from 'lucide-react';

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
  const [isDemoMode, setIsDemoMode] = useState(false); // DEFAULT TO FALSE
  const [isGuidedDemoActive, setIsGuidedDemoActive] = useState(false);
  const [showPRWorkflow, setShowPRWorkflow] = useState(false);
  const [prUrl, setPrUrl] = useState(null);

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
  const [fixApplied, setFixApplied] = useState(false);
  const [pipelineStep, setPipelineStep] = useState('scan');
  const [pipelineExplanation, setPipelineExplanation] = useState('');
  const [repositoryIssues, setRepositoryIssues] = useState([]);
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [sidebarTab, setSidebarTab] = useState('pipeline'); // 'pipeline' | 'issues'

  const { currentStep, config: demoConfig, demoError, restart: restartDemoLogic } = useDemoController(isDemoMode, {
    isAgentMode,
    agentStatus,
    agentState,
    user,
    currentRepoUrl,
    fixApplied,
    isAgentThinking,
    screen
  });

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

  // Cleaned up old demoStep useEffect

  const restartDemo = () => {
    restartDemoLogic();
    setIsAgentMode(false);
    setAgentStatus('Idle');
    setAgentState(null);
    setSuggestedCode(null);
    setFixApplied(false);
    setUser(null);
    setCurrentRepoUrl('');
    setIsGuidedDemoActive(true);
    addLog("Demo restarted.", "info");
  };

  const cleanAIResponse = (text) => {
    if (!text) return '';
    return text
      .replace(/\\n/g, '\n') // Fix escaped newlines
      .replace(/```[\s\S]*?```/g, '') // Remove markdown blocks
      .trim();
  };

  // Auto-analyze when files change (new repo loaded)
  useEffect(() => {
    if (files && files.length > 3 && !isAnalyzingRepo) {
      // Small delay to ensure UI stability
      const timer = setTimeout(() => {
        analyzeRepository();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [files]);

  // Load file content when selected
  useEffect(() => {
    const file = files.find(f => f.id === selectedFileId);
    if (file) {
      setCode(file.content);
      // [MULTI-FILE UPGRADE] Do not clear agent state here, clear it in loadFileContent instead
      setPrDetails(null);
      if (!agentState) {
        setAgentStatus(isAgentMode ? 'Monitoring' : 'Idle');
      }
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

      setPipelineStep('scan');
      await new Promise(r => setTimeout(r, 1000));
      setPipelineStep('analyze');
      await new Promise(r => setTimeout(r, 1200));

      const res = await api.runAgent(fileContent, abortControllerRef.current.signal);
      setPipelineStep('detect');
      await new Promise(r => setTimeout(r, 800));
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
      
      setPipelineStep('reason');
      setPipelineExplanation(res.explanation?.split('.')[0] + '.' || "Found logic discrepancy.");
      await new Promise(r => setTimeout(r, 1500));
      
      // [MULTI-FILE UPGRADE] Do not set agentState directly during analysis
      // setAgentState(res || null); 
      
      setPipelineStep('generate');
      await new Promise(r => setTimeout(r, 1000));
      if (isDemoMode && demoStep === 10) {
        advanceDemo(11);
      }
      
      // Extract fixed_code — backend returns it as 'fixed_code' (or legacy 'fix')
      let cleanCode = null;
      if (res && typeof res === 'object') {
        const rawFix = res?.fixed_code || res?.fix || null;
        if (rawFix && typeof rawFix === 'string') {
          cleanCode = cleanAIResponse(rawFix);
        }
      } else if (typeof res === 'string') {
        cleanCode = cleanAIResponse(res);
      }
      
      // Duplicate detection
      if (cleanCode && cleanCode.trim() === fileContent.trim()) {
        addLog("AI returned identical code. No fix needed.", "info");
        setAgentStatus('Monitoring');
        setSuggestedCode(null);
        setAgentState(null);
        return;
      }
      
      console.log("[DevAgent] AI Response:", res);
      console.log("[DevAgent] Fixed Code before rendering:", cleanCode);
      
      // [MULTI-FILE UPGRADE] Add to repositoryIssues instead of auto-showing
      if (res?.error && res.error !== 'No issues found' && cleanCode) {
        const newIssue = {
          id: `issue-${Date.now()}-${fileName}`,
          fileId: fileId,
          fileName: fileName,
          error: res.error,
          explanation: res.explanation || "",
          fixed_code: cleanCode,
          agentState: res
        };
        
        setRepositoryIssues(prev => {
          // Avoid duplicates for the same file
          const filtered = prev.filter(iss => iss.fileId !== fileId);
          return [...filtered, newIssue];
        });
        
        addLog(`Issue detected in ${fileName}: ${res.error}`, 'info');
        setAgentStatus('Monitoring');
      } else {
        addLog(`No issues found in ${fileName}.`, 'success');
        setAgentStatus('Monitoring');
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

  const analyzeRepository = async () => {
    if (isAnalyzingRepo || !files || files.length === 0) return;
    
    setIsAnalyzingRepo(true);
    setAnalysisProgress(0);
    // Silent analysis — don't auto-switch tab unless requested
    addLog("Starting background repository analysis...", "info");
    setPipelineStep('scan');
    setPipelineExplanation("Scanning all files silently...");

    try {
      if (isDemoMode) {
        // Simulated background analysis
        setRepositoryIssues([]);
        let mockIssues = [];
        for (let i = 0; i < Math.min(files.length, 5); i++) {
          await new Promise(r => setTimeout(r, 600));
          setAnalysisProgress(Math.round(((i + 1) / 5) * 100));
          if (files[i].name === 'subtract.py') {
            const issue = {
              id: `issue-${Date.now()}`,
              fileId: files[i].id,
              fileName: files[i].name,
              error: "Logical Anomaly: Operator Mismatch",
              explanation: "The function is using '+' instead of '-'.",
              fixed_code: files[i].content.replace('+', '-'),
              agentState: {
                error: "Operator Mismatch",
                explanation: "The function is using '+' instead of '-'.",
                fixed_code: files[i].content.replace('+', '-')
              }
            };
            mockIssues.push(issue);
            setRepositoryIssues([...mockIssues]);
          }
        }
      } else {
        const res = await api.analyzeRepo(); // Call the new backend endpoint
        const list = Array.isArray(res?.issues_list) ? res.issues_list : [];
        
        if (list.length > 0) {
          const formattedIssues = list.map(iss => ({
            id: `issue-${Date.now()}-${iss.file}`,
            fileId: files.find(f => f.name === iss.file)?.id,
            fileName: iss.file || "Unknown",
            error: iss.issue ? "Logical Bug Detected" : "No Issue",
            explanation: iss.explanation || "",
            fixed_code: iss.fix || null,
            agentState: {
              error: iss.issue ? "Logical Bug Detected" : "No Issue",
              explanation: iss.explanation || "",
              fixed_code: iss.fix || null
            }
          })).filter(iss => iss.fixed_code); // Only show actual issues
          setRepositoryIssues(formattedIssues);
        } else {
          setRepositoryIssues([]);
        }
      }
      addLog(`Background analysis complete. Found ${repositoryIssues.length} potential issues.`, 'success');
    } catch (err) {
      console.error("Repo analysis failed:", err);
      addLog("Background analysis encountered an error.", "error");
    } finally {
      setIsAnalyzingRepo(false);
      setPipelineStep('generate');
      setPipelineExplanation("Idle");
    }
  };

  const handleIssueClick = (issue) => {
    if (!issue) return;
    setSelectedFileId(issue.fileId);
    setAgentState(issue.agentState || null);
    setSuggestedCode(issue.fixed_code || null);
    setAgentStatus('Fix ready');
    setSidebarTab('pipeline'); // Switch back to see reasoning if needed, or stay
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
    if (!rejectedIssues.includes(issueId)) {
      const newIssue = {
        id: `issue-demo-${Date.now()}`,
        fileId: 'demo-3',
        fileName: 'subtract.py',
        error: mockRes.error,
        explanation: mockRes.explanation,
        fixed_code: mockRes.fixed_code,
        agentState: mockRes
      };
      setRepositoryIssues(prev => {
        const filtered = prev.filter(iss => iss.fileId !== 'demo-3');
        return [...filtered, newIssue];
      });
      addLog("AI Detection: Expected 'a - b', Found 'a + b'", "error");
      addLog("New issue added to Issues tab.", "success");
    }
    setAgentStatus('Monitoring');
    setIsAgentThinking(false);
  };

  const handleCreatePR = () => {
    // Show the PR preview/workflow panel first
    setShowPRWorkflow(true);
  };

  const executePR = async () => {
    if (isDemoMode) {
      await new Promise(r => setTimeout(r, 1800));
      addLog("PR Created successfully (Simulated)", "success");
      setPrUrl('https://github.com/demo/repo/pull/1');
      return;
    }

    if (!user) {
      addLog("Please login with GitHub first", "error");
      return;
    }
    const currentFile = files?.find(f => f.id === selectedFileId);
    if (!currentFile || !suggestedCode) return;

    addLog(`Initiating Pull Request for ${currentFile.path}...`, 'loading');
    try {
      const res = await api.createPR(currentRepoUrl, currentFile.path, suggestedCode);
      if (res?.success) {
        addLog(`Pull Request created successfully!`, 'success');
        addLog(`URL: ${res?.pr_url}`, 'success');
        setPrUrl(res?.pr_url);
        setPipelineStep('pr');
      } else {
        addLog(`PR Failed: ${res?.error || "Unknown error"}`, 'error');
      }
    } catch (e) {
      addLog(`PR Error: ${e.message}`, 'error');
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
        result: res?.passed ? "Success: All tests passed!" : `Failed: ${res?.error || 'Execution error'}`,
        testOutput: res?.output || "",
        testPassed: !!res?.passed
      }));
      if (res?.passed) {
        addLog("Tests passed successfully!", "success");
      } else {
        addLog(`Tests failed: ${res?.error || "Execution failed"}`, "error");
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

    setPipelineStep('apply');
    addLog("Applying AI fix to editor...", "success");
    setCode(cleanCode);
    updateFileContent(cleanCode);
    setSuggestedCode(null);
    setAgentStatus('Monitoring'); // Set back to Monitoring to allow next step detection
    setFixApplied(true);
    
    setTimeout(async () => {
       setPipelineStep('verify');
       await new Promise(r => setTimeout(r, 1500));
       if (isDemoMode) {
         addLog("Logic Verified: subtract(10, 5) => 5 ✓", "success");
       }
    }, 500);
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

  const handleCloseIssue = () => {
    setAgentState(null);
    setSuggestedCode(null);
    setAgentStatus('Monitoring');
  };

  const loadFileContent = (fileId) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setSelectedFileId(fileId);
      // [MULTI-FILE UPGRADE] Clear issue view when manually selecting a file from tree
      setAgentState(null);
      setSuggestedCode(null);
    }
  };

  // --- Landing Page Routing logic ---
  const handleEnterWorkspace = () => {
    setIsInitializing(true);
    setIsDemoMode(false);
    setIsGuidedDemoActive(false);
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
      setIsAgentMode(false); // START AS OFF
      setAgentStatus('Idle');
      setFixApplied(false);
      setIsDemoMode(true);
      setIsGuidedDemoActive(true);
      addLog("Demo loaded: 'Mathematics Operations' project.", "success");
      addLog("Hint: Audit subtract.py to find the logic bug.", "info");
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
    return <LandingPage onEnter={handleEnterWorkspace} onDemo={handleDemoProject} onChallenge={() => setScreen('challenge')} />;
  }

  if (screen === 'challenge') {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: '#0B0F19' }}>
        <header className="h-14 flex items-center px-8 shrink-0 justify-between glass-panel border-b border-white/5 z-50">
          <div className="font-black tracking-tighter text-lg flex items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setScreen('landing')}>
            <Bot size={22} className="text-cyan-400 mr-2.5 animate-float" />
            <span className="text-gradient font-black">DevAgent</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setScreen('workspace')} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Workspace</button>
            <button onClick={() => setScreen('challenge')} className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border-b-2 border-cyan-400 py-1">Challenge</button>
            <button onClick={() => setScreen('landing')} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Home</button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <ChallengePage onBackToHome={() => setScreen('landing')} />
        </div>
      </div>
    );
  }

  if (!repositoryIssues) return null;

  // --- Main Workspace ---
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-vscode-text font-sans animate-fade-in"
      style={{ background: '#0B0F19' }}>

      {isDemoMode && screen === 'workspace' && (
        <div className="h-10 bg-vscode-accent/10 border-b border-vscode-accent/20 flex items-center justify-between px-6 z-50 animate-fade-in backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles size={14} className="text-vscode-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-vscode-accent">
              {demoError ? (
                <span className="text-red-400 animate-pulse">⚠️ {demoError}</span>
              ) : (
                "🎯 Guided Demo — Follow the cursor to experience the agentic workflow"
              )}
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
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => setScreen('workspace')} className={`text-[10px] font-black uppercase tracking-widest transition-colors ${screen === 'workspace' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>Workspace</button>
            <button onClick={() => setScreen('challenge')} className={`text-[10px] font-black uppercase tracking-widest transition-colors ${screen === 'challenge' ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}>Challenge</button>
            <button className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300">Docs</button>
          </nav>
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
              <img src={user?.avatar_url || "https://github.com/identicons/demo.png"} alt={user?.login || "User"} className="w-7 h-7 rounded-full border border-white/10 shadow-sm" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white leading-tight">{user?.name || user?.login || "User"}</span>
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
                  setUser({ name: 'Demo Engineer', login: 'demo-pro', avatar_url: 'https://github.com/identicons/demo.png' });
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
          onCloseIssue={handleCloseIssue}
          onCreatePR={handleCreatePR}
          activeFileName={files?.find(f => f.id === selectedFileId)?.name || 'Editor'}
        />
        <div className="w-80 flex flex-col shrink-0 gap-0 overflow-hidden border-l border-white/5" style={{ background: '#05080E' }}>
          {/* Sidebar Tabs */}
          <div className="flex border-b border-white/5 bg-white/[0.02]">
            <button
              onClick={() => setSidebarTab('pipeline')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                sidebarTab === 'pipeline' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <LayoutPanelLeft size={12} />
              Pipeline
            </button>
            <button
              onClick={() => setSidebarTab('issues')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                sidebarTab === 'issues' ? 'text-red-400 border-b-2 border-red-400 bg-red-400/5' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Search size={12} />
              Issues
              {repositoryIssues.length > 0 && (
                <span className="absolute top-2 right-4 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center animate-bounce shadow-glow-red">
                  {repositoryIssues.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'pipeline' ? (
              <div className="p-4 space-y-4">
                <AgentPipeline 
                  currentStepId={pipelineStep} 
                  status={agentStatus} 
                  explanation={pipelineExplanation} 
                />
                <AIAssistant 
                  agentState={agentState} 
                  isAgentThinking={isAgentThinking}
                  agentStatus={agentStatus}
                  prDetails={prDetails}
                  isDemoMode={isDemoMode}
                />
                {!isAnalyzingRepo && (
                  <button
                    onClick={analyzeRepository}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all group"
                  >
                    Scan Full Repository
                  </button>
                )}
              </div>
            ) : (
              <IssuesPanel 
                issues={repositoryIssues}
                onIssueClick={handleIssueClick}
                selectedIssueId={selectedFileId}
                isAnalyzing={isAnalyzingRepo}
                progress={analysisProgress}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── PR WORKFLOW (Preview → Creating → Success) ── */}
      <PRWorkflow
        isOpen={showPRWorkflow}
        onClose={() => setShowPRWorkflow(false)}
        onConfirm={executePR}
        agentState={agentState}
        currentFile={files?.find(f => f.id === selectedFileId)}
        suggestedCode={suggestedCode}
        isDemoMode={isDemoMode}
        prUrl={prUrl}
      />

      {/* ── GUIDED CURSOR ── */}
      {isGuidedDemoActive && isDemoMode && screen === 'workspace' && [
        DEMO_STEPS.ENABLE_AGENT,
        DEMO_STEPS.APPLY_FIX,
        DEMO_STEPS.GITHUB_LOGIN,
        DEMO_STEPS.PASTE_REPO,
        DEMO_STEPS.CREATE_PR
      ].includes(currentStep) && (
        <CursorGuide config={demoConfig} isVisible={true} />
      )}
    </div>
  );
}

export default App;
