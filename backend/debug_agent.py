import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from agent import run_agent_loop

code = "def add(a,b):\n    return a - b  # Bug: should be +"

try:
    print("Running agent loop...")
    result = run_agent_loop(code)
    print("Result:", result)
except Exception as e:
    import traceback
    traceback.print_exc()
