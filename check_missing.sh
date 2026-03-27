#!/bin/bash
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "Functions present in repo:"
grep -n "^function TxRow\|^function ManualTxForm\|^function AddOverheadForm\|^function RuleEditor\|^function DebtCard\|^function LoanPromptModal" "$FILE"
echo ""
echo "Total lines: $(wc -l < $FILE)"
