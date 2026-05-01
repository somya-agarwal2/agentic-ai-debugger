from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class AgentIssue:
    file_path: str
    issue_type: str
    description: str
    severity: str  # Critical, High, Medium, Low
    confidence: float
    original_code: str
    proposed_fix: Optional[str] = None
    explanation: Optional[str] = None

@dataclass
class AgentAction:
    iteration: int
    action_type: str  # plan, decide, act, evaluate
    detail: str
    result: Optional[str] = None

from .memory import AgentMemory

class AgentState:
    def __init__(self, repo_path: str):
        self.repo_path = repo_path
        self.iteration = 0
        self.current_plan: List[str] = []
        self.issues: List[AgentIssue] = []
        self.history: List[AgentAction] = []
        self.memory = AgentMemory()
        self.status = "idle"  # idle, planning, deciding, acting, evaluating, completed, failed
        self.stop_reason: Optional[str] = None

    def add_action(self, action_type: str, detail: str, result: Optional[str] = None):
        action = AgentAction(
            iteration=self.iteration,
            action_type=action_type,
            detail=detail,
            result=result
        )
        self.history.append(action)
        return action

    def to_dict(self):
        return {
            "iteration": self.iteration,
            "status": self.status,
            "current_plan": self.current_plan,
            "issues": [vars(i) for i in self.issues],
            "history": [vars(a) for a in self.history],
            "memory": {
                "fixed_files": self.memory.fixed_files,
                "handled_issues": self.memory.handled_issues
            },
            "stop_reason": self.stop_reason
        }
