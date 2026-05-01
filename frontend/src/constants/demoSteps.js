export const DEMO_STEPS = {
  START: 'start',
  ENABLE_AGENT: 'enable_agent',
  ANALYZE: 'analyze',
  THINKING: 'thinking',
  SHOW_ERROR: 'show_error',
  APPLY_FIX: 'apply_fix',
  GITHUB_LOGIN: 'github_login',
  PASTE_REPO: 'paste_repo',
  LOAD_REPO: 'load_repo',
  CREATE_PR: 'create_pr',
  DONE: 'done'
};

export const STEP_CONFIG = {
  [DEMO_STEPS.ENABLE_AGENT]: {
    selector: '#agent-toggle',
    message: 'Step 1: Enable Autonomous Agent',
    autoAdvance: false
  },
  [DEMO_STEPS.ANALYZE]: {
    selector: '#agent-loop-btn',
    message: 'Step 2: Run AI Diagnostics',
    autoAdvance: false
  },
  [DEMO_STEPS.THINKING]: {
    selector: '.animate-pulse',
    message: 'AI is auditing logic...',
    autoAdvance: true,
    delay: 4000
  },
  [DEMO_STEPS.APPLY_FIX]: {
    selector: '#apply-fix-btn',
    message: 'Step 3: Apply the AI Correction',
    autoAdvance: false
  },
  [DEMO_STEPS.GITHUB_LOGIN]: {
    selector: '#github-login-btn',
    message: 'Step 4: Connect to GitHub',
    autoAdvance: false
  },
  [DEMO_STEPS.PASTE_REPO]: {
    selector: '#repo-input',
    message: 'Step 5: Load Source Repository',
    autoAdvance: true,
    delay: 1500
  },
  [DEMO_STEPS.LOAD_REPO]: {
    selector: '#load-repo-btn',
    message: 'Initializing environment...',
    autoAdvance: false
  },
  [DEMO_STEPS.CREATE_PR]: {
    selector: '#create-pr-btn',
    message: 'Final Step: Create Pull Request',
    autoAdvance: false
  }
};
