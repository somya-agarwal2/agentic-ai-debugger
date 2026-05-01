from tools import analyze_code

code = """def sum(a,b):
    result=a-b
    return result
print(sum(5,6))

def diff(c,d):
    diff+c-d
    diff(3,4)

  de multi(e,f):
mult=e-f
multi(4,5)"""

print("--- ANALYZING BUGGY CODE ---")
result = analyze_code(code)
print("\n--- RESULTS ---")
print(f"Has Issue: {result['has_issue']}")
print(f"Explanation: {result['explanation']}")
print(f"Fixed Code:\n{result['fixed_code']}")
