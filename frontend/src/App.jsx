import React, { useState, useEffect, useRef } from 'react';
import FileTree from './components/FileTree';
import CodeEditor from './components/CodeEditor';
import AIAssistant from './components/AIAssistant';
import LandingPage from './pages/LandingPage';
import ChallengePage from './pages/ChallengePage';
import LogsPanel from './components/LogsPanel';
import CursorGuide from './components/demo/CursorGuide';
import AgentPipeline from './components/AgentPipeline';
import PRWorkflow from './components/PRWorkflow';
import IssuesPanel from './components/IssuesPanel';
import PromptEditor from './components/PromptEditor';
import { api } from './services/api';
import { useDemoController } from './hooks/useDemoController';
import { DEMO_STEPS } from './constants/demoSteps';
import JSZip from 'jszip';
import { Bot, X, AlertCircle, CheckCircle2, GitPullRequest, ExternalLink, Sparkles, ShieldCheck, Search, LayoutPanelLeft, Settings2, Download, Home } from 'lucide-react';

const DEFAULT_FILES = [];

const DEMO_DATA = {
  files: [
    { id: 'demo-1', name: 'sum.py', path: '/sum.py', content: 'def calculate_sum(a, b):\n    # Logical bug: using subtraction instead of addition\n    return a - b\n' },
    { id: 'demo-2', name: 'index.html', path: '/index.html', content: '<h1>Hello World</h1>' }
  ],
  issue: {
    id: 'issue-0-sum.py',
    fileId: 'demo-1',
    fileName: 'sum.py',
    error: 'Logical Anomaly: Incorrect Operator',
    explanation: 'The calculate_sum function is using "-" instead of "+", causing incorrect totals.',
    fixed_code: 'def calculate_sum(a, b):\n    # Corrected: using addition operator\n    return a + b\n',
    agentState: {
      error: 'Logical Anomaly: Incorrect Operator',
      explanation: 'Using "-" instead of "+"',
      trace: ['\ud83e\uddea Execution Trace:', 'Line 1: def calculate_sum(a, b):', 'Line 3: return a - b \u2192 incorrect'],
      steps: [{ step: 'Anomaly Detected', reasoning: 'Function sum is using subtraction instead of addition.' }]
    }
  }
};

// Second demo repository — used after GitHub login + URL paste
const DEMO_REPO_2 = {
  repoLabel: 'github.com/devagent-demo/mathematics-suite',
  files: [
    {
      id: 'repo2-1', name: 'subtract.py', path: '/subtract.py',
      content: 'def subtract(a, b):\n    # BUG: should subtract but multiplies\n    return a * b\n\nresult = subtract(10, 3)\nprint(result)  # Prints 30, expected 7\n'
    },
    {
      id: 'repo2-2', name: 'validator.py', path: '/validator.py',
      content: 'def is_positive(n):\n    # BUG: wrong comparison operator\n    return n < 0\n'
    },
    {
      id: 'repo2-3', name: 'config.py', path: '/config.py',
      content: 'MAX_RETRIES = 0   # BUG: should be 3\nTIMEOUT = -1      # BUG: negative timeout\nDEBUG = True\n'
    },
  ],
  issues: [
    {
      id: 'r2-issue-0',
      fileId: 'repo2-1',
      fileName: 'subtract.py',
      error: 'Operator Mismatch: Multiplication instead of Subtraction',
      explanation: 'subtract() uses "*" instead of "-", returning the product instead of the difference.',
      fixed_code: 'def subtract(a, b):\n    # FIXED: correct subtraction operator\n    return a - b\n\nresult = subtract(10, 3)\nprint(result)  # Prints 7\n',
      agentState: {
        error: 'Operator Mismatch: Multiplication instead of Subtraction',
        explanation: 'subtract() uses "*" instead of "-".',
        trace: ['\ud83e\uddea Trace: subtract(10, 3)', 'Line 3: return a * b \u2192 30 (wrong)', 'Expected: a - b \u2192 7'],
        steps: [{ step: 'Bug Isolated', reasoning: 'Wrong operator found on line 3 of subtract.py.' }]
      }
    },
    {
      id: 'r2-issue-1',
      fileId: 'repo2-2',
      fileName: 'validator.py',
      error: 'Logic Inversion: is_positive returns wrong boolean',
      explanation: 'is_positive() uses "<" when it should use ">", inverting the result.',
      fixed_code: 'def is_positive(n):\n    # FIXED: correct comparison\n    return n > 0\n',
      agentState: {
        error: 'Logic Inversion',
        explanation: 'Comparison operator is reversed — "<" should be ">".',
        trace: ['is_positive(-5) \u2192 True (wrong)', 'is_positive(5) \u2192 False (wrong)'],
        steps: [{ step: 'Inversion Detected', reasoning: 'Operator "<" produces inverted boolean.' }]
      }
    }
  ]
};

function App() {
  console.log("App Rendering...");
  const [screen, setScreen] = useState('landing');
  const [isInitializing, setIsInitializing] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false); // DEFAULT TO FALSE
  const [isGuidedDemoActive, setIsGuidedDemoActive] = useState(false);
  const [showPRWorkflow, setShowPRWorkflow] = useState(false);
  const [prUrl, setPrUrl] = useState(null);

  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  
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
  const [isFixPanelOpen, setIsFixPanelOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('pipeline'); // 'pipeline' | 'issues' | 'prompts'

  const { currentStep, config: demoConfig, demoError, restart: restartDemoLogic } = useDemoController(isDemoMode, {
    isAgentMode,
    agentStatus,
    agentState,
    user,
    files,
    selectedFileId,
    currentRepoUrl,
    fixApplied,
    isAgentThinking,
    screen,
    sidebarTab,
    selectedIssueId: agentState?.id,
    prUrl,
    repositoryIssues,
    isAnalyzingRepo,
    showPRWorkflow
  });

  const addLog = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, message, type }]);
  };

  const fetchAuthStatus = async () => {
    try {
      const res = await api.checkAuth();
      if (res.user) setUser(res.user);
      else setUser(null);
      setServerError(false);
    } catch (e) {
      console.error("Auth check failed:", e);
      if (!e.response) {
        setServerError(true);
      }
      setUser(null);
    }
  };

  // Check auth and server status on mount
  useEffect(() => {
    fetchAuthStatus();
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

  // ── DEMO PHASE 2: Load new repo + trigger fresh analysis (runs ONCE per demo) ──
  const phase2Ran = useRef(false);
  useEffect(() => {
    if (!isDemoMode || currentStep !== 'load_repo') return;
    if (phase2Ran.current) return;          // guard: fire exactly once
    phase2Ran.current = true;

    const timer = setTimeout(async () => {
      // Reset workspace for fresh repo
      setRepositoryIssues([]);
      setAgentState(null);
      setSuggestedCode(null);
      setFixApplied(false);
      setIsFixPanelOpen(false);
      setSidebarTab('pipeline');

      // Load repo 2 files
      setFiles(DEMO_REPO_2.files);
      setSelectedFileId(DEMO_REPO_2.files[0].id);
      setCode(DEMO_REPO_2.files[0].content);
      setCurrentRepoUrl(DEMO_REPO_2.repoLabel);
      addLog(`Repository loaded: ${DEMO_REPO_2.repoLabel}`, 'success');
      addLog(`${DEMO_REPO_2.files.length} files indexed.`, 'info');

      // Enable agent
      await new Promise(r => setTimeout(r, 2000));
      setIsAgentMode(true);
      setAgentStatus('Analyzing');
      addLog('Agent scanning new repository...', 'loading');

      // Simulate staged analysis
      await new Promise(r => setTimeout(r, 1500));
      setPipelineStep('scan');
      setPipelineExplanation('Scanning subtract.py, validator.py...');
      setAnalysisProgress(30);

      await new Promise(r => setTimeout(r, 1800));
      setPipelineStep('thinking');
      setPipelineExplanation('Auditing operator usage across 3 files...');
      setAnalysisProgress(65);

      await new Promise(r => setTimeout(r, 1800));
      setPipelineStep('generate');
      setPipelineExplanation('Generating corrections for 2 anomalies...');
      setAnalysisProgress(90);

      await new Promise(r => setTimeout(r, 1200));
      setRepositoryIssues(DEMO_REPO_2.issues);
      setAnalysisProgress(100);
      setPipelineStep('idle');
      setIsAnalyzingRepo(false);
      addLog(`Analysis complete: ${DEMO_REPO_2.issues.length} issues detected.`, 'success');
    }, 2500);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isDemoMode]);   // intentionally minimal deps — guard ref prevents loops

  const cleanAIResponse = (text) => {
    if (!text) return '';
    return text
      .replace(/\\n/g, '\n') // Fix escaped newlines
      .replace(/```[\s\S]*?```/g, '') // Remove markdown blocks
      .trim();
  };



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
          id: `issue-${fileId}-${Date.now()}`, // More stable ID
          fileId: fileId,
          fileName: fileName,
          error: res.error,
          explanation: res.explanation || "",
          fixed_code: cleanCode,
          agentState: { ...res, id: `issue-${fileId}-${Date.now()}` }
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

  const analyzeRepository = async (bypassModeCheck = false, overrideFiles = null) => {
    const targetFiles = overrideFiles || files;
    if ((!isAgentMode && !bypassModeCheck) || isAnalyzingRepo || !targetFiles || targetFiles.length === 0) {
      return;
    }

    try {
      setIsAnalyzingRepo(true);
      setIsAgentThinking(true);
      setAnalysisProgress(0);
      setRepositoryIssues([]);
      addLog("Initiating repository-wide analysis...", "loading");
      setPipelineStep('scan');
      setPipelineExplanation(`Analyzing ${targetFiles.length} files for logic patterns...`);

      if (isDemoMode) {
        // High-fidelity demo simulation
        await new Promise(r => setTimeout(r, 1500));
        setAnalysisProgress(40);
        setPipelineStep('thinking');
        setPipelineExplanation("Auditing sum.py for operator consistency...");
        
        await new Promise(r => setTimeout(r, 2000));
        setAnalysisProgress(80);
        setPipelineStep('generate');
        setPipelineExplanation("Generating structural fix for detected anomaly...");

        await new Promise(r => setTimeout(r, 1500));
        setRepositoryIssues([DEMO_DATA.issue]);
        addLog("Demo analysis complete: Found 1 critical issue.", "success");
      } else {
        const res = await api.analyzeRepo();
        const list = Array.isArray(res?.issues_list) ? res.issues_list : [];

        if (list.length > 0) {
          const formattedIssues = list.map((iss, index) => {
            const issueId = `issue-${index}-${iss.file}`;
            return {
              id: issueId,
              fileId: targetFiles.find(f => f.name === iss.file)?.id,
              fileName: iss.file || "Unknown",
              error: iss.issue || "Logical Bug Detected",
              explanation: iss.explanation || "",
              fixed_code: iss.fix || null,
              agentState: {
                ...iss,
                id: issueId,
                error: iss.issue || "Logical Bug Detected",
                explanation: iss.explanation || "",
                fixed_code: iss.fix || null,
                trace: iss.trace || []
              }
            };
          });
          
          setRepositoryIssues(formattedIssues);
          addLog(`Repo analysis complete: Found ${formattedIssues.length} issues.`, 'success');
        } else {
          setRepositoryIssues([]);
          addLog("Repo analysis complete: No issues found.", "success");
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      addLog("Background analysis encountered an error.", "error");
      
      setRepositoryIssues(prev => {
        if (prev && prev.length > 0) return prev;
        return [
          {
            id: "analysis_error",
            fileName: "system",
            error: "Connection Error",
            explanation: "The repository scan encountered a network or server error.",
            fixed_code: null
          }
        ];
      });
    } finally {
      setIsAnalyzingRepo(false);
      setIsAgentThinking(false);
      setPipelineStep('idle');
      setAnalysisProgress(100);
    }
  };

  const handleIssueClick = (issue) => {
    if (!issue) return;
    setSelectedFileId(issue.fileId);
    setAgentState(issue.agentState ? { ...issue.agentState, id: issue.id } : null);
    setSuggestedCode(issue.fixed_code || null);
    setAgentStatus('Fix ready');
    setIsFixPanelOpen(true);
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

  const handleDownloadProject = async () => {
    if (!files || files.length === 0) {
      addLog("No files to download.", "error");
      return;
    }

    try {
      addLog("Preparing project for download...", "loading");
      const zip = new JSZip();
      
      files.forEach(file => {
        // Remove leading slash for zip structure
        const path = file.path.startsWith('/') ? file.path.slice(1) : file.path;
        zip.file(path, file.content);
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agent-fixed-project.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addLog("Project downloaded successfully!", "success");
    } catch (e) {
      console.error("Download failed:", e);
      addLog("Failed to generate project download.", "error");
    }
  };

  const manualRunAgent = () => {
    runAutonomousLoop(code, selectedFileId);
  };

  const toggleAgentMode = () => {
    const newMode = !isAgentMode;
    setIsAgentMode(newMode);
    
    if (newMode) {
      // Turning ON: Trigger full repository scan if files exist
      if (files.length > 0) {
        analyzeRepository(true, files);
      }
      setAgentStatus('Monitoring');
    } else {
      // Turning OFF
      isAgentRunning.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsAgentThinking(false);
      setAgentStatus('Idle');
      setPipelineStep('idle');
      setRepositoryIssues([]);
      setAgentState(null);
      setSuggestedCode(null);
      setIsAnalyzingRepo(false);
      setAnalysisProgress(0);
      setIsFixPanelOpen(false);
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

    const currentId = agentState?.id;

    setPipelineStep('apply');
    addLog("Applying AI fix to editor...", "success");
    setCode(cleanCode);
    updateFileContent(cleanCode);
    
    // Safely update list
    if (currentId) {
      setRepositoryIssues(prev => Array.isArray(prev) ? prev.filter(iss => iss.id !== currentId) : []);
    }

    setSuggestedCode(null);
    setAgentStatus('Monitoring'); // Set back to Monitoring to allow next step detection
    setFixApplied(true);
    
    // Delay clearing agentState to avoid render crash
    setTimeout(() => {
      setAgentState(null);
    }, 0);
    
    setTimeout(async () => {
       setPipelineStep('verify');
       await new Promise(r => setTimeout(r, 1500));
       if (isDemoMode) {
         addLog("Logic Verified: subtract(10, 5) => 5 ✓", "success");
       }
    }, 500);
  };

  const handleFileRejected = () => {
    const currentId = agentState?.id;

    if (agentState?.error) {
      const issueId = `${selectedFileId}-${agentState.line}-${agentState.error}`;
      setRejectedIssues(prev => [...prev, issueId]);
      addLog(`Issue rejected and ignored: ${agentState.error}`, 'info');
    }

    // Safely update list
    if (currentId) {
      setRepositoryIssues(prev => Array.isArray(prev) ? prev.filter(iss => iss.id !== currentId) : []);
    }

    setSuggestedCode(null);
    setAgentStatus('Monitoring');
    
    // Delay clearing to avoid crash
    setTimeout(() => {
      setAgentState(null);
    }, 0);
    
    console.log("Fix rejected, closing panel.");
  };

  const handleCloseIssue = () => {
    setAgentState(null);
    setSuggestedCode(null);
    setAgentStatus('Monitoring');
    setIsFixPanelOpen(false);
  };

  const loadFileContent = (fileId) => {
    setSelectedFileId(fileId);
    // [MULTI-FILE UPGRADE] Clear issue view when manually selecting a file from tree
    setAgentState(null);
    setSuggestedCode(null);
  };

  const resetWorkspace = () => {
    console.log("[DevAgent] Resetting workspace for new project...");
    setRepositoryIssues([]);
    setAgentState(null);
    setSuggestedCode(null);
    setPipelineStep('idle');
    setAgentStatus('Idle');
    setPrUrl(null);
    setFiles([]); // Temporarily clear files to show loading state
    setCode("");
    setLogs([]);
    setIsAnalyzingRepo(false);
    setAnalysisProgress(0);
    // Ensure background loops stop
    isAgentRunning.current = false;
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  // --- Landing Page Routing logic ---
  const handleEnterWorkspace = () => {
    setIsInitializing(true);
    setIsDemoMode(false);
    setIsGuidedDemoActive(false);
    fetchAuthStatus(); // Restore real auth state
    setTimeout(() => {
      setIsInitializing(false);
      setScreen('workspace');
    }, 1200);
  };

  const handleDemoProject = async () => {
    setIsInitializing(true);
    addLog("Initializing Phase 1: Guided Demo...", "loading");
    
    setTimeout(() => {
      setIsInitializing(false);
      setScreen('workspace');
      setFiles(DEMO_DATA.files);
      setSelectedFileId(DEMO_DATA.files[0].id);
      setCode(DEMO_DATA.files[0].content);
      setIsAgentMode(false);
      setAgentStatus('Idle');
      setIsDemoMode(true);
      setIsGuidedDemoActive(true);
      setSidebarTab('pipeline');
      setRepositoryIssues([]);
      addLog("Demo Ready: Repository Preloaded.", "success");
    }, 1200);
  };

  const handleChallengeEnter = () => {
    setIsInitializing(true);
    setTimeout(() => {
      setIsInitializing(false);
      setScreen('challenge');
    }, 1000);
  };

  const handleStopDemo = () => {
    setIsDemoMode(false);
    setIsGuidedDemoActive(false);
    setIsAgentMode(false);
    fetchAuthStatus(); // Restore real auth state
    setScreen('landing');
    // Reset all demo states
    setFiles([]);
    setSelectedFileId(null);
    setCode('');
    setRepositoryIssues([]);
    setAgentState(null);
    setSuggestedCode(null);
    setLogs([]);
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
    return <LandingPage 
      onEnter={handleEnterWorkspace} 
      onDemo={handleDemoProject} 
      onChallenge={handleChallengeEnter}
    />;
  }

  if (screen === 'challenge') {
    return <ChallengePage onBackToHome={() => setScreen('landing')} />;
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
                "🚀 Autonomous Intelligence — Witnessing the Agentic Reasoning Loop in real-time"
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
        <div className="flex items-center gap-6">
          <div
            className="font-black tracking-tighter text-lg flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setScreen('landing')}
          >
            <Bot size={22} className="text-cyan-400 mr-2.5 animate-float" />
            <span className="text-gradient font-black">
              AgentSmiths <span className="text-[10px] text-gray-500 font-bold tracking-widest ml-2 opacity-50">PRO</span>
            </span>
          </div>

          <button 
            onClick={() => setScreen('landing')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all group"
          >
            <Home size={12} className="group-hover:text-cyan-400 transition-colors" /> Home
          </button>
        </div>
        <div className="flex items-center gap-4">
          {/* Mode Toggle hidden visually */}
          {false && (
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
          )}



          {isAgentThinking && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-400 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 shadow-glow-blue animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Agent Processing
            </div>
          )}
          
          {isDemoMode && (
            <button 
              onClick={handleStopDemo}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 px-4 py-2 rounded-full border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all mr-2"
            >
              <X size={12} /> Stop Demo
            </button>
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
              onRepoLoaded={(url, loadedFiles) => {
                setCurrentRepoUrl(url);
                if (isAgentMode && loadedFiles && loadedFiles.length > 0) {
                  // Repo loaded while Agent Mode is ON, start full scan!
                  analyzeRepository(false, loadedFiles);
                }
              }}
              onBeforeLoad={resetWorkspace}
              onDownloadProject={handleDownloadProject}
              isDemoMode={isDemoMode}
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
          isFixPanelOpen={isFixPanelOpen}
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
            {isAgentMode && (
              <button
                id="issues-tab"
                data-testid="tab-issues"
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
            )}
            <button
              onClick={() => setSidebarTab('prompts')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                sidebarTab === 'prompts' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Settings2 size={12} />
              Prompts
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'pipeline' ? (
              <div className="p-4 space-y-4 h-full flex flex-col">
                {isAgentMode ? (
                  <>
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
                        className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all group mt-auto"
                      >
                        Scan Full Repository
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                    <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6">
                      <Bot size={32} className="text-gray-700" />
                    </div>
                    <h3 className="text-sm font-black text-white mb-2 uppercase tracking-widest">Agent is OFF</h3>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
                      Enable Agent Mode in the top toolbar to start autonomous debugging and analysis.
                    </p>
                  </div>
                )}
              </div>
            ) : sidebarTab === 'issues' ? (
              <IssuesPanel 
                issues={repositoryIssues}
                onIssueClick={handleIssueClick}
                selectedIssueId={selectedFileId}
                isAnalyzing={isAnalyzingRepo}
                progress={analysisProgress}
              />
            ) : (
              <PromptEditor onLog={addLog} />
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
      {isGuidedDemoActive && isDemoMode && screen === 'workspace' && demoConfig && (
        <CursorGuide config={demoConfig} isVisible={true} currentStep={currentStep} />
      )}
    </div>
  );
}

export default App;
