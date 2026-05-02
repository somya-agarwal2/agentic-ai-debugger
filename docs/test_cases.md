# Agentic AI Debugger — Test Cases

This document outlines the test scenarios required to verify the functionality of the Agentic AI Debugger.

---

## 1. Repository Ingestion & Explorer

### TC-01: Upload ZIP Project
- **Action:** Click "Upload ZIP Project" and select a `.zip` file containing Python or JS files.
- **Expected:**
  - Files are extracted on the backend.
  - File Explorer displays the project structure.
  - Selecting a file displays its content in the editor.

### TC-02: Load GitHub Repository
- **Action:** Enter a GitHub URL (e.g., `https://github.com/user/repo`) and click the Download icon.
- **Expected:**
  - Backend clones the repository (shallow clone).
  - "Agent Logs" show cloning progress.
  - File Explorer populates with repository files.

---

## 2. AI Analysis & Bug Detection

### TC-03: Manual Agent Analysis (The "Sum" Bug)
- **Action:** Open a file with a logical error (e.g., `sum.py` returning `a - b` instead of `a + b`). Enable **Agent Mode**.
- **Expected:**
  - Status changes to `Analyzing Codebase`.
  - Anomaly detected: "Logical Anomaly: Incorrect Operator".
  - "Fix Ready" status appears with a proposed correction.

### TC-04: Real-time File Monitoring
- **Action:** With Agent Mode ON, type a syntax error into the editor (e.g., `def broken(:`).
- **Expected:**
  - Agent detects the change within 2 seconds.
  - Pipeline moves to `Detecting Anomalies`.
  - Assistant shows the specific syntax error details.

---

## 3. Autonomous Fixing & PR Workflow

### TC-05: Run Autonomous Loop
- **Action:** Click "Run Loop" on a detected issue.
- **Expected:**
  - Agent executes a multi-step sequence: Reason → Fix → Test.
  - "Execution Trace" in the sidebar shows the agent's internal thought process.
  - Editor automatically updates with the verified fix.

### TC-06: GitHub Pull Request Creation
- **Action:** After a fix is generated, click "Open PR".
- **Expected:**
  - UI shows "Opening PR on GitHub...".
  - Success message provides a clickable link to the PR on GitHub.
  - Repository branch is created with the new code.

---

## 4. Configuration & Edge Cases

### TC-07: Missing API Key Recovery
- **Action:** Delete the `GROK_API_KEY` from `.env` and restart the backend. Try to analyze a file.
- **Expected:**
  - Agent status shows `API Error`.
  - Explanation clearly states: "Error: GROK_API_KEY not found in environment."

### TC-08: Empty or Large File Handling
- **Action:** Open a file with 0 bytes or a very large binary file.
- **Expected:**
  - Explorer skips binary files (as per backend logic).
  - Empty files are marked as "Clean" or ignored without crashing the agent.

---

## 5. Deployment & Production (Render/Vercel)

### TC-09: Production API Connectivity
- **Action:** Access the deployed Vercel URL.
- **Expected:**
  - Frontend connects to the Render backend via `VITE_API_URL`.
  - No `localhost:5000` errors in the browser console.
  - Authentication session persists across page refreshes.
