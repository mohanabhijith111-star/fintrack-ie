#!/bin/bash
FILE=~/Downloads/fintrack-ie/src/App.jsx

# Get line numbers for key functions
DEBT_START=$(grep -n "^function DebtCard" "$FILE" | head -1 | cut -d: -f1)
LOAN_MODAL=$(grep -n "^function LoanPromptModal" "$FILE" | head -1 | cut -d: -f1)
LIAB_START=$(grep -n "Add Liability" "$FILE" | head -1 | cut -d: -f1)

echo "DebtCard: $DEBT_START to $((LOAN_MODAL-1)) ($(($LOAN_MODAL-$DEBT_START)) lines)"
echo "LoanPromptModal: $LOAN_MODAL"
echo "Add Liability section: $LIAB_START"
echo ""
echo "=== Debt creation form (20 lines) ==="
sed -n "${LIAB_START},$((LIAB_START+20))p" "$FILE"
echo ""
echo "=== Where DebtCard is called ==="
grep -n "<DebtCard" "$FILE"
echo ""
echo "=== calcPMT and calcPayoffMonths functions ==="
grep -n "function calcPMT\|function calcPayoff\|function calcTerm\|function calcOptimal" "$FILE"
echo ""
echo "=== Debt state variables ==="
grep -n "debts.*useState\|setDebts\|paymentHistory\|debtAllocated" "$FILE" | head -15
