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
    
    # 1. Try JSON parse first
    try:
        # Clean potential markdown wrapping before JSON parse
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
            return str(fixed).strip(), str(expl).strip()
    except:
        pass

    # 2. Extract from ```python blocks
    python_block = re.search(r"```python\s*([\s\S]*?)```", raw, re.IGNORECASE)
    if python_block:
        print(f"PARSED: Python block match found")
        return python_block.group(1).strip(), "AI response format issue — fallback applied (Extracted from python block)"

    # 3. Extract from any ``` block
    generic_block = re.search(r"```\s*([\s\S]*?)```", raw)
    if generic_block:
        print(f"PARSED: Generic code block match found")
        return generic_block.group(1).strip(), "AI response format issue — fallback applied (Extracted from code block)"

    # 4. Fallback: return raw as code if it looks like code, or original if empty
    fallback_code = raw.strip()
    if not fallback_code or fallback_code == "None":
        print(f"PARSED: Empty/None fallback used")
        return original_code + "\n# AI fix unavailable — manual review needed", "AI response format issue — fallback applied"
        
    print(f"PARSED: Raw text fallback used")
    return fallback_code, "AI response format issue — fallback applied (Raw AI output used)"

def analyze_code(code):
    """
    Analyzes code and returns a single structured JSON object.
    Uses hyper-robust extraction logic.
    """
    prompt = (
        "STRICT OUTPUT FORMAT: Return valid JSON.\n"
        "{\n"
        "  \"error\": \"string or 'No issues found'\",\n"
        "  \"explanation\": \"string\",\n"
        "  \"fixed_code\": \"string\"\n"
        "}\n"
        f"CODE TO ANALYZE:\n{code}"
    )
    raw_response = call_ollama(prompt)
    
    # Use the robust extractor
    fix_val, exp_val = extract_code_from_ai(raw_response, code)
    
    # Determine error label
    error_label = "Issue detected"
    if "No issues found" in raw_response or "No issues found" in exp_val or fix_val == code:
        if "# AI fix unavailable" not in fix_val:
            error_label = "No issues found"
            
    print(f"FINAL CODE EXTRACTED: {len(fix_val)} chars")
    
    return {
        "error": error_label,
        "explanation": exp_val,
        "fixed_code": fix_val,
        "line": 0,
        "confidence": "high"
    }

def generate_fix(code, error_details=""):
    """
    Generates a fix using robust extraction.
    """
    prompt = (
        f"Fix the following Python code based on this error: {error_details}\n"
        "Return valid JSON.\n"
        "{\n"
        "  \"explanation\": \"string\",\n"
        "  \"fixed_code\": \"string\"\n"
        "}\n"
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
