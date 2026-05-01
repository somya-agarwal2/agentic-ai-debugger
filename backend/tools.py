"""
Helper functions and tools for the AI Debugging Agent.
Optimized for Ollama (phi3).
"""
import requests
import json
import traceback

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "phi3"

def call_ollama(prompt):
    """
    Core function to communicate with Ollama API.
    """
    print("\n--- OLLAMA REQUEST ---")
    print("PROMPT:", prompt)
    
    try:
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        }
        response = requests.post(OLLAMA_URL, json=payload, timeout=60)
        
        # Add debug logs as requested
        print("STATUS:", response.status_code)
        print("RAW:", response.text)
        
        response.raise_for_status()
        
        result = response.json()
        return result.get("response", "")
    except Exception as e:
        print("OLLAMA ERROR:", str(e))
        return f"Ollama Error: {str(e)}"

import re

def extract_code_from_ai(raw, original_code=""):
    """
    Robustly extracts fixed_code and explanation from ANY AI response format.
    Guarantees a non-empty return.
    """
    if not raw: return original_code, "No response from AI"
    
    print(f"\n--- RAW AI RESPONSE ---\n{raw}\n-----------------------")
    
    # Final cleanup: handle escaped newlines and markdown junk
    def final_clean(text):
        if not text: return ""
        # 1. Convert literal "\n" strings to real newlines
        text = text.replace('\\n', '\n')
        # 2. Strip any remaining markdown code blocks if they leaked into the content
        text = re.sub(r'```[\s\S]*?```', '', text)
        return text.strip()

    # 1. Try JSON parse first
    try:
        clean_json = raw.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json.replace("```json", "", 1).rsplit("```", 1)[0].strip()
        elif clean_json.startswith("```"):
            clean_json = clean_json.replace("```", "", 1).rsplit("```", 1)[0].strip()
            
        data = json.loads(clean_json)
        if isinstance(data, list) and len(data) > 0: data = data[0]
        
        fixed = data.get("fixed_code") or data.get("code") or data.get("fix")
        expl = data.get("explanation") or data.get("error") or "AI generated fix (JSON)"
        
        if fixed:
            print(f"PARSED: JSON match found")
            return final_clean(str(fixed)), final_clean(str(expl))
    except:
        pass

    # 2. Extract from ```python blocks
    python_block = re.search(r"```python\s*([\s\S]*?)```", raw, re.IGNORECASE)
    if python_block:
        print(f"PARSED: Python block match found")
        return final_clean(python_block.group(1)), "AI format issue: fallback applied"

    # 3. Extract from any ``` block
    generic_block = re.search(r"```\s*([\s\S]*?)```", raw)
    if generic_block:
        print(f"PARSED: Generic code block match found")
        return final_clean(generic_block.group(1)), "AI format issue: fallback applied"

    # 4. Fallback: return raw as code if it looks like code, or original if empty
    fallback_code = raw.strip()
    if not fallback_code or fallback_code == "None":
        print(f"PARSED: Empty/None fallback used")
        return original_code + "\n# AI fix unavailable", "AI format issue: fallback applied"
        
    print(f"PARSED: Raw text fallback used")
    return final_clean(fallback_code), "AI format issue: fallback applied"

def validate_fix_integrity(original, fixed):
    """
    Ensures AI didn't hallucinate new functions or rename existing ones.
    """
    if not fixed or fixed == original: return True
    
    # Extract function names using regex
    def get_func_names(code):
        return set(re.findall(r"def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", code))
    
    orig_funcs = get_func_names(original)
    fix_funcs = get_func_names(fixed)
    
    # 1. Check if original functions still exist
    if not orig_funcs.issubset(fix_funcs):
        return False, "AI renamed or removed original functions."
    
    # 2. Check if new functions were added
    if not fix_funcs.issubset(orig_funcs):
        return False, "AI added new unrelated functions."
        
    return True, None

def analyze_code(code):
    """
    Analyzes code and returns a structured JSON object.
    Safe, robust, and structurally strictly validated.
    """
    try:
        print("\n--- ANALYZING CODE ---")
        prompt = (
            "You are a strict code fixer.\n"
            "Fix the bug in the given code.\n"
            "Rules:\n"
            "- Do NOT change function name\n"
            "- Do NOT add new functions\n"
            "- Do NOT remove structure\n"
            "- ONLY correct the bug\n"
            "- Return ONLY valid JSON\n"
            "JSON FORMAT:\n"
            "{\n"
            "  \"error\": \"short description\",\n"
            "  \"explanation\": \"logic reasoning\",\n"
            "  \"fixed_code\": \"FULL CORRECTED PYTHON CODE\"\n"
            "}\n"
            f"Code:\n{code}"
        )
        raw_response = call_ollama(prompt)
        
        # Use the robust extractor
        fix_val, exp_val = extract_code_from_ai(raw_response, code)

        # --- STRUCTURAL INTEGRITY VALIDATION ---
        is_valid, reason = validate_fix_integrity(code, fix_val)
        if not is_valid:
            print(f"VALIDATION FAILED: {reason}")
            # Fallback to pattern swap if possible, else reject
            fix_val = code
            exp_val = f"AI generated invalid fix: {reason}"
        # ---------------------------------------

        # --- PATTERN-BASED FALLBACK ---
        if fix_val.strip() == code.strip():
            candidate = code
            swaps = [("+", "-"), ("-", "+"), ("*", "/"), ("/", "*")]
            lines = code.splitlines()
            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped.startswith("return") or "=" in stripped:
                    for bad, good in swaps:
                        if bad in stripped:
                            lines[i] = line.replace(bad, good, 1)
                            candidate = "\n".join(lines)
                            break
                    if candidate != code: break
            if candidate != code:
                fix_val = candidate
                exp_val = "Pattern-based fix applied: operator was swapped."
        # -----------------------------

        # Syntax check
        try:
            compile(fix_val, '<string>', 'exec')
        except Exception as e:
            fix_val = code
            exp_val = f"AI generated fix has syntax errors: {e}"

        # Determine if issue exists
        has_issue = True
        error_label = "Issue detected"
        
        if "No issues found" in raw_response or "No issues found" in exp_val or fix_val.strip() == code.strip():
            has_issue = False
            error_label = "No issues found"
            if fix_val.strip() == code.strip():
                fix_val = None

        return {
            "issue": has_issue,
            "error": error_label,
            "explanation": exp_val,
            "fixed_code": fix_val,
            "fix": fix_val,
            "line": 0,
            "confidence": "high"
        }

    except Exception as e:
        print("CRITICAL ERROR in analyze_code:", str(e))
        return {
            "issue": False,
            "error": str(e),
            "explanation": "Internal server error during analysis.",
            "fixed_code": None,
            "fix": None
        }

def generate_fix(code, error_details=""):
    """
    Generates a fix using robust extraction.
    """
    prompt = (
        "You are a Python code fixer. Your job is to fix the provided code.\n"
        f"Bug description: {error_details}\n"
        "Return ONLY a JSON object — no markdown, no extra text.\n"
        "JSON FORMAT:\n"
        "{\n"
        "  \"explanation\": \"what was wrong and what was changed\",\n"
        "  \"fixed_code\": \"the complete corrected Python code\"\n"
        "}\n"
        "RULES:\n"
        "- 'fixed_code' must contain the FULL corrected code, never empty\n"
        "- Output ONLY JSON\n"
        f"CODE TO FIX:\n{code}"
    )
    raw_response = call_ollama(prompt)
    
    fix_val, exp_val = extract_code_from_ai(raw_response, code)
    
    print(f"FINAL FIX EXTRACTED: {len(fix_val)} chars")
    
    return {
        "fixed_code": fix_val,
        "explanation": exp_val
    }

def run_tests(code):
    """
    Real test execution in a safe-ish environment.
    """
    print("\n--- TEST EXECUTION ---")
    output_buffer = []
    
    def mocked_print(*args, **kwargs):
        output_buffer.append(" ".join(map(str, args)))

    try:
        # Create a clean globals dict
        globals_dict = {"__builtins__": __builtins__, "print": mocked_print}
        exec(code, globals_dict)
        
        output = "\n".join(output_buffer)
        return {
            "passed": True,
            "output": output or "Code executed successfully.",
            "error": None
        }
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        return {
            "passed": False,
            "output": "\n".join(output_buffer),
            "error": error_msg
        }

def validate_code_input(code):
    return bool(code and isinstance(code, str) and code.strip())
