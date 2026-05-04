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

1.  **Workspace Intake**: The user uploads a ZIP project or submits a GitHub repository URL. The backend creates an isolated temporary workspace, then extracts or clones the source code into it.
2.  **Run Trigger**: When the user selects or edits code, the frontend sends the active file content to `/agent-run` and begins tracking the agent's progress.
3.  **Context Building**:
    *   The engine performs a **Static Scan** to catch syntax errors and known risky patterns early.
    *   The engine performs a **Dynamic Trace** to capture the runtime path, logs, and execution failures.
    *   The engine packages the source code, static findings, and runtime trace into a structured request for **Grok**.
4.  **Patch Generation**: Grok returns a structured JSON response containing the diagnosis and proposed fix. The engine applies the candidate change inside the temporary workspace.
5.  **Validation Loop**: The engine runs the available tests against the patched code. If validation fails, the failure output is fed back into one additional repair attempt before the final result is prepared.
6.  **Review & PR Handoff**: The UI presents the explanation, test result, and diff for review. Once the user clicks "Open PR", the backend uses GitHub integration to publish the verified fix as a pull request.
