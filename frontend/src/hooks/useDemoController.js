import { useState, useEffect, useCallback, useRef } from 'react';
import { DEMO_STEPS, STEP_CONFIG } from '../constants/demoSteps';

export const useDemoController = (isDemoMode, activeStates) => {
  const [currentStep, setCurrentStep] = useState(DEMO_STEPS.START);
  const [demoError, setDemoError] = useState(null);
  const timerRef = useRef(null);

  const {
    isAgentMode,
    agentStatus,
    agentState,
    user,
    currentRepoUrl,
    fixApplied,
    isAgentThinking,
    screen
  } = activeStates;

  const transitionTo = useCallback((step, delay = 0) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (delay > 0) {
      timerRef.current = setTimeout(() => {
        setCurrentStep(step);
      }, delay);
    } else {
      setCurrentStep(step);
    }
  }, []);

  const restart = useCallback(() => {
    setDemoError(null);
    setCurrentStep(DEMO_STEPS.START);
  }, []);

  // Main Demo State Machine Logic
  useEffect(() => {
    if (!isDemoMode || screen !== 'workspace') {
      if (currentStep !== DEMO_STEPS.START) setCurrentStep(DEMO_STEPS.START);
      return;
    }

    try {
      // Step: START -> ENABLE_AGENT
      if (currentStep === DEMO_STEPS.START) {
        transitionTo(DEMO_STEPS.ENABLE_AGENT, 1000);
      }
      
      // Step: ENABLE_AGENT -> ANALYZE
      else if (currentStep === DEMO_STEPS.ENABLE_AGENT && isAgentMode) {
        transitionTo(DEMO_STEPS.ANALYZE, 1000);
      }
      
      // Step: ANALYZE -> THINKING
      else if (currentStep === DEMO_STEPS.ANALYZE && isAgentThinking) {
        transitionTo(DEMO_STEPS.THINKING, 500);
      }
      
      // Step: THINKING -> APPLY_FIX (Wait for logic detection)
      else if (currentStep === DEMO_STEPS.THINKING && !isAgentThinking && agentState?.error) {
        transitionTo(DEMO_STEPS.APPLY_FIX, 1500);
      }
      
      // Step: APPLY_FIX -> GITHUB_LOGIN (After fix applied)
      else if (currentStep === DEMO_STEPS.APPLY_FIX && fixApplied) {
        transitionTo(DEMO_STEPS.GITHUB_LOGIN, 2000);
      }
      
      // Step: GITHUB_LOGIN -> PASTE_REPO (After login)
      else if (currentStep === DEMO_STEPS.GITHUB_LOGIN && user) {
        transitionTo(DEMO_STEPS.PASTE_REPO, 1200);
      }
      
      // Step: PASTE_REPO -> LOAD_REPO (Wait for dummy auto-fill)
      else if (currentStep === DEMO_STEPS.PASTE_REPO && currentRepoUrl) {
        transitionTo(DEMO_STEPS.LOAD_REPO, 1000);
      }
      
      // Step: LOAD_REPO -> CREATE_PR (After repo loaded)
      else if (currentStep === DEMO_STEPS.LOAD_REPO && agentStatus === 'Code is clean') {
        transitionTo(DEMO_STEPS.CREATE_PR, 1500);
      }

    } catch (err) {
      console.error("DEMO CONTROLLER CRITICAL ERROR:", err);
      setDemoError("Demo step failed, restarting...");
      setTimeout(restart, 3000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    isDemoMode, 
    currentStep, 
    isAgentMode, 
    isAgentThinking, 
    agentState, 
    fixApplied, 
    user, 
    currentRepoUrl, 
    agentStatus, 
    screen,
    transitionTo,
    restart
  ]);

  return {
    currentStep,
    demoError,
    config: STEP_CONFIG[currentStep] || null,
    restart
  };
};
