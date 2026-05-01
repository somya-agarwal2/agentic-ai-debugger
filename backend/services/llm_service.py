import os
import requests
import json
import re

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

def call_grok(prompt, retry_count=1):
    """
    Communicates with Groq API (OpenAI-compatible).
    Uses llama3-70b-8192 for fast, high-quality inference.
    """
    api_key = os.getenv("GROK_API_KEY")
    if not api_key:
        return "Error: GROK_API_KEY not found in environment."

    print(f"\n--- GROQ REQUEST [Retry: {1 - retry_count}] ---")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are an expert autonomous AI debugger. Respond ONLY in valid JSON format as requested."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0
    }

    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=90)
        print(f"Status Code: {response.status_code}", flush=True)
        response.raise_for_status()
        
        data = response.json()
        output = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        if not output:
            print("Warning: Groq returned empty content.")
        return output

    except requests.exceptions.HTTPError as e:
        body = ""
        try: body = e.response.json()
        except: body = e.response.text
        print(f"GROQ HTTP ERROR {e.response.status_code}: {body}", flush=True)
        return f"Error: Groq API returned {e.response.status_code}. Details: {body}"
    except requests.exceptions.Timeout as e:
        print(f"GROQ TIMEOUT ERROR: {str(e)}", flush=True)
        return "Error: Groq request timed out."
    except requests.exceptions.ConnectionError as e:
        print(f"GROQ CONNECTION ERROR: {str(e)}", flush=True)
        if retry_count > 0:
            print("Retrying Groq request...", flush=True)
            return call_grok(prompt, retry_count - 1)
        return f"Error: Unable to connect to Groq API."
    except Exception as e:
        print(f"GROQ UNKNOWN ERROR: {str(e)}")
        return f"Groq Error: {str(e)}"

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
