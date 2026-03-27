#!/bin/bash
# FinTrack IE - Patch v6
# Bulk-apply selection modal for category rules + debt only from ticked transactions
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "=== FinTrack patch v6 ==="
echo "Lines before: $(wc -l < $FILE)"

# ── FIX 1: Add categoryPrompt state ─────────────────────────────────────────────
LOANLINE=$(grep -n "const \[loanPrompt, setLoanPrompt\]" "$FILE" | head -1 | cut -d: -f1)
echo "loanPrompt state at line $LOANLINE"
sed -i "${LOANLINE}a\\  const [categoryPrompt, setCategoryPrompt] = useState(null);" "$FILE"
echo "Fix 1 done"

# ── FIX 2: Replace updateTxCategory ─────────────────────────────────────────────
FNSTART=$(grep -n "function updateTxCategory(id, category" "$FILE" | head -1 | cut -d: -f1)
FNENDLINE=$(awk -v s="$FNSTART" 'NR>=s && /^  \}$/ {print NR; exit}' "$FILE")
echo "Replacing updateTxCategory lines $FNSTART-$FNENDLINE"
sed -i "${FNSTART},${FNENDLINE}d" "$FILE"
sed -i "$((FNSTART-1))a\\  function updateTxCategory(id, category) {\n    const nature = defaultNature(category);\n    const tx = transactions.find(t => t.id === id);\n    if (!tx) return;\n    const kw = (() => { const k = tx.description.split(' ').slice(0,3).join(' ').toLowerCase().trim(); return k.length > 2 ? k : null; })();\n    const matches = kw ? transactions.filter(t => t.id !== id && !t.isCredit && t.description.toLowerCase().includes(kw) && !t.ruleExcluded) : [];\n    setTransactions(prev => prev.map(t => t.id === id ? {...t, category, nature} : t));\n    if (kw) { setRules(prev => { const ex=prev.findIndex(r=>r.keywords.some(k=>k===kw)); if(ex>=0){const n=[...prev];n[ex]={...n[ex],category};return n;} return [...prev,{id:Date.now().toString(),keywords:[kw],category,created:today()}]; }); }\n    if (matches.length > 0) { setCategoryPrompt({id, category, nature, kw, matches: matches.map(t=>({tx:t,checked:true}))}); return; }\n    if (LOAN_RECEIVED_CATS.has(category)||LOAN_REPAYMENT_CATS.has(category)) { setLoanPrompt({tx:{...tx,category,nature},type:LOAN_RECEIVED_CATS.has(category)?'received':'repayment',count:1}); }\n  }" "$FILE"
echo "Fix 2 done"

# ── FIX 3: Add CategoryPromptModal component before SplitTransactionModal ────────
SPLITMODALLINE=$(grep -n "^function SplitTransactionModal" "$FILE" | head -1 | cut -d: -f1)
echo "Inserting CategoryPromptModal before line $SPLITMODALLINE"
sed -i "$((SPLITMODALLINE-1))a\\function CategoryPromptModal({ prompt, onConfirm, onDismiss }) {\n  const [items, setItems] = React.useState(prompt.matches);\n  const toggle = id => setItems(prev=>prev.map(m=>m.tx.id===id?{...m,checked:!m.checked}:m));\n  const allChecked = items.every(m=>m.checked);\n  const toggleAll = () => setItems(prev=>prev.map(m=>({...m,checked:!allChecked})));\n  const checkedCount = items.filter(m=>m.checked).length;\n  return (\n    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onDismiss}>\n      <div style={{background:T.surface,border:'1px solid #252830',borderRadius:12,padding:20,maxWidth:500,width:'100%',maxHeight:'80vh',display:'flex',flexDirection:'column',gap:12}} onClick={e=>e.stopPropagation()}>\n        <div style={{fontSize:15,fontWeight:700,color:T.text}}>Apply to matching transactions?<\/div>\n        <div style={{fontSize:12,color:T.textDim}}>{items.length} other transactions match this description. Select which ones should also get <span style={{color:T.accent,fontWeight:600}}>{prompt.category}<\/span>:<\/div>\n        <div style={{display:'flex',alignItems:'center',gap:8,paddingBottom:8,borderBottom:'1px solid #252830'}}>\n          <input type='checkbox' checked={allChecked} onChange={toggleAll} style={{accentColor:T.accent}} \/>\n          <span style={{fontSize:11,color:T.textDim,cursor:'pointer'}} onClick={toggleAll}>Select all ({items.length})<\/span>\n        <\/div>\n        <div style={{overflowY:'auto',display:'flex',flexDirection:'column',gap:4,maxHeight:280}}>\n          {items.map(({tx,checked})=>(\n            <div key={tx.id} onClick={()=>toggle(tx.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,background:checked?'rgba(240,160,60,0.06)':T.bg,border:'1px solid '+(checked?'rgba(240,160,60,0.25)':'#252830'),cursor:'pointer'}}>\n              <input type='checkbox' checked={checked} onChange={()=>toggle(tx.id)} onClick={e=>e.stopPropagation()} style={{accentColor:T.accent,flexShrink:0}} \/>\n              <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}<\/div><div style={{fontSize:10,color:T.textDim}}>{tx.date} &bull; was: {tx.category||'Uncategorised'}<\/div><\/div>\n              <span style={{fontSize:12,fontWeight:700,color:T.red,flexShrink:0}}>-{fmt(tx.amount,tx.currency)}<\/span>\n            <\/div>\n          ))}\n        <\/div>\n        <div style={{display:'flex',gap:8,paddingTop:8,borderTop:'1px solid #252830'}}>\n          <button onClick={()=>onConfirm(items.filter(m=>m.checked).map(m=>m.tx),prompt)} style={{flex:1,padding:'9px 0',borderRadius:8,border:'none',background:T.accent,color:'#0E0E10',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Apply to {checkedCount} selected<\/button>\n          <button onClick={onDismiss} style={{padding:'9px 16px',borderRadius:8,border:'1px solid #252830',background:'none',color:T.textDim,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Skip<\/button>\n        <\/div>\n      <\/div>\n    <\/div>\n  );\n}" "$FILE"
echo "Fix 3 done"

# ── FIX 4: Render CategoryPromptModal in App ─────────────────────────────────────
LOANMODALLINE=$(grep -n "{loanPrompt && (" "$FILE" | head -1 | cut -d: -f1)
echo "loanPrompt modal at line $LOANMODALLINE - inserting before"
sed -i "$((LOANMODALLINE-1))a\\      {categoryPrompt && (\n        <CategoryPromptModal\n          prompt={categoryPrompt}\n          onDismiss={()=>setCategoryPrompt(null)}\n          onConfirm={(selectedTxs, p) => {\n            setTransactions(prev => prev.map(t => selectedTxs.find(s=>s.id===t.id) ? {...t,category:p.category,nature:p.nature} : t));\n            setCategoryPrompt(null);\n            if (LOAN_RECEIVED_CATS.has(p.category)||LOAN_REPAYMENT_CATS.has(p.category)) {\n              const anchor = transactions.find(t=>t.id===p.id);\n              const total = selectedTxs.reduce((s,t)=>s+(parseFloat(t.amount)||0),0) + (parseFloat(anchor?.amount)||0);\n              if (anchor) setLoanPrompt({tx:{...anchor,amount:total,category:p.category,nature:p.nature},type:LOAN_RECEIVED_CATS.has(p.category)?'received':'repayment',count:selectedTxs.length+1});\n            }\n          }}\n        \/>\n      )}" "$FILE"
echo "Fix 4 done"

# ── FIX 5: Remove old "this only" button if present ─────────────────────────────
sed -i '/tx\.ruleMatched && onOverride/d' "$FILE"
sed -i 's/, onOverride })/  })/' "$FILE"
sed -i '/onOverride={txId => setTransactions/d' "$FILE"
echo "Fix 5 done"

# ── VERIFY ───────────────────────────────────────────────────────────────────────
echo ""
echo "=== Verification ==="
echo "Lines after: $(wc -l < $FILE)"
echo "categoryPrompt state:  $(grep -c 'categoryPrompt, setCategoryPrompt' "$FILE")"
echo "CategoryPromptModal:   $(grep -c 'function CategoryPromptModal' "$FILE")"
echo "Modal render:          $(grep -c 'categoryPrompt &&' "$FILE")"
echo "Debt uses selectedTxs: $(grep -c 'selectedTxs.reduce' "$FILE")"
echo "this-only removed:     $(grep -c 'this only' "$FILE") (must be 0)"
echo ""
tail -5 "$FILE"
echo ""
echo "If all counts >= 1, run:"
echo "  git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m 'Bulk-apply modal with checkbox selection, debt uses ticked txns only' && git -C ~/Downloads/fintrack-ie push origin main"
