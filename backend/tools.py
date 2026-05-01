"""
Helper functions and tools for the AI Debugging Agent.
Optimized for Ollama (phi3).
"""
import os
import requests
import json
import traceback
import ast
import re

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "phi3"
PROMPTS_FILE = os.path.join(os.path.dirname(__file__), "prompts.json")

def load_prompts():
    """
    Safely loads prompts from prompts.json with fallbacks.
    """
    defaults = {
        "analyze_prompt": "Analyze code for bugs: {code}",
        "fix_prompt": "Fix this code: {code} for error: {error_details}",
        "planner_prompt": "Plan for repo: {repo_path}. Files: {file_list}",
        "decision_prompt": "Decide on issues: {issues_list}"
    }
    try:
        if os.path.exists(PROMPTS_FILE):
            with open(PROMPTS_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                # Ensure all default keys exist
                for k, v in defaults.items():
                    if k not in loaded:
                        loaded[k] = v
                return loaded
        return defaults
    except Exception as e:
        print(f"Error loading prompts: {e}")
        return defaults

def save_prompts(prompts):
    """
    Validates and saves prompts to prompts.json.
    """
    if not isinstance(prompts, dict):
        raise ValueError("Prompts must be a dictionary")
    
    for k, v in prompts.items():
        if not v or not isinstance(v, str) or len(v.strip()) < 5:
            raise ValueError(f"Prompt '{k}' is too short or invalid")
            
    with open(PROMPTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(prompts, f, indent=2)
    return True

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

def call_ollama(prompt, retry_count=1):
    """
    Core function to communicate with Ollama API.
    Handles retries and provides detailed logging.
    """
    print(f"\n--- OLLAMA REQUEST [Retry: {1 - retry_count}] ---")
    print(f"URL: {OLLAMA_URL}")
    print(f"Model: {OLLAMA_MODEL}")
    
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=90)
        print(f"Status Code: {response.status_code}", flush=True)
        
        response.raise_for_status()
        
        try:
            data = response.json()
            output = data.get("response", "")
            if not output:
                print("Warning: Ollama returned empty response field.")
            return output
        except json.JSONDecodeError:
            print("Error: Failed to parse JSON response from Ollama.")
            return "Error: Invalid JSON from Ollama."

    except requests.exceptions.Timeout as e:
        print(f"OLLAMA TIMEOUT ERROR: {str(e)}", flush=True)
        return "Error: Ollama request timed out. The model is responding too slowly."
    except requests.exceptions.ConnectionError as e:
        print(f"OLLAMA CONNECTION ERROR: {str(e)}", flush=True)
        if retry_count > 0:
            print("Retrying Ollama request (Connection Error)...", flush=True)
            return call_ollama(prompt, retry_count - 1)
        return f"Error: Unable to connect to Ollama. Is it running at {OLLAMA_URL}?"
    except Exception as e:
        print(f"OLLAMA UNKNOWN ERROR: {str(e)}")
        return f"Ollama Error: {str(e)}"

def extract_code_from_ai(raw, original_code=""):
    """
    Robustly extracts fixed_code and explanation from AI response.
    """
    if not raw: return original_code, "No response", []
    
    # Handle direct error messages from call_ollama
    if isinstance(raw, str) and raw.startswith("Error:"):
        return original_code, raw, []
    
    def final_clean(text):
        if not text: return ""
        text = text.replace('\\n', '\n')
        text = re.sub(r'```[\s\S]*?```', '', text)
        return text.strip()

    try:
        clean_json = raw.strip()
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[1].split("```")[0].strip()
            
        data = json.loads(clean_json)
        if isinstance(data, list): data = data[0]
        
        fixed = data.get("fixed_code") or data.get("code") or data.get("fix")
        expl = data.get("explanation") or data.get("error") or "AI generated fix"
        trace = data.get("trace") or []
        severity = data.get("severity") or "Medium"
        category = data.get("category") or "Logic"
        
        if fixed: return final_clean(str(fixed)), final_clean(str(expl)), trace, severity, category
    except:
        pass

    # Regex fallbacks
    python_block = re.search(r"```python\s*([\s\S]*?)```", raw, re.IGNORECASE)
    if python_block: return final_clean(python_block.group(1)), "Extracted from markdown", [], "Medium", "Logic"

    return original_code, "AI format issue: fallback applied", [], "High", "Syntax"

def validate_fix_integrity(original, fixed):
    if not fixed or fixed == original: return True, "No changes."
    def get_func_names(code):
        return set(re.findall(r"def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", code))
    orig_funcs = get_func_names(original)
    fix_funcs = get_func_names(fixed)
    if not orig_funcs.issubset(fix_funcs): return False, "Functions removed."
    return True, "Valid."

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
        
        print("\n[ANALYZE PROMPT USED]", flush=True)
        prompts = load_prompts()
        prompt = prompts["analyze_prompt"].format(syntax_context=syntax_context, code=code)
        
        raw = call_ollama(prompt)
        fix_val, exp_val, trace_val, severity, category = extract_code_from_ai(raw, code)
        
        has_issue = fix_val.strip() != code.strip()
        issue_type = "Logic or Syntax Issue" if has_issue else None
        
        # --- STRICT AGENTIC PRIORITY RULES ---
        priority_reason = "Logic evaluation"
        
        # Priority 1: Syntax (Blocking)
        if pre_issues or category == "Syntax" or (issue_type and "Syntax" in issue_type):
            has_issue = True
            issue_type = "Syntax Error (Pre-scan)" if pre_issues else "Syntax Error"
            severity = "High"
            category = "Syntax"
            priority_reason = "Blocks execution"
            if pre_issues:
                exp_val = f"Critical syntax error detected: {pre_issues[0]['message']} on line {pre_issues[0]['line']}"
        
        # Priority 2: Runtime/System (Crashes)
        elif category == "Runtime" or category == "System" or (issue_type and "Timeout" in issue_type):
            has_issue = True
            severity = "High"
            category = "Runtime"
            priority_reason = "Crashes app or engine"
            
        # Priority 3: Logic
        elif has_issue or category == "Logic":
            has_issue = True
            severity = "Medium"
            category = "Logic"
            priority_reason = "Produces incorrect output"
            if not issue_type: issue_type = "Logic Anomaly"
            
        # Default/Style
        else:
            severity = "Low"
            category = "Style"
            priority_reason = "Cosmetic improvement"

        # Targeted Quick Fix for Syntax
        if (category == "Syntax" or category == "Runtime") and fix_val.strip() == code.strip():
            print("\n[QUICK FIX PROMPT USED]", flush=True)
            quick_prompt = f"Fix the Python {category} error in this code:\n{code}\nReturn ONLY the complete fixed code."
            quick_fix = call_ollama(quick_prompt, retry_count=0)
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
        print(f"Error in analyze_code: {e}")
        return {"has_issue": False, "fixed_code": code}

def generate_fix(code, error_details=""):
    """
    Generates fix using dynamic prompt.
    """
    print("\n[FIX PROMPT USED]", flush=True)
    prompts = load_prompts()
    prompt = prompts["fix_prompt"].format(error_details=error_details, code=code)
    
    raw = call_ollama(prompt)
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
