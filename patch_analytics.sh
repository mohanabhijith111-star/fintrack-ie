#!/bin/bash
# Fix Analytics Categories tab: layout, date column, uncategorised row
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "Lines before: $(wc -l < $FILE)"

# Find the transaction row in the drill-down (line 4072 area)
TX_ROW=$(grep -n "txs.sort.*localeCompare.*slice.*map.*tx =>" "$FILE" | head -1 | cut -d: -f1)
echo "Transaction row at line $TX_ROW"

# Find the end of the .map block - the closing ))} after the +N more line
MORE_LINE=$(awk -v s="$TX_ROW" 'NR>s && /txs.length > 8/ {print NR; exit}' "$FILE")
echo "More line at $MORE_LINE"

# Replace lines TX_ROW through MORE_LINE+1 with fixed version
sed -i "${TX_ROW},$((MORE_LINE+1))d" "$FILE"

sed -i "$((TX_ROW-1))a\\                      {txs.sort((a,b)=>b.date?.localeCompare(a.date)).slice(0,12).map(tx=>(\n                        <div key={tx.id} style={{display:'flex',alignItems:'center',gap:10,padding:'5px 0',borderBottom:'1px solid #252830'}}>\n                          <span style={{fontSize:10,color:T.textDim,flexShrink:0,width:72}}>{tx.date?new Date(tx.date+'T12:00:00').toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'2-digit'}):''}<\/span>\n                          <span style={{fontSize:12,color:T.text,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}<\/span>\n                          <span style={{fontSize:13,fontWeight:600,color:tx.isCredit?T.green:T.red,flexShrink:0}}>{tx.isCredit?'+':'-'}{fmt(tx.amount,tx.currency||'EUR')}<\/span>\n                        <\/div>\n                      ))}\n                      {txs.length > 12 && <div style={{fontSize:11,color:T.textDim,marginTop:6}}>+{txs.length-12} more transactions<\/div>}" "$FILE"

echo "Fix 1 done: transaction row layout + date column"

# Now add Uncategorised row after the allCategories.map closes
# Find the closing of allCategories.map - look for the line after the map closes
MAP_CLOSE=$(grep -n "allCategories.map" "$FILE" | head -1 | cut -d: -f1)
echo "allCategories.map starts at $MAP_CLOSE"

# Find the closing of the map - it ends with );  after the last category item
# Look for the line with just "            );" that comes after the map
MAP_END=$(awk -v s="$MAP_CLOSE" 'NR>s+20 && /^\s+\)\;$/ {print NR; exit}' "$FILE")
echo "Map closes at line $MAP_END"
echo "Content: $(sed -n "${MAP_END}p" "$FILE")"

# Get uncategorised data from the same transactions prop
# Insert uncategorised row after map closes
UNCAT_LINE=$((MAP_END))
sed -i "${UNCAT_LINE}a\\            {(() => { const uncat = transactions.filter(t=>!t.isCredit&&!t.category); if(!uncat.length) return null; const total=uncat.reduce((s,t)=>s+(parseFloat(t.amount)||0),0); const isSel=selectedCat==='__uncat__'; return (<div key=\"__uncat__\"><div className=\"row-hover\" onClick={()=>setSelectedCat(isSel?null:'__uncat__')} style={{padding:'12px 20px',borderBottom:'1px solid #252830',cursor:'pointer',background:isSel?T.accent+'08':'transparent',opacity:0.7}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}><div><span style={{fontSize:13,fontWeight:600,color:T.textDim}}>Uncategorised<\/span><span style={{fontSize:11,color:T.textDim,marginLeft:8}}>{uncat.length} transactions<\/span><\/div><div style={{textAlign:'right'}}><div style={{fontSize:14,fontWeight:700,color:T.textDim}}>{fmt(total)}<\/div><div style={{fontSize:10,color:T.textDim}}>not yet categorised<\/div><\/div><\/div><div style={{height:4,background:T.border,borderRadius:2}}><div style={{height:'100%',width:'100%',background:'#3a3a4a',borderRadius:2}}\/><\/div><\/div>{isSel&&(<div style={{background:T.surfaceHigh,padding:'12px 20px',borderBottom:'1px solid #252830'}}><div style={{fontSize:11,color:T.textDim,marginBottom:8,fontWeight:600}}>UNCATEGORISED TRANSACTIONS<\/div>{uncat.sort((a,b)=>b.date?.localeCompare(a.date)).slice(0,12).map(tx=>(<div key={tx.id} style={{display:'flex',alignItems:'center',gap:10,padding:'5px 0',borderBottom:'1px solid #252830'}}><span style={{fontSize:10,color:T.textDim,flexShrink:0,width:72}}>{tx.date?new Date(tx.date+'T12:00:00').toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'2-digit'}):''}<\/span><span style={{fontSize:12,color:T.text,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}<\/span><span style={{fontSize:13,fontWeight:600,color:T.red,flexShrink:0}}>-{fmt(tx.amount,tx.currency||'EUR')}<\/span><\/div>))}{uncat.length>12&&<div style={{fontSize:11,color:T.textDim,marginTop:6}}>+{uncat.length-12} more<\/div>}<\/div>)}<\/div>); })()}" "$FILE"

echo "Fix 2 done: uncategorised row added"

echo ""
echo "=== Verification ==="
echo "Lines after: $(wc -l < $FILE)"
echo "Uncategorised row: $(grep -c '__uncat__' "$FILE")"
echo "Date column:       $(grep -c 'en-IE.*day.*numeric.*month.*short' "$FILE")"
echo ""
tail -5 "$FILE"
echo ""
echo "If counts >= 1, run:"
echo "  git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m 'Analytics: date column, fix layout, add uncategorised row' && git -C ~/Downloads/fintrack-ie push origin main"
