from dataclasses import dataclass, field
from typing import List, Dict

@dataclass
class AgentMemory:
    fixed_files: List[str] = field(default_factory=list)
    handled_issues: List[str] = field(default_factory=list)
    failed_attempts: Dict[str, int] = field(default_factory=dict)

    def mark_fixed(self, file_path: str):
        if file_path not in self.fixed_files:
            self.fixed_files.append(file_path)

    def mark_handled(self, issue_id: str):
        if issue_id not in self.handled_issues:
            self.handled_issues.append(issue_id)
