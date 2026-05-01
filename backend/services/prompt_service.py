import os
import json

PROMPTS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "prompts.json")

def load_prompts():
    """
    Safely loads prompts from config/prompts.json with fallbacks.
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
    Validates and saves prompts to config/prompts.json.
    """
    if not isinstance(prompts, dict):
        raise ValueError("Prompts must be a dictionary")
    
    for k, v in prompts.items():
        if not v or not isinstance(v, str) or len(v.strip()) < 5:
            raise ValueError(f"Prompt '{k}' is too short or invalid")
            
    with open(PROMPTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(prompts, f, indent=2)
    return True
