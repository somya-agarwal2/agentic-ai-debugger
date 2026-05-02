import ast
from services.llm_service import call_grok, extract_code_from_ai
from services.prompt_service import load_prompts
from utils.logger import logger

def execute_with_trace(code):
    """
    Safely executes code line-by-line to generate a runtime trace.
    """
    trace = []
    local_vars = {}
    FORBIDDEN = ["import ", "open(", "os.", "sys.", "eval(", "exec(", "__", "socket", "subprocess", "requests"]
    
    try:
        lines = code.split("\n")
        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "def " in stripped:
                continue
            
            if any(forbidden in stripped for forbidden in FORBIDDEN):
                trace.append(f"Line {i+1}: ⚠️ Blocked unsafe operation → {stripped}")
                continue
            
            try:
                if "=" in line and "==" not in line and "!=" not in line and ">=" not in line and "<=" not in line:
                    exec(stripped, {"__builtins__": {}}, local_vars)
                    display_vars = {k: v for k, v in local_vars.items() if not k.startswith("__")}
                    trace.append(f"Line {i+1}: {stripped} → {display_vars}")
                elif "(" in line and ")" in line:
                    trace.append(f"Line {i+1}: ⚡ Function Call → {stripped}")
            except:
                trace.append(f"Line {i+1}: 🏃 Processing → {stripped}")
        
        return [f"🧪 Execution Trace:"] + trace if trace else []
    except Exception as e:
        return [f"🧪 Execution Trace [Error]: {str(e)}"]

def check_syntax_and_patterns(code):
    issues = []
    if code.strip():
        try:
            ast.parse(code)
        except SyntaxError as e:
            issues.append({"type": "SyntaxError", "message": str(e), "line": e.lineno})
    return issues

def analyze_code(code):
    """
    Analyzes code using dynamic prompt.
    """
    try:
        pre_issues = check_syntax_and_patterns(code)
        syntax_context = f"Syntax issues found: {pre_issues}" if pre_issues else ""
        
        logger.info("[ANALYZE PROMPT USED]")
        prompts = load_prompts()
        prompt = prompts["analyze_prompt"].format(syntax_context=syntax_context, code=code)
        
        raw = call_grok(prompt)
        print("RAW RESPONSE:", raw)
        fix_val, exp_val, trace_val, severity, category = extract_code_from_ai(raw, code)
        print("EXTRACTED:", (fix_val, exp_val, trace_val, severity, category))
        
        has_issue = fix_val.strip() != code.strip()
        issue_type = "Logic or Syntax Issue" if has_issue else None
        
        if isinstance(raw, str) and (raw.startswith("Error:") or raw.startswith("Groq Error:")):
            has_issue = True
            issue_type = "API Error"
            category = "System"
            severity = "High"
        
        priority_reason = "Logic evaluation"
        
        if pre_issues or category == "Syntax" or (issue_type and "Syntax" in issue_type):
            has_issue = True
            issue_type = "Syntax Error (Pre-scan)" if pre_issues else "Syntax Error"
            severity = "High"
            category = "Syntax"
            priority_reason = "Blocks execution"
            if pre_issues:
                exp_val = f"Critical syntax error detected: {pre_issues[0]['message']} on line {pre_issues[0]['line']}"
        
        elif category == "Runtime" or category == "System" or (issue_type and "Timeout" in issue_type):
            has_issue = True
            severity = "High"
            category = "Runtime"
            priority_reason = "Crashes app or engine"
            
        elif has_issue or category == "Logic":
            has_issue = True
            severity = "Medium"
            category = "Logic"
            priority_reason = "Produces incorrect output"
            if not issue_type: issue_type = "Logic Anomaly"
            
        else:
            severity = "Low"
            category = "Style"
            priority_reason = "Cosmetic improvement"

        if (category == "Syntax" or category == "Runtime") and fix_val.strip() == code.strip():
            logger.info("[QUICK FIX PROMPT USED]")
            quick_prompt = f"Fix the Python {category} error in this code:\n{code}\nReturn ONLY the complete fixed code."
            quick_fix = call_grok(quick_prompt, retry_count=0)
            if quick_fix and not quick_fix.startswith("Error:"):
                if "```" in quick_fix:
                    quick_fix = quick_fix.split("```")[1].split("```")[0].strip()
                    if quick_fix.startswith("python"): quick_fix = quick_fix[6:].strip()
                fix_val = quick_fix
                exp_val += ". Targeted agentic recovery applied."

        exec_trace = execute_with_trace(code)
        final_trace = exec_trace + (["🧠 AI Reasoning:"] + trace_val if trace_val else [])
        
        return {
            "has_issue": has_issue,
            "issue": issue_type,
            "explanation": exp_val,
            "fixed_code": fix_val,
            "trace": final_trace,
            "severity": severity,
            "category": category,
            "priority_reason": priority_reason
        }
    except Exception as e:
        logger.error(f"Error in analyze_code: {e}")
        return {"has_issue": False, "fixed_code": code}

def generate_fix(code, error_details=""):
    """
    Generates fix using dynamic prompt.
    """
    logger.info("[FIX PROMPT USED]")
    prompts = load_prompts()
    prompt = prompts["fix_prompt"].format(error_details=error_details, code=code)
    
    raw = call_grok(prompt)
    fix_val, exp_val, _ = extract_code_from_ai(raw, code)
    return {"fixed_code": fix_val, "explanation": exp_val}

def run_tests(code):
    output_buffer = []
    def mocked_print(*args): output_buffer.append(" ".join(map(str, args)))
    try:
        exec(code, {"__builtins__": __builtins__, "print": mocked_print})
        return {"passed": True, "output": "\n".join(output_buffer)}
    except Exception as e:
        return {"passed": False, "error": str(e)}

def validate_code_input(code):
    return bool(code and isinstance(code, str) and code.strip())
