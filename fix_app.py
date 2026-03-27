import sys, re

path = sys.argv[1]
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

lines = content.split('\n')
print(f"Input: {len(lines)} lines")

# Step 1: Find the App function boundaries
app_start = next(i for i,l in enumerate(lines) if 'export default function App()' in l)
print(f"App starts at line {app_start+1}")

# Step 2: Find where sidebar/main opens (our new layout)
main_open = next(i for i,l in enumerate(lines) if '<main className="main-content"' in l)
print(f"<main> opens at line {main_open+1}")

# Step 3: Find the loanPrompt modal end - this is the last JSX in the return
loan_end = next(i for i,l in enumerate(lines) if "setLoanPrompt(null)\n" in '\n'.join(lines[i:i+3]) and '/>' in '\n'.join(lines[i:i+5]))
# Find the )} that closes the loanPrompt conditional
loan_close = None
for i in range(loan_end, loan_end+10):
    if lines[i].strip() == ')}':
        loan_close = i
        break

if loan_close is None:
    # Find it differently
    for i in range(2080, 2110):
        if lines[i].strip() == ')}' and 'setLoanPrompt' in '\n'.join(lines[max(0,i-5):i]):
            loan_close = i
            break

print(f"loanPrompt closes at line {loan_close+1 if loan_close else 'NOT FOUND'}: {repr(lines[loan_close] if loan_close else '')}")

# Step 4: Find what comes after loan_close
if loan_close:
    print(f"Line after loan_close: {repr(lines[loan_close+1])}")
    print(f"Line +2: {repr(lines[loan_close+2])}")

# Step 5: Find end of file structure
print(f"\nLast 12 lines:")
for i in range(len(lines)-12, len(lines)):
    print(f"  {i+1}: {repr(lines[i])}")

