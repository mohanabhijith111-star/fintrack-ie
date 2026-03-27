#!/bin/bash
# Enhance RuleEditor to show matching transactions + re-categorise
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "=== RuleEditor enhancement ==="
echo "Lines before: $(wc -l < $FILE)"

# Step 1: Pass transactions to RuleEditor at callsite
RULEEDITOR_CALL=$(grep -n "<RuleEditor" "$FILE" | head -1 | cut -d: -f1)
echo "RuleEditor callsite at line $RULEEDITOR_CALL"
sed -i "${RULEEDITOR_CALL}s/<RuleEditor/<RuleEditor transactions={transactions}/" "$FILE"

# Step 2: Add transactions prop to RuleEditor function signature
RULEDEF=$(grep -n "^function RuleEditor({" "$FILE" | head -1 | cut -d: -f1)
echo "RuleEditor function at line $RULEDEF"
sed -i "${RULEDEF}s/^function RuleEditor({ rule, overheadGroups, onChange, onDelete })/function RuleEditor({ rule, overheadGroups, onChange, onDelete, transactions })/" "$FILE"

# Step 3: Add showTxns state and matching transactions logic right after the function opening brace
# Find the first useState inside RuleEditor
FIRST_STATE=$(awk -v s="$RULEDEF" 'NR>s && /const \[.*useState/ {print NR; exit}' "$FILE")
echo "First useState in RuleEditor at line $FIRST_STATE"
sed -i "${FIRST_STATE}i\\  const [showTxns, setShowTxns] = useState(false);\n  const matchingTxns = (transactions||[]).filter(tx => {\n    if (!rule.keywords) return false;\n    const desc = (tx.description||'').toLowerCase();\n    return rule.keywords.some(k => k && desc.includes(k.toLowerCase()));\n  });" "$FILE"

# Step 4: Find the footer div in RuleEditor (where created date is shown) and add the transactions panel after it
# The footer ends with the rule.keywords pills closing div
FOOTER_LINE=$(awk -v s="$RULEDEF" 'NR>s && /Created.*rule\.created/ {print NR; exit}' "$FILE")
echo "Footer line at $FOOTER_LINE"

# After the footer, add the transactions panel - insert before the closing </div> of the RuleEditor card
CLOSE_LINE=$((FOOTER_LINE + 4))
sed -i "${CLOSE_LINE}i\\      {matchingTxns.length > 0 && (\n        <div style={{borderTop:'1px solid #252830',padding:'4px 12px 8px'}}>\n          <button onClick={()=>setShowTxns(s=>!s)} style={{background:'none',border:'none',color:T.accent,fontSize:11,cursor:'pointer',fontFamily:'inherit',padding:'4px 0'}}>\n            {showTxns ? '▾' : '▸'} {matchingTxns.length} matching transaction{matchingTxns.length!==1?'s':''}\n          <\/button>\n          {showTxns && (\n            <div style={{display:'flex',flexDirection:'column',gap:3,marginTop:6,maxHeight:200,overflowY:'auto'}}>\n              {matchingTxns.map(tx=>(\n                <div key={tx.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:6,background:T.bg,border:'1px solid #252830'}}>\n                  <div style={{flex:1,minWidth:0}}>\n                    <div style={{fontSize:11,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}<\/div>\n                    <div style={{fontSize:10,color:T.textDim}}>{tx.date} &bull; current: <span style={{color:tx.category?T.green:T.textDim}}>{tx.category||'Uncategorised'}<\/span><\/div>\n                  <\/div>\n                  <span style={{fontSize:11,fontWeight:700,color:tx.isCredit?T.green:T.red,flexShrink:0}}>{tx.isCredit?\"+\":\"-\"}{parseFloat(tx.amount).toFixed(2)}<\/span>\n                <\/div>\n              ))}\n              {rule.category && (\n                <button onClick={()=>{onChange&&onChange({...rule,_applyNow:true});}} style={{marginTop:4,padding:'5px 10px',borderRadius:6,border:'none',background:T.accent,color:'#0E0E10',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>\n                  Apply \"{rule.category}\" to all {matchingTxns.filter(t=>!t.category||t.category!==rule.category).length} uncategorised\n                <\/button>\n              )}\n            <\/div>\n          )}\n        <\/div>\n      )}" "$FILE"

# Step 5: Handle _applyNow in the onChange handler in the callsite
ONCHANGE_LINE=$(grep -n "_applyNow\|applyNow" "$FILE" | head -1 | cut -d: -f1)
if [ -z "$ONCHANGE_LINE" ]; then
  # Add applyNow handler in the onChange block
  ONCHANGE_BLOCK=$(grep -n "onChange={updated => {" "$FILE" | head -1 | cut -d: -f1)
  echo "onChange block at line $ONCHANGE_BLOCK"
  sed -i "$((ONCHANGE_BLOCK+1))i\\                      if (updated._applyNow) { setTransactions(prev => prev.map(tx => { const desc=(tx.description||'').toLowerCase(); const matches=updated.keywords&&updated.keywords.some(k=>k&&desc.includes(k.toLowerCase())); if(matches&&!tx.manualCategory&&(!tx.category||tx.category===''))return{...tx,category:updated.category,nature:defaultNature(updated.category),manualCategory:true}; return tx; })); return; }" "$FILE"
fi

echo ""
echo "=== Verification ==="
echo "Lines after: $(wc -l < $FILE)"
echo "transactions prop:    $(grep -c 'transactions={transactions}' "$FILE")"
echo "matchingTxns:         $(grep -c 'matchingTxns' "$FILE")"
echo "showTxns state:       $(grep -c 'showTxns' "$FILE")"
echo ""
tail -5 "$FILE"
echo ""
echo "If counts >= 2, run:"
echo "  git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m 'RuleEditor: show matching transactions, apply rule to uncategorised' && git -C ~/Downloads/fintrack-ie push origin main"
