import os
import sys
import shutil
import zipfile
import tempfile
import subprocess
import requests
from flask import Flask, request, jsonify, session, redirect
from flask_cors import CORS
from dotenv import load_dotenv
from tools import analyze_code, generate_fix, run_tests, validate_code_input
from agent import run_agent_loop

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev_secret_key")
CORS(app, supports_credentials=True)

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

@app.route('/login/github')
def github_login():
    print(f"--- GITHUB LOGIN START ---")
    print(f"CLIENT_ID: {GITHUB_CLIENT_ID}")
    github_url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&scope=user,repo"
    print(f"REDIRECT URL: {github_url}")
    return redirect(github_url)

@app.route('/github/callback')
def github_callback():
    print(f"--- GITHUB CALLBACK RECEIVED ---")
    code = request.args.get('code')
    if not code:
        print("ERROR: No code in callback")
        return jsonify({"error": "No code provided"}), 400
    
    # Exchange code for token
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code
    }
    
    print(f"Exchanging code for token...")
    res = requests.post(token_url, headers=headers, data=data)
    token_data = res.json()
    access_token = token_data.get("access_token")
    
    if not access_token:
        print(f"ERROR: Failed to get access token. Response: {token_data}")
        return jsonify({"error": "Failed to get access token"}), 401
    
    print(f"Access token received. Fetching user profile...")
    # Fetch user profile
    user_res = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {access_token}"}
    )
    user_data = user_res.json()
    print(f"Logged in as: {user_data.get('login')}")
    
    session["access_token"] = access_token
    session["user"] = {
        "login": user_data.get("login"),
        "avatar_url": user_data.get("avatar_url"),
        "name": user_data.get("name")
    }
    
    # Redirect back to frontend
    return redirect("http://localhost:5173")

@app.route('/auth/github/check')
def github_check():
    user = session.get("user")
    return jsonify({"user": user}), 200

@app.route('/auth/github/logout')
def github_logout():
    session.clear()
    return jsonify({"success": True}), 200


# Persistent storage for the current project context
current_project = {
    "files": [],
    "path": None,
    "issues_list": []
}

def get_file_structure(root_dir):
    file_list = []
    for root, dirs, files in os.walk(root_dir):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            if file.startswith('.'): continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, root_dir)
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                file_list.append({
                    "id": rel_path,
                    "name": file,
                    "path": rel_path,
                    "content": content
                })
            except:
                pass # Skip binary files
    return file_list

@app.route('/upload-project', methods=['POST'])
def upload_project():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    temp_dir = tempfile.mkdtemp()
    zip_path = os.path.join(temp_dir, 'project.zip')
    file.save(zip_path)
    
    extract_dir = os.path.join(temp_dir, 'extracted')
    os.makedirs(extract_dir)
    
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
    
    files = get_file_structure(extract_dir)
    current_project["files"] = files
    current_project["path"] = extract_dir
    
    return jsonify({"files": files}), 200

@app.route('/load-repo', methods=['POST'])
def load_repo():
    data = request.get_json()
    repo_url = data.get('url', '')
    if not repo_url:
        return jsonify({"error": "No URL provided"}), 400
    
    temp_dir = tempfile.mkdtemp()
    extract_dir = os.path.join(temp_dir, 'repo')
    
    try:
        subprocess.run(['git', 'clone', '--depth', '1', repo_url, extract_dir], check=True)
        files = get_file_structure(extract_dir)
        current_project["files"] = files
        current_project["path"] = extract_dir
        return jsonify({"files": files}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to clone repo: {str(e)}"}), 500

import base64
import time

def clean_github_url(url):
    """
    Cleans URLs like github.com/user/repo/tree/main -> github.com/user/repo.git
    """
    if not url: return ""
    url = url.strip()
    if "github.com" in url:
        # Split by / and take first 5 parts if possible
        parts = url.split("/")
        if len(parts) >= 5:
            # part 0: http:, part 1: '', part 2: github.com, part 3: owner, part 4: repo
            base = "/".join(parts[:5])
            if not base.endswith(".git"):
                base += ".git"
            return base
    return url

@app.route('/github/repos')
def github_repos():
    token = session.get("access_token")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        res = requests.get(
            "https://api.github.com/user/repos?sort=updated&per_page=50",
            headers={"Authorization": f"token {token}"}
        )
        return jsonify(res.json()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/github/create-pr', methods=['POST'])
def create_pr():
    print("--- PR CREATION STARTED ---")
    token = session.get("access_token")
    if not token:
        return jsonify({"success": False, "error": "Not logged in with GitHub"}), 401
    
    data = request.get_json()
    repo_url = data.get("repo_url")
    file_path = data.get("file_path")
    new_code = data.get("new_code")
    commit_msg = data.get("commit_message", "AI Fix: Improved code stability")
    
    try:
        # 1. Extract owner/repo
        # Expecting repo_url like https://github.com/owner/repo.git or just owner/repo
        clean_url = repo_url.replace("https://github.com/", "").replace(".git", "")
        parts = clean_url.split("/")
        if len(parts) < 2:
            return jsonify({"success": False, "error": "Invalid repo URL format"}), 400
        owner, repo = parts[0], parts[1]
        
        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # 2. Get default branch
        print(f"Fetching repo info for {owner}/{repo}...")
        repo_info = requests.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers).json()
        default_branch = repo_info.get("default_branch", "main")
        
        # 3. Create new branch
        new_branch = f"ai-fix-{int(time.time())}"
        print(f"Creating branch {new_branch} from {default_branch}...")
        base_ref = requests.get(f"https://api.github.com/repos/{owner}/{repo}/git/refs/heads/{default_branch}", headers=headers).json()
        sha = base_ref["object"]["sha"]
        
        create_branch_res = requests.post(
            f"https://api.github.com/repos/{owner}/{repo}/git/refs",
            headers=headers,
            json={"ref": f"refs/heads/{new_branch}", "sha": sha}
        )
        
        # 4. Get file SHA (required for update)
        print(f"Getting SHA for {file_path}...")
        file_info = requests.get(f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}?ref={new_branch}", headers=headers).json()
        file_sha = file_info.get("sha")
        
        # 5. Commit updated code
        print(f"Committing changes to {file_path}...")
        encoded_content = base64.b64encode(new_code.encode("utf-8")).decode("utf-8")
        commit_res = requests.put(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}",
            headers=headers,
            json={
                "message": commit_msg,
                "content": encoded_content,
                "branch": new_branch,
                "sha": file_sha
            }
        )
        
        # 6. Create Pull Request
        print(f"Opening PR: {new_branch} -> {default_branch}...")
        pr_res = requests.post(
            f"https://api.github.com/repos/{owner}/{repo}/pulls",
            headers=headers,
            json={
                "title": f"AI Debugger: Fix for {file_path}",
                "body": "Automated fix generated by Agentic AI Debugger.",
                "head": new_branch,
                "base": default_branch
            }
        ).json()
        
        pr_url = pr_res.get("html_url")
        if not pr_url:
            return jsonify({"success": False, "error": pr_res.get("message", "PR creation failed")}), 500
            
        print(f"SUCCESS: PR created at {pr_url}")
        return jsonify({"success": True, "pr_url": pr_url}), 200
        
    except Exception as e:
        print(f"PR ERROR: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_endpoint():
    data = request.get_json()
    code = data.get('code', '')
    if not validate_code_input(code):
        return jsonify({"error": "Invalid code input"}), 400
    result = analyze_code(code)
    return jsonify(result), 200

@app.route('/fix', methods=['POST'])
def fix_endpoint():
    data = request.get_json()
    code = data.get('code', '')
    error_details = data.get('error_details', '')
    if not validate_code_input(code):
        return jsonify({"error": "Invalid code input"}), 400
    result = generate_fix(code, error_details)
    return jsonify(result), 200

@app.route('/run-tests', methods=['POST'])
def run_tests_endpoint():
    data = request.get_json()
    code = data.get('code', '')
    if not validate_code_input(code):
        return jsonify({"error": "Invalid code input"}), 400
    result = run_tests(code)
    return jsonify(result), 200

@app.route('/analyze-repo', methods=['POST'])
def analyze_repo_endpoint():
    print("\n--- STARTING FULL REPO ANALYSIS ---")
    files = current_project.get("files", [])
    if not files:
        return jsonify({"error": "No project loaded"}), 400
    
    current_project["issues_list"] = []
    
    for file in files:
        file_name = file.get("name", "unknown")
        # Only analyze code files
        if not (file_name.endswith('.py') or file_name.endswith('.js') or file_name.endswith('.ts')):
            continue
            
        print(f"Analyzing file: {file_name}")
        try:
            code = file.get("content", "")
            result = analyze_code(code)
            
            issue_item = {
                "file": file_name,
                "issue": result.get("issue", False),
                "explanation": result.get("explanation", ""),
                "fix": result.get("fixed_code") or result.get("fix"),
                "original_code": code
            }
            
            current_project["issues_list"].append(issue_item)
            
            if issue_item["issue"]:
                print(f"Issue found in: {file_name}")
            else:
                print(f"No issue in: {file_name}")
                
        except Exception as e:
            print(f"Error analyzing {file_name}: {str(e)}")
            continue
            
    return jsonify({
        "issues_list": current_project["issues_list"],
        "selected_issue": current_project["issues_list"][0] if current_project["issues_list"] else None
    }), 200

@app.route('/agent-run', methods=['POST'])
def agent_run_endpoint():
    data = request.get_json()
    code = data.get('code', '')
    if not validate_code_input(code):
        return jsonify({"error": "Invalid code input"}), 400
    result = run_agent_loop(code)
    return jsonify(result), 200

if __name__ == '__main__':
    print("--- STARTING AGENTIC WORKSPACE BACKEND (PORT 5000) ---")
    app.run(debug=True, host='0.0.0.0', port=5000)
