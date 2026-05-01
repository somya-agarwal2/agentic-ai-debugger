import tempfile
import os
from .state import AgentState, AgentIssue
from .planner import Planner
from .decision import DecisionMaker
from .tools import generate_fix

def run_agent_loop(code: str, max_iterations: int = 1) -> dict:
    """
    Modular Agent Loop: Coordinates planning, decision-making, and execution.
    """
    print(f"\n--- STARTING MODULAR AGENT LOOP ---", flush=True)
    
    # 1. Setup State (Using a temp file for the provided code snippet)
    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, "analysis_target.py")
    with open(temp_file_path, "w", encoding="utf-8") as f:
        f.write(code)
    
    state = AgentState(repo_path=temp_file_path)
    planner = Planner(state)
    decision_maker = DecisionMaker(state)
    
    logs = []
    def log_action(action, detail):
        logs.append({"action": action, "detail": detail})
        print(f"AGENT ACTION: {action} | {detail}", flush=True)

    # 2. Plan
    log_action("Planning", "Analyzing code structure...")
    plan = planner.create_plan()
    for p in plan:
        print(f"PLAN STEP: {p}", flush=True)

    # 3. Decide
    log_action("Deciding", "Evaluating detected issues...")
    issue = decision_maker.decide_next_issue()
    
    if not issue:
        log_action("Result", "No issues detected. Code is clean.")
        return {
            "status": "fixed",
            "code": code,
            "logs": logs,
            "result": "Code is already clean."
        }

    log_action("Decision", f"Focusing on: {issue.issue_type} in {issue.file_path}")

    # 4. Act
    log_action("Acting", f"Generating fix for: {issue.description[:50]}...")
    
    # If the planner already got a fix from analyze_code, use it
    fixed_code = issue.proposed_fix
    explanation = issue.explanation

    if not fixed_code or fixed_code == code:
        fix_res = generate_fix(code, issue.description)
        fixed_code = fix_res.get("fixed_code", code)
        explanation = fix_res.get("explanation", "AI suggested fix")

    log_action("Action", "Fix generated successfully.")

    # Cleanup
    try:
        os.remove(temp_file_path)
        os.rmdir(temp_dir)
    except:
        pass

    return {
        "status": "review_ready",
        "code": code,
        "fixed_code": fixed_code,
        "error": issue.issue_type,
        "explanation": explanation,
        "logs": logs,
        "result": "Modular AI has suggested a fix. Please review."
    }
