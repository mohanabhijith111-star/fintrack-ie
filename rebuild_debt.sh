#!/bin/bash
# FinTrack IE - Debt Module Rebuild
# Replaces DebtCard (lines 2366-3115) with clean loan-statement style component
# Also updates debt creation form and addDebt handler
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "=== Debt Module Rebuild ==="
echo "Lines before: $(wc -l < $FILE)"

DEBT_START=$(grep -n "^function DebtCard" "$FILE" | head -1 | cut -d: -f1)
LOAN_MODAL=$(grep -n "^function LoanPromptModal" "$FILE" | head -1 | cut -d: -f1)
echo "Replacing lines $DEBT_START to $((LOAN_MODAL-1)) ($((LOAN_MODAL-DEBT_START)) lines)"

# Delete old DebtCard
sed -i "${DEBT_START},$((LOAN_MODAL-1))d" "$FILE"

# Insert new DebtCard at DEBT_START-1
sed -i "$((DEBT_START-1))a\\
function DebtCard({ debt, onChange, onDelete, transactions }) {\n\
  const [editing, setEditing] = useState(false);\n\
  const [showHistory, setShowHistory] = useState(true);\n\
  const [form, setForm] = useState({\n\
    name: debt.name||'', type: debt.type||'loan',\n\
    total: debt.total||debt.balance||'',\n\
    balance: debt.balance||'', balanceAsOf: debt.balanceAsOf||today(),\n\
    currency: debt.currency||'EUR', rate: debt.rate||'',\n\
    termMonths: debt.termMonths||'', knownPayment: debt.knownPayment||'',\n\
    dueDate: debt.dueDate||'', originationDate: debt.originationDate||'',\n\
    paymentFrequency: debt.paymentFrequency||'monthly',\n\
  });\n\
  // Sync when debt changes externally\n\
  const prevBal = useRef(debt.balance);\n\
  if (prevBal.current !== debt.balance) { prevBal.current=debt.balance; if(!editing) setForm(f=>({...f,balance:debt.balance,balanceAsOf:today()})); }\n\
\n\
  const balance = parseFloat(debt.balance)||0;\n\
  const original = parseFloat(debt.total||debt.balance)||balance;\n\
  const rate = parseFloat(debt.rate)||0;\n\
  const term = parseInt(debt.termMonths)||0;\n\
  const freq = debt.paymentFrequency||'monthly';\n\
  const knownPmt = parseFloat(debt.knownPayment)||0;\n\
  const monthlyPayment = knownPmt || calcPMT(balance, rate, term, freq) || 0;\n\
  const payoffMonths = calcPayoffMonths(balance, rate, monthlyPayment, freq);\n\
  const payoffDate = payoffMonths ? new Date(Date.now()+payoffMonths*30.44*86400000).toLocaleDateString('en-IE',{month:'short',year:'numeric'}) : null;\n\
  const pct = original>0 ? Math.min(100,((original-balance)/original)*100) : 0;\n\
  const periodicRate = rate/100/(({monthly:12,fortnightly:26,weekly:52})[freq]||12);\n\
\n\
  // Collect payments from transactions by description match + manual history\n\
  const kw = (debt.name||'').toLowerCase().split(' ').filter(w=>w.length>3).slice(0,2);\n\
  const txPayments = (transactions||[]).filter(t=>\n\
    !t.isCredit && kw.length>0 && kw.some(w=>(t.description||'').toLowerCase().includes(w))\n\
  ).map(t=>({id:t.id,date:t.date,description:t.description,amount:parseFloat(t.amount)||0,source:'tx'}));\n\
  const manualPayments = (debt.paymentHistory||[]).map(p=>({...p,source:'manual'}));\n\
  const allPayments = [...txPayments,...manualPayments]\n\
    .filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i)\n\
    .sort((a,b)=>b.date?.localeCompare(a.date));\n\
\n\
  // Build running balance from oldest to newest for display\n\
  const paymentsWithBalance = (() => {\n\
    const sorted = [...allPayments].sort((a,b)=>a.date?.localeCompare(b.date));\n\
    let bal = original;\n\
    return sorted.map(p=>{\n\
      const interest = bal*periodicRate;\n\
      const principal = Math.min(bal,Math.max(0,p.amount-interest));\n\
      bal = Math.max(0,bal-principal);\n\
      return {...p,interest:periodicRate>0?interest:0,principal:periodicRate>0?principal:p.amount,balanceAfter:bal};\n\
    }).reverse();\n\
  })();\n\
\n\
  const debtTypeLabels = {loan:'Loan',bnpl:'BNPL',mortgage:'Mortgage',credit:'Credit Card',internal:'Personal Loan'};\n\
\n\
  function save() { onChange({...debt,...form}); setEditing(false); }\n\
\n\
  return (\n\
    <div style={{...S.card,overflow:'hidden'}}>\n\
      {/* Header */}\n\
      <div style={{padding:'16px 20px',borderBottom:editing||showHistory?'1px solid #252830':'none'}}>\n\
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>\n\
          <div style={{flex:1,minWidth:0}}>\n\
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>\n\
              <span className=\"hn\" style={{fontSize:15,fontWeight:700,color:T.text}}>{debt.name}</span>\n\
              <Badge color=\"dim\">{debtTypeLabels[debt.type]||'Loan'}</Badge>\n\
              {rate>0&&<Badge color=\"dim\">{rate}% p.a.</Badge>}\n\
            </div>\n\
            <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>\n\
              <div><div style={{fontSize:10,color:T.textDim,textTransform:'uppercase',letterSpacing:'0.06em'}}>Balance</div><div style={{fontSize:18,fontWeight:700,color:T.red}}>{fmt(balance,debt.currency)}</div><div style={{fontSize:10,color:T.textDim}}>as of {debt.balanceAsOf||'now'}</div></div>\n\
              {monthlyPayment>0&&<div><div style={{fontSize:10,color:T.textDim,textTransform:'uppercase',letterSpacing:'0.06em'}}>Monthly</div><div style={{fontSize:16,fontWeight:600,color:T.accent}}>{fmt(monthlyPayment,debt.currency)}</div></div>}\n\
              {payoffDate&&<div><div style={{fontSize:10,color:T.textDim,textTransform:'uppercase',letterSpacing:'0.06em'}}>Payoff</div><div style={{fontSize:14,fontWeight:600,color:T.green}}>{payoffDate}</div></div>}\n\
              {debt.dueDate&&<div><div style={{fontSize:10,color:T.textDim,textTransform:'uppercase',letterSpacing:'0.06em'}}>Next due</div><div style={{fontSize:13,fontWeight:500,color:T.text}}>{new Date(debt.dueDate+'T12:00:00').toLocaleDateString('en-IE',{day:'numeric',month:'short'})}</div></div>}\n\
            </div>\n\
          </div>\n\
          <div style={{display:'flex',gap:6,flexShrink:0}}>\n\
            <button onClick={()=>setEditing(e=>!e)} style={{background:editing?T.accentDim+'40':T.surfaceHigh,color:editing?T.accent:T.textMid,border:'1px solid '+(editing?T.accent+'50':T.border),borderRadius:6,padding:'5px 10px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{editing?'Cancel':'Edit'}</button>\n\
            <button onClick={onDelete} style={{background:'none',border:'none',color:T.textDim,cursor:'pointer',padding:4}}><Trash2 size={13}/></button>\n\
          </div>\n\
        </div>\n\
        {/* Progress bar */}\n\
        {original>0&&<div style={{marginTop:12}}>\n\
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:T.textDim,marginBottom:4}}>\n\
            <span>{pct.toFixed(1)}% paid</span>\n\
            <span>{fmt(original-balance,debt.currency)} of {fmt(original,debt.currency)}</span>\n\
          </div>\n\
          <div style={{height:5,background:T.border,borderRadius:3}}>\n\
            <div style={{height:'100%',width:pct+'%',background:pct>=100?T.green:T.accent,borderRadius:3,transition:'width 0.3s'}}/>\n\
          </div>\n\
        </div>}\n\
      </div>\n\
\n\
      {/* Edit form */}\n\
      {editing&&(\n\
        <div style={{padding:'16px 20px',borderBottom:'1px solid #252830',background:T.surfaceHigh}}>\n\
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10}}>\n\
            <div style={{gridColumn:'span 2'}}><label style={S.label}>Debt name</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={S.input}/></div>\n\
            <div><label style={S.label}>Type</label><select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{...S.input,fontSize:12}}><option value=\"loan\">Fixed-Term Loan</option><option value=\"bnpl\">BNPL</option><option value=\"mortgage\">Mortgage</option><option value=\"credit\">Credit Card</option><option value=\"internal\">Personal Loan</option></select></div>\n\
            <div><label style={S.label}>Currency</label><select value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))} style={{...S.input,fontSize:12}}>{['EUR','GBP','USD','INR'].map(c=><option key={c}>{c}</option>)}</select></div>\n\
            <div><label style={S.label}>Original amount</label><input type=\"number\" value={form.total} onChange={e=>setForm(p=>({...p,total:e.target.value}))} placeholder=\"0.00\" style={S.input}/></div>\n\
            <div><label style={S.label}>Origination date</label><input type=\"date\" value={form.originationDate} onChange={e=>setForm(p=>({...p,originationDate:e.target.value}))} style={S.input}/></div>\n\
            <div><label style={S.label}>Current balance</label><input type=\"number\" value={form.balance} onChange={e=>setForm(p=>({...p,balance:e.target.value}))} placeholder=\"0.00\" style={S.input}/></div>\n\
            <div><label style={S.label}>Balance as of</label><input type=\"date\" value={form.balanceAsOf} onChange={e=>setForm(p=>({...p,balanceAsOf:e.target.value}))} style={S.input}/></div>\n\
            <div><label style={S.label}>Interest rate % p.a.</label><input type=\"number\" value={form.rate} onChange={e=>setForm(p=>({...p,rate:e.target.value}))} placeholder=\"e.g. 8.5\" style={S.input}/></div>\n\
            <div><label style={S.label}>Term (months)</label><input type=\"number\" value={form.termMonths} onChange={e=>setForm(p=>({...p,termMonths:e.target.value}))} placeholder=\"e.g. 24\" style={S.input}/></div>\n\
            <div><label style={S.label}>Known monthly payment</label><input type=\"number\" value={form.knownPayment} onChange={e=>setForm(p=>({...p,knownPayment:e.target.value}))} placeholder=\"e.g. 137\" style={S.input}/></div>\n\
            <div><label style={S.label}>Next due date</label><input type=\"date\" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))} style={S.input}/></div>\n\
          </div>\n\
          <button onClick={save} style={{marginTop:12,background:T.accent,color:'#0E0E10',border:'none',borderRadius:7,padding:'7px 18px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Save changes</button>\n\
        </div>\n\
      )}\n\
\n\
      {/* Payment history */}\n\
      <div>\n\
        <button onClick={()=>setShowHistory(h=>!h)} style={{width:'100%',padding:'10px 20px',background:'none',border:'none',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'inherit'}}>\n\
          <span style={{fontSize:11,fontWeight:600,color:T.textDim,textTransform:'uppercase',letterSpacing:'0.08em'}}>Payment History ({allPayments.length})</span>\n\
          <span style={{fontSize:10,color:T.textDim}}>{showHistory?'▾':'▸'}</span>\n\
        </button>\n\
        {showHistory&&(\n\
          <div style={{borderTop:'1px solid #252830'}}>\n\
            {paymentsWithBalance.length===0&&(\n\
              <div style={{padding:'16px 20px',fontSize:12,color:T.textDim}}>No payments found. Categorise transactions as Loan Repayment or BNPL Payment and they will appear here automatically.</div>\n\
            )}\n\
            {paymentsWithBalance.length>0&&(\n\
              <div style={{overflowX:'auto'}}>\n\
                <div style={{display:'grid',gridTemplateColumns:'80px 1fr 70px 70px 80px',gap:0,borderBottom:'1px solid #252830',padding:'6px 20px',fontSize:10,color:T.textDim,textTransform:'uppercase',letterSpacing:'0.06em'}}>\n\
                  <span>Date</span><span>Description</span><span style={{textAlign:'right'}}>Amount</span>{rate>0&&<span style={{textAlign:'right'}}>Principal</span>}<span style={{textAlign:'right'}}>Balance</span>\n\
                </div>\n\
                {paymentsWithBalance.map(p=>(\n\
                  <div key={p.id} style={{display:'grid',gridTemplateColumns:'80px 1fr 70px 70px 80px',gap:0,padding:'8px 20px',borderBottom:'1px solid #1a1c24',alignItems:'center'}}>\n\
                    <span style={{fontSize:11,color:T.textDim}}>{p.date?new Date(p.date+'T12:00:00').toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'2-digit'}):''}</span>\n\
                    <span style={{fontSize:11,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8}}>{p.description||'Manual payment'}</span>\n\
                    <span style={{fontSize:11,fontWeight:600,color:T.red,textAlign:'right'}}>{fmt(p.amount,debt.currency)}</span>\n\
                    {rate>0&&<span style={{fontSize:10,color:T.textMid,textAlign:'right'}}>{fmt(p.principal,debt.currency)}</span>}\n\
                    <span style={{fontSize:11,color:T.textMid,textAlign:'right'}}>{fmt(p.balanceAfter,debt.currency)}</span>\n\
                  </div>\n\
                ))}\n\
              </div>\n\
            )}\n\
          </div>\n\
        )}\n\
      </div>\n\
    </div>\n\
  );\n\
}\n" "$FILE"

echo "DebtCard replaced"

# Now update the DebtCard callsite to pass transactions
CALL_LINE=$(grep -n "<DebtCard key={d.id}" "$FILE" | head -1 | cut -d: -f1)
echo "DebtCard callsite at line $CALL_LINE"
# Add transactions prop after the existing props
sed -i "${CALL_LINE}s/<DebtCard key={d.id}/<DebtCard key={d.id}/" "$FILE"
# Find the onChange line near the callsite and add transactions prop
ONCHANGE_CALL=$(awk -v s="$CALL_LINE" 'NR>s && NR<s+10 && /onChange={updated =>/ {print NR; exit}' "$FILE")
echo "onChange at line $ONCHANGE_CALL"
sed -i "$((ONCHANGE_CALL-1))a\\                  transactions={transactions}" "$FILE"

echo ""
echo "=== Verification ==="
echo "Lines after: $(wc -l < $FILE)"
echo "New DebtCard: $(grep -c 'paymentsWithBalance\|debtTypeLabels' "$FILE")"
echo "transactions prop passed: $(grep -n 'transactions={transactions}' "$FILE" | grep -v "onCategory\|BudgetingTab\|AnalyticsTab\|AccountsTab\|RuleEditor" | head -5)"
echo ""
tail -5 "$FILE"
echo ""
echo "If new DebtCard count >= 1, run:"
echo "  git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m 'Debt module rebuild: clean loan statement, payment sync from transactions' && git -C ~/Downloads/fintrack-ie push origin main"
