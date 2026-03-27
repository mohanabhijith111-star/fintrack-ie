#!/bin/bash
# Replace ONLY the RuleEditor footer section cleanly - no insertions
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "Lines before: $(wc -l < $FILE)"

# Find exact line range
FOOTER_START=$(grep -n "Footer: saved message or keyword pills" "$FILE" | head -1 | cut -d: -f1)
OUTER_CLOSE=$(grep -n "^    </div>" "$FILE" | awk -F: -v s="$FOOTER_START" '$1>s{print $1; exit}')
echo "Footer: $FOOTER_START to $OUTER_CLOSE"

# Show current content to confirm
sed -n "${FOOTER_START},${OUTER_CLOSE}p" "$FILE"
echo "---"

# Delete the entire footer section
sed -i "${FOOTER_START},${OUTER_CLOSE}d" "$FILE"

# Insert clean replacement at FOOTER_START-1
sed -i "$((FOOTER_START-1))a\\      {/* Footer: saved message or keyword pills */}\n      {savedMsg ? (\n        <div style={{ padding: \"4px 12px 8px\", fontSize: 11, color: T.green }}>{savedMsg}<\/div>\n      ) : (!dirty && rule.keywords && rule.keywords.filter(k => k).length > 0 && (\n        <div style={{ padding: \"4px 12px 8px\", fontSize: 11, color: T.textDim }}>\n          Created {rule.created} &middot; {rule.keywords.filter(k => k).map(k => (\n            <span key={k} style={{ background: T.bg, border: \"1px solid #252830\", borderRadius: 4, padding: \"1px 6px\", marginRight: 4, color: T.textMid }}>{k}<\/span>\n          ))}\n        <\/div>\n      ))}\n      {matchingTxns.length > 0 && (\n        <div style={{borderTop:'1px solid #252830',padding:'4px 12px 8px'}}>\n          <button onClick={()=>setShowTxns(s=>!s)} style={{background:'none',border:'none',color:T.accent,fontSize:11,cursor:'pointer',fontFamily:'inherit',padding:'4px 0'}}>\n            {showTxns ? String.fromCharCode(9662) : String.fromCharCode(9656)} {matchingTxns.length} matching transaction{matchingTxns.length!==1?'s':''}\n          <\/button>\n          {showTxns && (\n            <div style={{display:'flex',flexDirection:'column',gap:3,marginTop:6,maxHeight:200,overflowY:'auto'}}>\n              {matchingTxns.map(tx=>(\n                <div key={tx.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:6,background:T.bg,border:'1px solid #252830'}}>\n                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}<\/div><div style={{fontSize:10,color:T.textDim}}>{tx.date} - <span style={{color:tx.category?T.green:T.textDim}}>{tx.category||'Uncategorised'}<\/span><\/div><\/div>\n                  <span style={{fontSize:11,fontWeight:700,color:tx.isCredit?T.green:T.red,flexShrink:0}}>{tx.isCredit?'+':'-'}{parseFloat(tx.amount||0).toFixed(2)}<\/span>\n                <\/div>\n              ))}\n              {rule.category && matchingTxns.some(t=>!t.category) && (\n                <button onClick={()=>onChange&&onChange({...rule,_applyNow:true})} style={{marginTop:4,padding:'5px 10px',borderRadius:6,border:'none',background:T.accent,color:'#0E0E10',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>\n                  Apply rule to uncategorised\n                <\/button>\n              )}\n            <\/div>\n          )}\n        <\/div>\n      )}\n    <\/div>\n  );\n}" "$FILE"

echo ""
echo "=== Verification ==="
echo "Lines after: $(wc -l < $FILE)"
echo "matchingTxns: $(grep -c 'matchingTxns' "$FILE")"
echo "showTxns:     $(grep -c 'showTxns' "$FILE")"
echo ""
echo "Check footer structure:"
NEWFOOTER=$(grep -n "Footer: saved message or keyword pills" "$FILE" | head -1 | cut -d: -f1)
sed -n "${NEWFOOTER},$((NEWFOOTER+35))p" "$FILE"
