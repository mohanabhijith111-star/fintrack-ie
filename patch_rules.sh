#!/bin/bash
# Fix rule automation - sacred manual override, no silent backfill, no auto-rules
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "=== Rule fix patch ==="
echo "Lines before: $(wc -l < $FILE)"

# Find updateTxCategory function
FNSTART=$(grep -n "function updateTxCategory(id, category, thisOneOnly)" "$FILE" | head -1 | cut -d: -f1)
if [ -z "$FNSTART" ]; then
  FNSTART=$(grep -n "function updateTxCategory(id, category)" "$FILE" | head -1 | cut -d: -f1)
fi
FNEND=$(awk -v s="$FNSTART" 'NR>=s && /^  \}$/ {print NR; exit}' "$FILE")
echo "updateTxCategory: lines $FNSTART to $FNEND"

# Delete old function
sed -i "${FNSTART},${FNEND}d" "$FILE"

# Insert new clean function
sed -i "$((FNSTART-1))a\\  function updateTxCategory(id, category) {\n    const nature = defaultNature(category);\n    const tx = transactions.find(t => t.id === id);\n    if (!tx) return;\n    // Mark this transaction as manually categorised - rules will never overwrite it\n    setTransactions(prev => prev.map(t => t.id === id ? {...t, category, nature, manualCategory: true} : t));\n    const kw = (() => {\n      const k = tx.description.split(' ').slice(0,3).join(' ').toLowerCase().trim();\n      return k.length > 2 ? k : null;\n    })();\n    // Find ONLY uncategorised + non-manual transactions matching this description\n    const matches = kw\n      ? transactions.filter(t =>\n          t.id !== id &&\n          !t.manualCategory &&\n          (!t.category || t.category === '') &&\n          t.description.toLowerCase().includes(kw)\n        )\n      : [];\n    // Show checkbox modal only if there are uncategorised matches\n    if (matches.length > 0) {\n      setCategoryPrompt({ id, category, nature, kw, matches: matches.slice(0,50).map(t=>({tx:t,checked:true})) });\n      return;\n    }\n    // Loan prompts for the single transaction only\n    if (LOAN_RECEIVED_CATS.has(category) || LOAN_REPAYMENT_CATS.has(category)) {\n      setLoanPrompt({ tx: {...tx, category, nature}, type: LOAN_RECEIVED_CATS.has(category) ? 'received' : 'repayment', count: 1 });\n    }\n  }" "$FILE"
echo "Fix 1 done: updateTxCategory - only uncategorised, manual flag, no auto-rules"

# Fix 2: onConfirm in CategoryPromptModal - mark confirmed txns as manualCategory
# Also remove rule creation from onConfirm
CONFIRM_LINE=$(grep -n "setTransactions(prev => prev.map(t => selectedTxs.find" "$FILE" | head -1 | cut -d: -f1)
echo "onConfirm at line $CONFIRM_LINE"
sed -i "${CONFIRM_LINE}s/setTransactions(prev => prev.map(t => selectedTxs.find(s=>s.id===t.id) ? {...t,category:p.category,nature:p.nature} : t));/setTransactions(prev => prev.map(t => selectedTxs.find(s=>s.id===t.id) ? {...t,category:p.category,nature:p.nature,manualCategory:true} : t));/" "$FILE"
echo "Fix 2 done: confirmed txns get manualCategory:true"

# Fix 3: Rules tab - add explanatory note that rules apply to imports only
RULES_HEADER=$(grep -n '"Manage Categories"' "$FILE" | head -1 | cut -d: -f1)
if [ ! -z "$RULES_HEADER" ]; then
  RULES_DESC=$((RULES_HEADER + 1))
  sed -i "${RULES_DESC}s/Add custom categories/Rules apply automatically when importing new transactions. Manually categorised transactions are never overwritten by rules./" "$FILE"
  echo "Fix 3 done: rules tab description updated"
fi

# Fix 4: applyRules on import - only apply to transactions WITHOUT manualCategory
APPLY_RULES_LINE=$(grep -n "applyRules(tx.description, rules)" "$FILE" | head -1 | cut -d: -f1)
echo "applyRules on import at line $APPLY_RULES_LINE"
if [ ! -z "$APPLY_RULES_LINE" ]; then
  sed -i "${APPLY_RULES_LINE}s/category: tx.category || applyRules(tx.description, rules) || null/category: tx.category || (!tx.manualCategory ? applyRules(tx.description, rules) : null) || null/" "$FILE"
  echo "Fix 4 done: import rules respect manualCategory"
fi

# ── VERIFY ───────────────────────────────────────────────────────────────────────
echo ""
echo "=== Verification ==="
echo "Lines after: $(wc -l < $FILE)"
echo "manualCategory flag:     $(grep -c 'manualCategory: true' "$FILE")"
echo "Only uncategorised:      $(grep -c 'category === ..' "$FILE" | head -1)"
echo "No auto rules:           $(grep -c 'setRules.*kw.*category' "$FILE")"
echo ""
tail -5 "$FILE"
echo ""
echo "If manualCategory count >= 2, run:"
echo "  git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m 'Fix rule engine: manual override sacred, no auto-rules, only uncategorised backfill' && git -C ~/Downloads/fintrack-ie push origin main"
