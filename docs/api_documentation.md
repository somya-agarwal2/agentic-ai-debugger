# Agentic AI Debugger — API Documentation

This document provides a comprehensive overview of the backend API endpoints for the Agentic AI Debugger.

---

## 🔐 Authentication (GitHub OAuth)

The debugger uses GitHub OAuth for repository access and identity management.

### `GET /login/github`
Redirects the user to the GitHub OAuth authorization page.

### `GET /github/callback`
**Callback URL.** Handles the exchange of the temporary GitHub code for a persistent `access_token`.
- **Redirects:** Back to the `FRONTEND_URL` after successful login.

### `GET /auth/github/check`
Verifies if a user is currently logged in via session cookies.
- **Response (200):** `{ "user": { "login": "string", "avatar_url": "string", "name": "string" } }` or `{ "user": null }`.

### `GET /auth/github/logout`
Clears the user session.
- **Response (200):** `{ "success": true }`.

### `GET /github/repos`
Lists the GitHub repositories for the authenticated user.
- **Requirement:** User must be logged in.
- **Response (200):** Array of GitHub repository objects.

---

## 📁 Repository & Project Management

### `POST /upload-project`
Uploads a ZIP archive of a project for local analysis.
- **Body:** `multipart/form-data` containing a `file` field (.zip).
- **Response (200):** `{ "files": [ { "id": "path", "name": "string", "content": "string" } ] }`.

### `POST /load-repo`
Clones a public or accessible GitHub repository into a temporary workspace.
- **Body:** `{ "url": "https://github.com/user/repo" }`.
- **Response (200):** `{ "files": [...] }`.

---

## 🧠 AI Analysis & Agentic Actions

### `POST /analyze`
Analyzes a single block of code for syntax and logical errors.
- **Body:** `{ "code": "string" }`.
- **Response (200):** Returns an issue object containing `has_issue`, `explanation`, `fixed_code`, and `trace`.

### `POST /analyze-repo`
Performs a global scan of all files in the current repository using parallel execution threads.
- **Body:** None (Uses `current_project` state).
- **Response (200):** `{ "issues_list": [ { "file": "string", "issue": "string", "fix": "string", "explanation": "string", "severity": "High/Medium/Low" } ] }`.

### `POST /agent-run`
Initiates the **Autonomous Agent Loop** (Scan → Reason → Fix → Test) for the provided code.
- **Body:** `{ "code": "string" }`.
- **Response (200):** The final `agentState` after all loop iterations.

### `POST /run-tests`
Executes Python code in a sandboxed execution environment.
- **Body:** `{ "code": "string" }`.
- **Response (200):** `{ "passed": boolean, "output": "string" }` or `{ "passed": false, "error": "string" }`.

---

## 🚀 GitHub Integration

### `POST /github/create-pr`
Commits a fix to a new branch and opens a Pull Request on the target repository.
- **Requirement:** User must be logged in.
- **Body:**
  ```json
  {
    "repo_url": "https://github.com/owner/repo",
    "file_path": "path/to/file.py",
    "new_code": "string",
    "commit_message": "optional string"
  }
  ```
- **Response (200):** `{ "success": true, "pr_url": "https://github.com/owner/repo/pull/1" }`.

---

## ⚙️ Configuration & Prompts

### `GET /prompts`
Retrieves the current dynamic prompts used by the AI engine.
- **Response (200):** JSON map of prompts (e.g., `analyze_prompt`, `fix_prompt`).

### `POST /prompts`
Updates the system prompts in real-time.
- **Body:** `{ "prompt_name": "new content" }`.
- **Response (200):** `{ "success": true }`.

---
