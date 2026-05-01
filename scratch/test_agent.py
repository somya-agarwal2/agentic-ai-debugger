import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from agent import run_agent_loop

test_code = """
def calculate_sum(a, b):
    # There is a logical bug here
    result = a - b 
    return result

print("Result:", calculate_sum(5, 3))
"""

print("Running Autonomous Loop Test...")
result = run_agent_loop(test_code, max_iterations=2)

print("\nFINAL RESULT:")
print("Status:", result.get('status'))
print("Steps Taken:", len(result.get('steps')))
print("Fixed Code Preview:", result.get('code', '')[:100], "...")
