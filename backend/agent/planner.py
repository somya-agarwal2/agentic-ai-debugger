import os
import json
from typing import List
from .state import AgentIssue, AgentState
from tools import analyze_code, load_prompts, call_ollama

class Planner:
    def __init__(self, state: AgentState):
        self.state = state

    def create_plan(self) -> List[str]:
        """
        Scans the repository and uses LLM to generate a plan.
        """
        print(f"--- AGENT PLAN: Scanning {self.state.repo_path} ---", flush=True)
        issues = self._scan_repository()
        self.state.issues = issues
        
        # [PLANNER PROMPT USED]
        print("\n[PLANNER PROMPT USED]", flush=True)
        prompts = load_prompts()
        base_prompt = prompts.get("planner_prompt", "")
        
        file_list = [i.file_path for i in issues]
        prompt = base_prompt.format(repo_path=self.state.repo_path, file_list=file_list)
        
        raw_response = call_ollama(prompt)
        
        try:
            # Try to extract JSON plan
            clean_json = raw_response.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()
            
            data = json.loads(clean_json)
            plan = data.get("plan", [f"Fix {len(issues)} detected issues."])
        except:
            plan = [f"Focus on {len(issues)} detected issues across the project."]

        self.state.current_plan = plan
        return plan

    def _scan_repository(self) -> List[AgentIssue]:
        issues = []
        VALID_EXTENSIONS = (".py", ".js", ".ts", ".jsx", ".tsx")
        
        if os.path.isfile(self.state.repo_path):
            return self._scan_file(self.state.repo_path, "")

        for root, _, files in os.walk(self.state.repo_path):
            for file in files:
                if file.lower().endswith(VALID_EXTENSIONS):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, self.state.repo_path)
                    issues.extend(self._scan_file(full_path, rel_path))
        return issues

    def _scan_file(self, full_path: str, rel_path: str) -> List[AgentIssue]:
        file_issues = []
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if not content.strip():
                return []
                
            analysis = analyze_code(content)
            if analysis.get("has_issue"):
                severity = "Medium"
                if "syntax" in analysis.get("issue", "").lower():
                    severity = "Critical"
                elif "error" in analysis.get("issue", "").lower():
                    severity = "High"
                
                file_issues.append(AgentIssue(
                    file_path=rel_path or os.path.basename(full_path),
                    issue_type=analysis.get("issue", "Bug"),
                    description=analysis.get("explanation", ""),
                    severity=severity,
                    confidence=0.9,
                    original_code=content,
                    proposed_fix=analysis.get("fixed_code"),
                    explanation=analysis.get("explanation")
                ))
        except Exception as e:
            print(f"Error scanning {rel_path}: {e}")
        return file_issues
