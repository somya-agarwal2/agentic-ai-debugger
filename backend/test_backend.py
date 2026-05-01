import requests

url = "http://127.0.0.1:5000/agent-run"
payload = {"code": "def add(a,b):\n    return a - b  # Bug: should be +"}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.json()}")
except Exception as e:
    print(f"Request failed: {e}")
