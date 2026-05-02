# Agentic AI Debugger 🚀

**Autonomous Code Auditing & Real-time Debugging Agent**

The Agentic AI Debugger is a state-of-the-art developer tool designed to autonomously detect, reason about, and fix logical and syntax errors in Python and JavaScript repositories. Leveraging the reasoning power of the xAI (Grok) model, it provides a high-fidelity workspace for both manual and fully autonomous debugging workflows.

---

## 🔗 Quick Links

*   **🌐 Live Project Link:** [agentic-ai-debugger.vercel.app](https://agentic-ai-debugger.vercel.app/)
*   **🎬 Demo Video:** [Watch on Google Drive](https://drive.google.com/file/d/1N7vBcvkn9mZlTll1wkVBwNyrl0EVxP1C/view?usp=sharing)
*   **⚙️ Backend API:** [agentic-ai-debugger.onrender.com](https://agentic-ai-debugger.onrender.com/)
*   **🎨 UI Design (Figma):** [View Design Mockups](https://www.figma.com/design/9j6pG1Go3x11iWEhEkHnGm/Untitled?node-id=0-1&t=fH3qFK3NJQi5hn8O-1)

---

## 🏗️ System Architecture

The project is built on a decoupled Client-Server architecture designed for high performance and autonomous execution.

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

## ✨ Features

*   **🔍 Global Repository Scanning**: Audit entire projects in seconds using parallel processing.
*   **🧠 Autonomous Agent Loop**: A "Scan → Reason → Fix → Test" cycle that iterates until a verified fix is generated.
*   **🛠️ Safe Execution Sandbox**: Runs and validates code in a secure backend environment to generate execution traces.
*   **🐙 GitHub Integration**: Log in with GitHub to clone repositories and open Pull Requests directly from the dashboard.
*   **📊 Pipeline Visualization**: Track the agent's "thinking" steps in real-time through a glassmorphic HUD.

---

## 📚 Documentation

For deeper technical details, please refer to the following documents:

*   📖 **[API Documentation](docs/api_documentation.md)**: Detailed breakdown of all backend REST endpoints.
*   🧪 **[Test Cases](docs/test_cases.md)**: Comprehensive manual and automated testing scenarios.
*   🏛️ **[System Architecture](docs/architecture.md)**: Deep dive into the component breakdown and data flow.

---

## 🛠️ Tech Stack

*   **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Axios.
*   **Backend**: Flask (Python), ThreadPoolExecutor, GitPython.
*   **AI Engine**: xAI (Grok-1) API, AST Parsing.
*   **Deployment**: Vercel (Frontend), Render (Backend), Docker.

---

## 🚀 Local Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables
Create a `.env` file in the `backend/` directory:
```env
FLASK_SECRET_KEY=your_secret
GROK_API_KEY=your_xai_key
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret
FRONTEND_URL=http://localhost:5173
```

---

## 🛡️ License

This project is licensed under the MIT License - see the LICENSE file for details.
