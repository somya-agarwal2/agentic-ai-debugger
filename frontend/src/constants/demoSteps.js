export const DEMO_STEPS = {
  START: 'start',

  // ── Phase 1: First repo (demo-data) ──────────────────
  ENABLE_AGENT:  'enable_agent',
  ANALYZING:     'analyzing',
  OPEN_ISSUES:   'open_issues',
  SELECT_ISSUE:  'select_issue',
  APPLY_FIX:     'apply_fix',
  VERIFYING:     'verifying',

  // ── Bridge: GitHub login + repo paste ────────────────
  GITHUB_LOGIN:  'github_login',
  PASTE_REPO_URL:'paste_repo_url',
  LOAD_REPO:     'load_repo',

  // ── Phase 2: Second repo (devagent-demo/mathematics-suite) ──
  REPO2_ANALYZING:   'repo2_analyzing',
  REPO2_OPEN_ISSUES: 'repo2_open_issues',
  REPO2_SELECT_ISSUE: 'repo2_select_issue',
  REPO2_OPEN_PR:     'repo2_open_pr',
  REPO2_PUBLISH_PR:  'repo2_publish_pr',

  DONE: 'done'
};

export const STEP_CONFIG = {
  // Phase 1
  [DEMO_STEPS.ENABLE_AGENT]: {
    selector: '#agent-toggle',
    message: 'Click here to start the AI agent',
    autoClick: false,
  },
  [DEMO_STEPS.ANALYZING]: {
    selector: '.pipeline-card-active',
    message: 'AI is scanning the codebase...',
    autoClick: false,
  },
  [DEMO_STEPS.OPEN_ISSUES]: {
    selector: '#issues-tab',
    message: 'AI found issues — click to review them',
    autoClick: true,
    autoClickDelay: 2000,
  },
  [DEMO_STEPS.SELECT_ISSUE]: {
    selector: '.issue-item:first-child',
    message: "Let's inspect the detected issue",
    autoClick: true,
    autoClickDelay: 3000,
  },
  [DEMO_STEPS.APPLY_FIX]: {
    selector: '#apply-fix-btn',
    message: 'Apply the AI-generated correction',
    autoClick: true,
    autoClickDelay: 3000,
  },
  [DEMO_STEPS.VERIFYING]: {
    selector: '.pipeline-card-active',
    message: 'Verifying fix against test suite...',
    autoClick: false,
  },

  // Bridge
  [DEMO_STEPS.GITHUB_LOGIN]: {
    selector: '#github-login-btn',
    message: 'Login with GitHub to connect your repositories',
    autoClick: true,
    autoClickDelay: 3000,
  },
  [DEMO_STEPS.PASTE_REPO_URL]: {
    selector: '#repo-input',
    message: 'Connecting to GitHub repository...',
    autoClick: false,
    demoUrl: 'github.com/devagent-demo/mathematics-suite',
  },
  [DEMO_STEPS.LOAD_REPO]: {
    selector: '#load-repo-btn',
    message: 'Loading repo — agent will take over!',
    autoClick: false,       // click is fired once by the controller internally
  },

  // Phase 2
  [DEMO_STEPS.REPO2_ANALYZING]: {
    selector: '.pipeline-card-active',
    message: 'Agent scanning mathematics-suite...',
    autoClick: false,
  },
  [DEMO_STEPS.REPO2_OPEN_ISSUES]: {
    selector: '#issues-tab',
    message: 'More bugs found — click to review',
    autoClick: true,
    autoClickDelay: 2000,
  },
  [DEMO_STEPS.REPO2_SELECT_ISSUE]: {
    selector: '.issue-item:first-child',
    message: 'Inspect the operator mismatch in subtract.py',
    autoClick: true,
    autoClickDelay: 3000,
  },
  [DEMO_STEPS.REPO2_OPEN_PR]: {
    selector: '#create-pr-btn',
    message: 'Let the Agent prepare a Pull Request...',
    autoClick: true,
    autoClickDelay: 4000,
  },
  [DEMO_STEPS.REPO2_PUBLISH_PR]: {
    selector: '#publish-pr-btn',
    message: 'Finally, publish the verified fix to GitHub!',
    autoClick: true,
    autoClickDelay: 5000,
  },

  [DEMO_STEPS.DONE]: {
    selector: null,
    message: '🎉 Full Cycle Complete! Issues found and PRs ready across both repositories.',
    autoClick: false,
  }
};
