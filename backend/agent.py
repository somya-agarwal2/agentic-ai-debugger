"""
Core AI Agent Logic for Real Analyzing and Fixing Code using Ollama (phi3).
"""
from tools import run_tests, analyze_code, generate_fix

def run_agent_loop(code: str, max_iterations: int = 1) -> dict:
    """
    Agent logic: Analyze and Suggest Fix.
    Returns the suggestion for user review.
    """
    print(f"\n--- AI SUGGESTION GENERATION ---")
    logs = []
    
    def log_action(action, detail):
        logs.append({"action": action, "detail": detail})
        print(f"AGENT ACTION: {action} | {detail}")

    # 1. Analyze
    log_action("Analysis", "Scanning code for issues...")
    analysis = analyze_code(code)
    
    error = analysis.get("error")
    explanation = analysis.get("explanation")
    fixed_code = analysis.get("fixed_code")

    if error == "None":
        log_action("Result", "No bugs detected. Code looks clean.")
        return {
            "status": "fixed",
            "code": code,
            "logs": logs,
            "result": "Code is already clean."
        }

    log_action("Detection", f"Issue found: {error}")
    
    # If analyze_code didn't already provide fixed_code, or it's same as original
    if not fixed_code or fixed_code == code:
        log_action("Fixing", "Generating suggestion...")
        fix_res = generate_fix(code, explanation)
        fixed_code = fix_res.get("fixed_code", code)

    log_action("Suggestion", "Generated fix for user review.")

    return {
        "status": "review_ready",
        "code": code,  # Keep original code as 'code'
        "fix": fixed_code, # Suggested fix
        "error": error,
        "explanation": explanation,
        "logs": logs,
        "result": "AI has suggested a fix. Please review below."
    }

def fix_code(code: str, error_details: str = "") -> dict:
    """Legacy compatibility wrapper"""
    return generate_fix(code, error_details)
