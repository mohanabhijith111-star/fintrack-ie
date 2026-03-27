#!/bin/bash
# RuleEditor enhancement v2 - written as complete replacement, no fragile sed insertions
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "=== RuleEditor v2 patch ==="
echo "Lines before: $(wc -l < $FILE)"

# Step 1: Pass transactions to RuleEditor callsite
CALL=$(grep -n "transactions={transactions}" "$FILE" | grep -v "onCategory\|onCommit\|onAllocate\|onDelete\|props\|TxRow" | head -1 | cut -d: -f1)
if [ -z "$CALL" ]; then
  CALL=$(grep -n "<RuleEditor" "$FILE" | head -1 | cut -d: -f1)
  sed -i "${CALL}s/<RuleEditor/<RuleEditor transactions={transactions}/" "$FILE"
  echo "Added transactions prop at line $CALL"
else
  echo "transactions prop already exists"
fi

# Step 2: Add transactions to RuleEditor function signature
RULEDEF=$(grep -n "^function RuleEditor({" "$FILE" | head -1 | cut -d: -f1)
echo "RuleEditor at line $RULEDEF"
sed -i "${RULEDEF}s/{ rule, overheadGroups, onChange, onDelete }/{ rule, overheadGroups, onChange, onDelete, transactions }/" "$FILE"

# Step 3: Add useState and matchingTxns right after function opening - find first const in RuleEditor
FIRST_CONST=$(awk -v s="$RULEDEF" 'NR>s && NR<s+5 && /const \[/ {print NR; exit}' "$FILE")
echo "First const in RuleEditor at line $FIRST_CONST"
sed -i "${FIRST_CONST}i\\  const [showTxns, setShowTxns] = useState(false);\n  const matchingTxns = (transactions||[]).filter(tx => rule.keywords && rule.keywords.some(k => k && (tx.description||'').toLowerCase().includes(k.toLowerCase())));" "$FILE"

# Step 4: Find the EXACT closing line of the ternary footer
# The footer ternary looks like: {savedMsg ? (...) : (!dirty && ... && (...))}
# It ends with:   ))}  (on its own line)
# Find it by looking for the line that just has spaces+))} after the RuleEditor definition
TERNARY_CLOSE=$(awk -v s="$RULEDEF" 'NR>s+10 && /^\s+\)\)\}$/ {print NR; exit}' "$FILE")
echo "Ternary close at line $TERNARY_CLOSE"
# Verify
echo "Line $TERNARY_CLOSE content: $(sed -n "${TERNARY_CLOSE}p" "$FILE")"

# Step 5: Insert matching transactions panel AFTER the ternary close
sed -i "${TERNARY_CLOSE}a\\      {matchingTxns.length > 0 && (\n        <div style={{borderTop:'1px solid #252830',padding:'4px 12px 8px'}}>\n          <button onClick={()=>setShowTxns(s=>!s)} style={{background:'none',border:'none',color:T.accent,fontSize:11,cursor:'pointer',fontFamily:'inherit',padding:'4px 0'}}>\n            {showTxns ? String.fromCharCode(9662) : String.fromCharCode(9656)} {matchingTxns.length} matching transaction{matchingTxns.length!==1?'s':''}\n          <\/button>\n          {showTxns && (\n            <div style={{display:'flex',flexDirection:'column',gap:3,marginTop:6,maxHeight:200,overflowY:'auto'}}>\n              {matchingTxns.map(tx=>(\n                <div key={tx.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:6,background:T.bg,border:'1px solid #252830'}}>\n                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}<\/div><div style={{fontSize:10,color:T.textDim}}>{tx.date} - <span style={{color:tx.category?T.green:T.textDim}}>{tx.category||'Uncategorised'}<\/span><\/div><\/div>\n                  <span style={{fontSize:11,fontWeight:700,color:tx.isCredit?T.green:T.red,flexShrink:0}}>{tx.isCredit?'+':'-'}{parseFloat(tx.amount||0).toFixed(2)}<\/span>\n                <\/div>\n              ))}\n              {rule.category && matchingTxns.some(t=>!t.category||t.category!==rule.category) && (\n                <button onClick={()=>onChange&&onChange({...rule,_applyNow:true})} style={{marginTop:4,padding:'5px 10px',borderRadius:6,border:'none',background:T.accent,color:'#0E0E10',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>\n                  Apply rule to uncategorised matches\n                <\/button>\n              )}\n            <\/div>\n          )}\n        <\/div>\n      )}" "$FILE"

echo "Fix done: matching transactions panel added"

# Step 6: Handle _applyNow in onChange handler
ONCHANGE=$(grep -n "onChange={updated => {" "$FILE" | head -1 | cut -d: -f1)
echo "onChange handler at line $ONCHANGE"
sed -i "$((ONCHANGE+1))i\\                      if (updated._applyNow) { const {_applyNow,...rule}=updated; setTransactions(prev=>prev.map(tx=>{const desc=(tx.description||'').toLowerCase();const matches=rule.keywords&&rule.keywords.some(k=>k&&desc.includes(k.toLowerCase()));return(matches&&!tx.manualCategory&&!tx.category)?{...tx,category:rule.category}:tx;})); return; }" "$FILE"

echo ""
echo "=== Verification ==="
echo "Lines after: $(wc -l < $FILE)"
echo "transactions prop:  $(grep -c 'transactions={transactions}' "$FILE")"
echo "matchingTxns:       $(grep -c 'matchingTxns' "$FILE")"
echo "showTxns:           $(grep -c 'showTxns' "$FILE")"
echo "_applyNow:          $(grep -c '_applyNow' "$FILE")"
echo ""
tail -5 "$FILE"
echo ""
echo "If matchingTxns >= 3, run:"
echo "  git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m 'RuleEditor v2: show matching transactions, apply to uncategorised' && git -C ~/Downloads/fintrack-ie push origin main"
