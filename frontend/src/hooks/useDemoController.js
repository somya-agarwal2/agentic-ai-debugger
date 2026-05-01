import { useState, useEffect, useCallback, useRef } from 'react';
import { DEMO_STEPS, STEP_CONFIG } from '../constants/demoSteps';

// Type text char-by-char into a React-controlled input
const typeIntoInput = (selector, text, onDone) => {
  const el = document.querySelector(selector);
  if (!el) { onDone?.(); return; }

  el.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, '');
  el.dispatchEvent(new Event('input', { bubbles: true }));

  let i = 0;
  const interval = setInterval(() => {
    if (i >= text.length) { clearInterval(interval); onDone?.(); return; }
    setter.call(el, text.slice(0, i + 1));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    i++;
  }, 45);
};

export const useDemoController = (isDemoMode, activeStates) => {
  const [currentStep, setCurrentStep] = useState(DEMO_STEPS.START);
  const timerRef        = useRef(null);
  const elementWaitRef  = useRef(null);
  const clickTimerRef   = useRef(null);
  // One-shot guard: prevents the load-repo click from firing more than once
  const loadClickedRef  = useRef(false);

  const {
    isAgentMode, isAgentThinking, isAnalyzingRepo,
    agentState, files, screen, sidebarTab,
    repositoryIssues, fixApplied, user, showPRWorkflow
  } = activeStates;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(elementWaitRef.current);
    clearTimeout(clickTimerRef.current);
  }, []);

  const transitionTo = useCallback((step, delay = 0) => {
    clearAll();
    if (delay > 0) {
      timerRef.current = setTimeout(() => setCurrentStep(step), delay);
    } else {
      setCurrentStep(step);
    }
  }, [clearAll]);

  const simulateClick = useCallback((selector) => {
    const el = document.querySelector(selector);
    if (el) { el.click(); return true; }
    return false;
  }, []);

  const waitForElement = useCallback((selector, callback, maxMs = 8000) => {
    clearInterval(elementWaitRef.current);
    const t0 = Date.now();
    elementWaitRef.current = setInterval(() => {
      if (document.querySelector(selector)) {
        clearInterval(elementWaitRef.current);
        callback();
      } else if (Date.now() - t0 > maxMs) {
        clearInterval(elementWaitRef.current);
        console.warn(`[Demo] Timeout: ${selector}`);
      }
    }, 200);
  }, []);

  const scheduleClick = useCallback((selector, delay) => {
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => simulateClick(selector), delay);
  }, [simulateClick]);

  const restart = useCallback(() => {
    loadClickedRef.current = false;
    setCurrentStep(DEMO_STEPS.START);
  }, []);

  // ── Main State Machine ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDemoMode || screen !== 'workspace') {
      if (currentStep !== DEMO_STEPS.START) setCurrentStep(DEMO_STEPS.START);
      clearAll();
      return;
    }

    const config = STEP_CONFIG[currentStep];

    // ── PHASE 1 ────────────────────────────────────────────────────────────
    if (currentStep === DEMO_STEPS.START && files.length > 0) {
      transitionTo(DEMO_STEPS.ENABLE_AGENT, 1500);
    }

    else if (currentStep === DEMO_STEPS.ENABLE_AGENT && isAgentMode) {
      transitionTo(DEMO_STEPS.ANALYZING, 1000);
    }

    else if (
      currentStep === DEMO_STEPS.ANALYZING &&
      !isAnalyzingRepo && repositoryIssues.length > 0
    ) {
      waitForElement('#issues-tab', () => transitionTo(DEMO_STEPS.OPEN_ISSUES, 2000));
    }

    else if (currentStep === DEMO_STEPS.OPEN_ISSUES && sidebarTab === 'issues') {
      waitForElement('.issue-item', () => transitionTo(DEMO_STEPS.SELECT_ISSUE, 1500));
    }

    else if (currentStep === DEMO_STEPS.SELECT_ISSUE && agentState) {
      waitForElement('#apply-fix-btn', () => transitionTo(DEMO_STEPS.APPLY_FIX, 2500));
    }

    else if (currentStep === DEMO_STEPS.APPLY_FIX && fixApplied) {
      transitionTo(DEMO_STEPS.VERIFYING, 1000);
    }

    else if (currentStep === DEMO_STEPS.VERIFYING && fixApplied && !isAgentThinking) {
      transitionTo(DEMO_STEPS.GITHUB_LOGIN, 3000);
    }

    // ── BRIDGE ─────────────────────────────────────────────────────────────
    else if (currentStep === DEMO_STEPS.GITHUB_LOGIN && user) {
      transitionTo(DEMO_STEPS.PASTE_REPO_URL, 2000);
    }

    else if (currentStep === DEMO_STEPS.PASTE_REPO_URL) {
      waitForElement('#repo-input', () => {
        const url = config?.demoUrl || 'github.com/devagent-demo/mathematics-suite';
        timerRef.current = setTimeout(() => {
          typeIntoInput('#repo-input', url, () => {
            transitionTo(DEMO_STEPS.LOAD_REPO, 1500);
          });
        }, 1200);
      });
    }

    else if (currentStep === DEMO_STEPS.LOAD_REPO) {
      // Move cursor to button — fire exactly ONE click via the guard ref
      if (!loadClickedRef.current) {
        waitForElement('#load-repo-btn', () => {
          loadClickedRef.current = true;
          // 2 s pause so cursor is visible on the button, then click once
          clickTimerRef.current = setTimeout(() => {
            simulateClick('#load-repo-btn');
            // App.jsx useEffect handles file load + analysis.
            // We stay on this step until repositoryIssues repopulates.
          }, 2000);
        });
      }

      // Once Phase 2 issues appear, advance to REPO2_ANALYZING
      if (loadClickedRef.current && !isAnalyzingRepo && repositoryIssues.length > 0) {
        waitForElement('.pipeline-card-active', () =>
          transitionTo(DEMO_STEPS.REPO2_ANALYZING, 500)
        );
      }
    }

    // ── PHASE 2 ─────────────────────────────────────────────────────────────
    else if (
      currentStep === DEMO_STEPS.REPO2_ANALYZING &&
      !isAnalyzingRepo && repositoryIssues.length > 0
    ) {
      waitForElement('#issues-tab', () => transitionTo(DEMO_STEPS.REPO2_OPEN_ISSUES, 2000));
    }

    else if (currentStep === DEMO_STEPS.REPO2_OPEN_ISSUES && sidebarTab === 'issues') {
      waitForElement('.issue-item', () => transitionTo(DEMO_STEPS.REPO2_SELECT_ISSUE, 1500));
    }

    else if (currentStep === DEMO_STEPS.REPO2_SELECT_ISSUE && agentState) {
      waitForElement('#create-pr-btn', () => transitionTo(DEMO_STEPS.REPO2_OPEN_PR, 1500));
    }
    
    else if (currentStep === DEMO_STEPS.REPO2_OPEN_PR) {
      const publishBtn = document.querySelector('#publish-pr-btn');
      if (publishBtn || showPRWorkflow) {
        transitionTo(DEMO_STEPS.REPO2_PUBLISH_PR, 500);
      }
    }
    
    else if (currentStep === DEMO_STEPS.REPO2_PUBLISH_PR && !showPRWorkflow) {
      // Once modal is closed (PR created), we are DONE
      transitionTo(DEMO_STEPS.DONE, 1500);
    }

    // ── General auto-click (Phase 1 steps only) ────────────────────────────
    if (config?.autoClick && config.selector) {
      const el = document.querySelector(config.selector);
      if (el) scheduleClick(config.selector, config.autoClickDelay ?? 2000);
    }

    return clearAll;
  }, [
    isDemoMode, currentStep, isAgentMode, isAgentThinking,
    isAnalyzingRepo, repositoryIssues, files, screen,
    sidebarTab, agentState, fixApplied, user,
    transitionTo, waitForElement, scheduleClick, clearAll, simulateClick
  ]);

  return {
    currentStep,
    config: STEP_CONFIG[currentStep] || null,
    restart
  };
};
