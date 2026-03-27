#!/bin/bash
# Add "+ Rule" button to TxRow after category is set
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "=== Rule button patch ==="

# Find the TxRow signature to add onCreateRule prop
TXROW_SIG=$(grep -n "^function TxRow({" "$FILE" | head -1 | cut -d: -f1)
echo "TxRow signature at line $TXROW_SIG"
# Add onCreateRule to props
sed -i "${TXROW_SIG}s/onSplit, onOverride })/onSplit, onOverride, onCreateRule })/" "$FILE"

# Find the delete button line in TxRow to insert "+ Rule" button before it
DEL_LINE=$(grep -n 'onClick={onDelete} style={{ background: "none", border: "none", color: T\.textDim' "$FILE" | head -1 | cut -d: -f1)
echo "Delete button at line $DEL_LINE"

# Insert "+ Rule" button before delete button - only shows when tx has a category
sed -i "${DEL_LINE}i\\        {tx.category && onCreateRule && (<button onClick={()=>onCreateRule(tx)} title=\"Save as auto-categorisation rule for future imports\" style={{background:\"rgba(240,160,60,0.08)\",color:\"#F0A03C\",border:\"1px solid rgba(240,160,60,0.25)\",borderRadius:5,padding:\"2px 6px\",fontSize:9,cursor:\"pointer\",fontFamily:\"inherit\",flexShrink:0}}>+ Rule<\/button>)}" "$FILE"

# Find the TxRow callsite and add onCreateRule handler
ONSPLIT_CALLSITE=$(grep -n "onSplit={tx => setSplitTx(tx)}" "$FILE" | head -1 | cut -d: -f1)
echo "onSplit callsite at line $ONSPLIT_CALLSITE"
sed -i "${ONSPLIT_CALLSITE}a\\                    onCreateRule={tx => {\n                      const kw = tx.description.split(' ').slice(0,3).join(' ').toLowerCase().trim();\n                      if (!kw) return;\n                      setRules(prev => {\n                        const exists = prev.findIndex(r => r.keywords?.includes(kw));\n                        if (exists >= 0) { alert('A rule for \"' + kw + '\" already exists.'); return prev; }\n                        return [...prev, { id: Date.now().toString(), keywords: [kw], category: tx.category, created: today() }];\n                      });\n                      alert('Rule created: \"' + kw + '\" → ' + tx.category + '. Future imports matching this will be auto-categorised.');\n                    }}" "$FILE"

# Verify
echo ""
echo "=== Verification ==="
echo "Lines after: $(wc -l < $FILE)"
echo "onCreateRule prop:    $(grep -c 'onCreateRule' "$FILE")"
echo "+ Rule button:        $(grep -c '+ Rule' "$FILE")"
echo ""
tail -5 "$FILE"
echo ""
echo "If onCreateRule count >= 3, run:"
echo "  git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m 'Add + Rule button to transactions - create rules from individual transactions' && git -C ~/Downloads/fintrack-ie push origin main"
