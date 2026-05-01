import json
from typing import Optional
from .state import AgentIssue, AgentState
from tools import load_prompts, call_ollama

class DecisionMaker:
    def __init__(self, state: AgentState):
        self.state = state

    def decide_next_issue(self) -> Optional[AgentIssue]:
        """
        Uses LLM to select the highest priority issue.
        """
        if not self.state.issues:
            print("--- AGENT DECISION: No issues found ---", flush=True)
            return None

        # [DECISION PROMPT USED]
        print("\n[DECISION PROMPT USED]", flush=True)
        prompts = load_prompts()
        base_prompt = prompts.get("decision_prompt", "")
        
        issues_info = [
            {"index": i, "file": iss.file_path, "type": iss.issue_type, "severity": iss.severity}
            for i, iss in enumerate(self.state.issues)
        ]
        
        prompt = base_prompt.format(issues_list=json.dumps(issues_info, indent=2))
        raw_response = call_ollama(prompt)
        
        selected_index = 0
        try:
            clean_json = raw_response.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()
            
            data = json.loads(clean_json)
            selected_index = int(data.get("selected_index", 0))
            reasoning = data.get("reasoning", "Selected based on heuristic.")
            print(f"AGENT REASONING: {reasoning}", flush=True)
        except:
            print("AGENT DECISION: LLM failed to decide, falling back to first issue.", flush=True)

        if 0 <= selected_index < len(self.state.issues):
            issue = self.state.issues[selected_index]
            issue_id = f"{issue.file_path}:{issue.issue_type}"
            
            if issue_id not in self.state.memory.handled_issues:
                print(f"--- AGENT DECISION: Selected {issue_id} (Severity: {issue.severity}) ---", flush=True)
                return issue
        
        print("--- AGENT DECISION: Selected issue already handled or invalid index ---", flush=True)
        return None
