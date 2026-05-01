import requests
import json
import re

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "phi3"

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

    python_block = re.search(r"```python\s*([\s\S]*?)```", raw, re.IGNORECASE)
    if python_block: return final_clean(python_block.group(1)), "Extracted from markdown", [], "Medium", "Logic"

    return original_code, "AI format issue: fallback applied", [], "High", "Syntax"
