#!/bin/bash
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "=== DebtCard function bounds ==="
DEBT_START=$(grep -n "^function DebtCard" "$FILE" | head -1 | cut -d: -f1)
LOAN_MODAL=$(grep -n "^function LoanPromptModal" "$FILE" | head -1 | cut -d: -f1)
echo "DebtCard: $DEBT_START to $((LOAN_MODAL-1))"
echo "LoanPromptModal: $LOAN_MODAL"
echo ""
echo "=== Debt creation form (Add Liability) ==="
LIAB=$(grep -n "Add Liability" "$FILE" | head -1 | cut -d: -f1)
echo "Add Liability at: $LIAB"
echo ""
echo "=== DebtCard structure (first 80 lines) ==="
sed -n "${DEBT_START},$((DEBT_START+80))p" "$FILE"
