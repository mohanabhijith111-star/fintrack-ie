#!/bin/bash
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "Lines before: $(wc -l < $FILE)"

# Find insertion point - just before function DebtCard
DEBT_LINE=$(grep -n "^function DebtCard" "$FILE" | head -1 | cut -d: -f1)
echo "Inserting before line $DEBT_LINE"

# Insert all missing functions in reverse order (each inserts before DebtCard)
# 1. AddOverheadForm
sed -i "$((DEBT_LINE-1))a\\
function AddOverheadForm({ onAdd }) {\n\
  const allGroups = [...Object.keys(BUILTIN_OVERHEAD_GROUPS), 'Custom'];\n\
  const [form, setForm] = useState({ label: '', group: 'Other', nature: 'revenue', newGroup: '' });\n\
  function submit() {\n\
    if (!form.label.trim()) return;\n\
    const group = form.group === 'Custom' ? (form.newGroup.trim() || 'Custom') : form.group;\n\
    onAdd({ label: form.label.trim(), group, nature: form.nature });\n\
    setForm(p => ({ ...p, label: '', newGroup: '' }));\n\
  }\n\
  return (\n\
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>\n\
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>\n\
        <div style={{ gridColumn: 'span 2' }}><Input label='Category name' value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder='e.g. ESB Smart Meter' /></div>\n\
        <div><label style={S.label}>Group</label><select value={form.group} onChange={e=>setForm(p=>({...p,group:e.target.value}))} style={{...S.input,fontSize:11}}>{allGroups.map(g=><option key={g} value={g}>{g}<\/option>)}<\/select><\/div>\n\
        {form.group==='Custom'&&<Input label='New group name' value={form.newGroup} onChange={e=>setForm(p=>({...p,newGroup:e.target.value}))} placeholder='Group name' />}\n\
        <div><label style={S.label}>Nature<\/label><div style={{display:'flex',gap:4}}>{[{v:'revenue',l:'Revenue'},{v:'capital',l:'Capital'}].map(({v,l})=>(<button key={v} onClick={()=>setForm(p=>({...p,nature:v}))} style={{flex:1,padding:'7px 0',borderRadius:8,border:'1px solid '+(form.nature===v?T.accent:T.border),background:form.nature===v?T.accentDim+'40':'transparent',color:form.nature===v?T.accent:T.textMid,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{l}<\/button>))}<\/div><\/div>\n\
      <\/div>\n\
      <Btn onClick={submit}><Plus size={12}\/> Add Category<\/Btn>\n\
    <\/div>\n\
  );\n\
}\n" "$FILE"

# 2. ManualTxForm
DEBT_LINE=$(grep -n "^function AddOverheadForm" "$FILE" | head -1 | cut -d: -f1)
sed -i "$((DEBT_LINE-1))a\\
function ManualTxForm({ onAdd, overheadGroups, onNewCategory }) {\n\
  const OG = overheadGroups || BUILTIN_OVERHEAD_GROUPS;\n\
  const [form, setForm] = useState({ date: today(), description: '', amount: '', currency: 'EUR', isCredit: false, category: '', nature: 'revenue' });\n\
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));\n\
  function submit() {\n\
    if (!form.description || !form.amount) return;\n\
    onAdd({ ...form, amount: parseFloat(form.amount), isCredit: form.isCredit === true || form.isCredit === 'true' });\n\
    setForm(p => ({ ...p, description: '', amount: '', category: '', nature: 'revenue' }));\n\
  }\n\
  return (\n\
    <div>\n\
      <div className='hn' style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: T.textMid, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add Transaction Manually<\/div>\n\
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 8 }}>\n\
        <Input label='Date' type='date' value={form.date} onChange={set('date')} \/>\n\
        <div style={{ gridColumn: 'span 2' }}><Input label='Description' value={form.description} onChange={set('description')} placeholder='e.g. Lidl weekly shop' \/><\/div>\n\
        <Input label='Amount' type='number' value={form.amount} onChange={set('amount')} placeholder='0.00' \/>\n\
        <Select label='Currency' value={form.currency} onChange={set('currency')}>{CURRENCIES.map(c=><option key={c}>{c}<\/option>)}<\/Select>\n\
        <div><label style={S.label}>Type<\/label><div style={{display:'flex',gap:5}}>{[{v:false,l:'Expense'},{v:true,l:'Income'}].map(({v,l})=>(<button key={l} onClick={()=>setForm(p=>({...p,isCredit:v}))} style={{flex:1,padding:'7px 0',borderRadius:8,border:'1px solid '+(form.isCredit===v?(v?T.green:T.red):T.border),background:form.isCredit===v?(v?T.greenDim:T.redDim):'transparent',color:form.isCredit===v?(v?T.green:T.red):T.textMid,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:form.isCredit===v?700:400}}>{l}<\/button>))}<\/div><\/div>\n\
        <div><label style={S.label}>Nature<\/label><div style={{display:'flex',gap:5}}>{[{v:'revenue',l:'Revenue'},{v:'capital',l:'Capital'}].map(({v,l})=>(<button key={v} onClick={()=>setForm(p=>({...p,nature:v}))} style={{flex:1,padding:'7px 0',borderRadius:8,border:'1px solid '+(form.nature===v?T.accent:T.border),background:form.nature===v?T.accentDim+'40':'transparent',color:form.nature===v?T.accent:T.textMid,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:form.nature===v?700:400}}>{l}<\/button>))}<\/div><\/div>\n\
        <div style={{gridColumn:'span 2'}}><label style={S.label}>Category<\/label><CategoryCombo value={form.category} overheadGroups={OG} onNewCategory={label=>{if(onNewCategory)onNewCategory(label);}} onChange={cat=>{setForm(p=>({...p,category:cat,nature:defaultNature(cat)}));}} placeholder='Type or select category...' style={{fontSize:12}}\/><\/div>\n\
      <\/div>\n\
      <Btn onClick={submit} style={{marginTop:2}}><Plus size={12}\/> Add Transaction<\/Btn>\n\
    <\/div>\n\
  );\n\
}\n" "$FILE"

# 3. TxRow - restore from backup (uses useRef so needs full function)
DEBT_LINE=$(grep -n "^function ManualTxForm" "$FILE" | head -1 | cut -d: -f1)
sed -i "$((DEBT_LINE-1))a\\
function TxRow({ tx, onCategory, onDelete, onNature, onNewCategory, overheadGroups, debts, onAllocateDebt, onCommit, committed, onSplit, onCreateRule }) {\n\
  const alreadyCommitted = committed?.some(c => c.name.toLowerCase().trim() === tx.description.toLowerCase().trim());\n\
  const OG = overheadGroups || BUILTIN_OVERHEAD_GROUPS;\n\
  const nature = tx.nature || defaultNature(tx.category);\n\
  const [allocating, setAllocating] = useState(false);\n\
  const [selectedDebt, setSelectedDebt] = useState('');\n\
  const [committing, setCommitting] = useState(false);\n\
  const [commitRec, setCommitRec] = useState('monthly');\n\
  const [commitAmt, setCommitAmt] = useState(tx.amount ? parseFloat(tx.amount).toFixed(2) : '');\n\
  function applyAllocation() {\n\
    if (!selectedDebt) return;\n\
    onAllocateDebt && onAllocateDebt(selectedDebt, tx.amount);\n\
    setAllocating(false);\n\
  }\n\
  return (\n\
    <div className='row-hover' style={{ borderBottom: '1px solid #252830', padding: '10px 14px' }}>\n\
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>\n\
        <span style={{ fontSize: 10, color: T.textDim, flexShrink: 0, width: 80 }}>{dateStr(tx.date)}<\/span>\n\
        <span style={{ fontSize: 13, color: T.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || <span style={{color:T.textDim,fontStyle:'italic'}}>No description<\/span>}<\/span>\n\
        <button onClick={()=>onNature&&onNature(nature==='revenue'?'capital':nature==='capital'?'balance_sheet':'revenue')} title='Revenue \/ Capital \/ Balance Sheet' style={{background:nature==='capital'?T.purpleDim:nature==='balance_sheet'?T.blueDim:T.surfaceHigh,color:nature==='capital'?T.purple:nature==='balance_sheet'?T.blue:T.textDim,border:'1px solid '+(nature==='capital'?T.purple+'50':nature==='balance_sheet'?T.blue+'50':T.border),borderRadius:5,padding:'1px 6px',fontSize:10,cursor:'pointer',fontFamily:'inherit',flexShrink:0,fontWeight:600}}>{nature==='capital'?'CAP':nature==='balance_sheet'?'B\/S':'REV'}<\/button>\n\
        <span style={{ fontSize: 13, fontWeight: 700, color: tx.isCredit ? T.green : T.red, flexShrink: 0 }}>{tx.isCredit?'+':'-'}{fmt(tx.amount, tx.currency)}<\/span>\n\
      <\/div>\n\
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>\n\
        {tx.debtAllocated && <Badge color='purple'>Debt<\/Badge>}\n\
        {tx.aiSuggested && <Badge color='blue'>AI<\/Badge>}\n\
        {tx.isPAYE && <Badge color='green'>PAYE<\/Badge>}\n\
        {!tx.isCredit && debts && debts.length > 0 && !allocating && <button onClick={()=>{setAllocating(true);setSelectedDebt(debts[0]?.id||'');}} title='Allocate this payment toward a debt' style={{background:tx.debtAllocated?T.purpleDim:T.surfaceHigh,color:tx.debtAllocated?T.purple:T.textDim,border:'1px solid '+(tx.debtAllocated?T.purple+'50':T.border),borderRadius:5,padding:'2px 7px',fontSize:10,cursor:'pointer',fontFamily:'inherit',flexShrink:0,whiteSpace:'nowrap'}}>{tx.debtAllocated?'Reallocate':'- Debt'}<\/button>}\n\
        {!tx.isCredit && onCommit && !committing && <button onClick={()=>setCommitting(true)} title='Commit as a recurring expense' style={{background:alreadyCommitted?T.accentDim+'30':T.surfaceHigh,color:alreadyCommitted?T.accent:T.textDim,border:'1px solid '+(alreadyCommitted?T.accent+'50':T.border),borderRadius:5,padding:'2px 7px',fontSize:10,cursor:'pointer',fontFamily:'inherit',flexShrink:0,whiteSpace:'nowrap'}}>{alreadyCommitted?'- Committed':'- Commit'}<\/button>}\n\
        {!tx.isCredit && onSplit && !tx.splits && <button onClick={()=>onSplit(tx)} style={{background:'#1E2028',color:'#8B8DA0',border:'1px solid #252830',borderRadius:5,padding:'2px 7px',fontSize:10,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>Split<\/button>}\n\
        {tx.splits && <span style={{background:'rgba(74,143,212,0.09)',color:'#4A8FD4',border:'1px solid rgba(74,143,212,0.25)',borderRadius:5,padding:'2px 6px',fontSize:10,fontWeight:600}}>Split<\/span>}\n\
        {tx.category && onCreateRule && <button onClick={()=>onCreateRule(tx)} title='Save as auto-categorisation rule for future imports' style={{background:'rgba(240,160,60,0.1)',color:'#F0A03C',border:'1px solid rgba(240,160,60,0.3)',borderRadius:5,padding:'2px 6px',fontSize:9,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>+ Rule<\/button>}\n\
        <button onClick={onDelete} style={{background:'none',border:'none',color:T.textDim,cursor:'pointer',padding:'2px 4px',flexShrink:0}}><X size={12}\/><\/button>\n\
      <\/div>\n\
      <div style={{ marginTop: 6 }}>\n\
        <CategoryCombo value={tx.category||''} overheadGroups={OG} onChange={cat=>onCategory&&onCategory(cat)} onNewCategory={label=>onNewCategory&&onNewCategory(label)} placeholder='Type or select category...' style={{fontSize:12}}\/>\n\
      <\/div>\n\
      {allocating && debts && (\n\
        <div style={{marginTop:6,display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>\n\
          <select value={selectedDebt} onChange={e=>setSelectedDebt(e.target.value)} style={{...S.input,fontSize:11,padding:'4px 8px',flex:1}}>{debts.map(d=>(<option key={d.id} value={d.id}>{d.name} ({fmt(d.balance,d.currency)})<\/option>))}<\/select>\n\
          <button onClick={applyAllocation} style={{background:T.purple,color:'#fff',border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Allocate<\/button>\n\
          <button onClick={()=>setAllocating(false)} style={{background:T.surfaceHigh,color:T.textMid,border:'1px solid '+T.border,borderRadius:6,padding:'5px 10px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Cancel<\/button>\n\
        <\/div>\n\
      )}\n\
      {committing && (\n\
        <div style={{marginTop:6,display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>\n\
          <input type='number' value={commitAmt} onChange={e=>setCommitAmt(e.target.value)} style={{...S.input,fontSize:11,padding:'4px 8px',width:90}} placeholder='Amount'/>\n\
          <select value={commitRec} onChange={e=>setCommitRec(e.target.value)} style={{...S.input,fontSize:11,padding:'4px 8px'}}><option value='monthly'>Monthly<\/option><option value='fortnightly'>Fortnightly<\/option><option value='weekly'>Weekly<\/option><option value='annual'>Annual<\/option><\/select>\n\
          <button onClick={()=>{onCommit&&onCommit({id:Date.now().toString(),name:tx.description,amount:commitAmt,recurrence:commitRec,currency:tx.currency||'EUR',category:tx.category||''});setCommitting(false);}} style={{background:T.accent,color:'#0E0E10',border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>Save<\/button>\n\
          <button onClick={()=>setCommitting(false)} style={{background:T.surfaceHigh,color:T.textMid,border:'1px solid '+T.border,borderRadius:6,padding:'5px 10px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Cancel<\/button>\n\
        <\/div>\n\
      )}\n\
    <\/div>\n\
  );\n\
}\n" "$FILE"

echo "Done"
echo "Lines after: $(wc -l < $FILE)"
echo "Functions restored:"
grep -n "^function TxRow\|^function ManualTxForm\|^function AddOverheadForm\|^function DebtCard\|^function RuleEditor" "$FILE"
