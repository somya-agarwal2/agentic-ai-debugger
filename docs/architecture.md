# Agentic AI Debugger — System Architecture

This document describes the high-level architecture and data flow of the Agentic AI Debugger.

---

## 🏗️ High-Level Architecture

The system follows a classic **Client-Server** architecture with an **Autonomous Agentic Engine** at its core.

```text
        +----------------------+
        |   Frontend (React)   |
        |     (Vercel)         |
        +----------+-----------+
                   |
                   | API Requests (HTTPS)
                   v
        +----------+-----------+
        |   Backend (Flask)    |
        |      (Render)        |
        +----------+-----------+
                   |
                   v
        +----------------------+
        |   Agentic Engine     |
        |  (Core Processing)   |
        +----------+-----------+
                   |
        +----------+-----------+
        |                      |
        v                      v
+---------------+     +------------------+
| AI Model      |     |   GitHub API     |
| (Grok / xAI)  |     | (PR Creation)    |
+---------------+     +------------------+
```

---

## 🧩 Component Breakdown

### 1. Frontend (Vercel)
*   **Editor & File Tree**: Provides the primary workspace. Built with high-fidelity React components.
*   **Pipeline Controller**: Visualizes the agent's internal state (Scanning, Reasoning, Fixing).
*   **Environment Aware**: Uses `VITE_API_URL` to dynamically connect to local or production backends.

### 2. Backend (Render)
*   **REST API**: Handles all communication from the frontend.
*   **Workspace Manager**: Uses Python's `tempfile` and `shutil` to manage ephemeral code environments.
*   **CORS & Sessions**: Secured for production using cross-site cookie configurations.

### 3. Agentic Engine (Core Logic)
This is where the "intelligence" lives. It is composed of:
*   **AST Analyzer**: Scans code for syntax errors before sending it to the LLM to save tokens and improve accuracy.
*   **Trace Generator**: Safely executes code line-by-line to provide the AI with a runtime execution trace.
*   **Autonomous Runner**: A loop that continues until a fix is either verified by the test runner or the maximum iterations are reached.

### 4. External Services
*   **xAI (Grok)**: The "brain" of the agent. Used for logic auditing and fix generation.
*   **GitHub**: Used for secure authentication and automated Pull Request creation.

---

## 🔄 Core Data Flow: The "Agentic Cycle"

1.  **Ingestion**: User uploads a ZIP or provides a GitHub URL. Backend clones/extracts code into a `temp` folder.
2.  **Monitoring**: Frontend detects a file selection or change and sends the code to `/agent-run`.
3.  **Analysis**:
    *   Engine runs a **Static Scan** (Syntax/Patterns).
    *   Engine runs a **Dynamic Trace** (Execution path).
    *   Engine sends code + trace + syntax issues to **Grok**.
4.  **Fixing**: Grok returns a JSON fix. The Engine attempts to **Run Tests** on the new code.
5.  **Reporting**: If tests pass, the fix is returned to the UI. If they fail, the Engine iterates one more time to improve the fix.
6.  **Resolution**: User reviews the diff and clicks "Open PR" to push the fix back to GitHub.
