#!/bin/bash
FILE=~/Downloads/fintrack-ie/src/App.jsx

DEBT_START=$(grep -n "^function DebtCard" "$FILE" | head -1 | cut -d: -f1)
LOAN_MODAL=$(grep -n "^function LoanPromptModal" "$FILE" | head -1 | cut -d: -f1)
LIAB_START=$(grep -n "Add Liability" "$FILE" | head -1 | cut -d: -f1)

# Get the debt creation form - where does it end?
LIAB_END=$(awk -v s="$LIAB_START" 'NR>s && /Add Loan.*button|debtForm.*onClick|onClick.*addDebt|handleAddDebt/ {print NR; exit}' "$FILE")

echo "Key lines: DebtCard=$DEBT_START LoanModal=$LOAN_MODAL AddLiability=$LIAB_START"
echo ""
echo "=== Debt creation form (full) ==="
sed -n "${LIAB_START},$((LIAB_START+80))p" "$FILE"
echo ""
echo "=== DebtCard callsite ==="
sed -n "1998,2015p" "$FILE"
echo ""
echo "=== calcPMT function ==="
sed -n "2198,2235p" "$FILE"
echo ""
echo "=== Add Debt handler (where debt is saved) ==="
sed -n "1185,1215p" "$FILE"
echo ""
echo "=== onReduceDebt handler ==="
sed -n "2176,2200p" "$FILE"
