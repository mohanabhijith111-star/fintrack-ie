#!/bin/bash
# FinTrack IE - Complete patch v4
# Fixes: rule override, delete tx, committed select, goals/accounts tabs, drive merge
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "=== FinTrack patch v4 ==="
echo "Lines before: $(wc -l < $FILE)"

# ── FIX 1: updateTxCategory - add thisOneOnly flag ──────────────────────────────
sed -i 's/function updateTxCategory(id, category) {/function updateTxCategory(id, category, thisOneOnly) {/' "$FILE"
sed -i 's/      if (kw \&\& tx\.description\.toLowerCase()\.includes(kw)) return { \.\.\.tx, category, nature };/      if (!thisOneOnly \&\& kw \&\& tx.description.toLowerCase().includes(kw) \&\& !tx.ruleExcluded) return { ...tx, category, nature, ruleMatched:true };/' "$FILE"
echo "Fix 1 done: rule thisOneOnly flag"

# ── FIX 2: TxRow - add onOverride prop + this-only button ───────────────────────
sed -i 's/function TxRow({ tx, onCategory, onDelete, onNature, onNewCategory, overheadGroups, debts, onAllocateDebt, onCommit, committed, onSplit })/function TxRow({ tx, onCategory, onDelete, onNature, onNewCategory, overheadGroups, debts, onAllocateDebt, onCommit, committed, onSplit, onOverride })/' "$FILE"
# Add onOverride at TxRow callsite - find the onSplit line and add after it
ONSPLITLINE=$(grep -n "onSplit={tx => setSplitTx(tx)}" "$FILE" | head -1 | cut -d: -f1)
echo "onSplit at line $ONSPLITLINE"
sed -i "${ONSPLITLINE}a\\                    onOverride={txId => setTransactions(prev => prev.map(t => t.id===txId?{...t,ruleExcluded:true,ruleMatched:false}:t))}" "$FILE"
# Add this-only button before delete - find delete button line
DELLINE=$(grep -n 'onClick={onDelete} style={{ background: "none", border: "none", color: T\.textDim, cursor: "pointer", padding: "2px 4px"' "$FILE" | head -1 | cut -d: -f1)
echo "Delete button at line $DELLINE"
sed -i "${DELLINE}i\\        {tx.ruleMatched && onOverride && (<button onClick={()=>onOverride(tx.id)} title=\"Apply this category to this transaction only\" style={{background:\"rgba(240,160,60,0.1)\",color:\"#F0A03C\",border:\"1px solid rgba(240,160,60,0.3)\",borderRadius:5,padding:\"2px 6px\",fontSize:9,cursor:\"pointer\",fontFamily:\"inherit\",flexShrink:0,marginRight:2}}>this only<\/button>)}" "$FILE"
echo "Fix 2 done: this-only button"

# ── FIX 3: Committed category - replace CategoryCombo with native select ─────────
# Find CategoryCombo line in committed section (not in transactions section)
COMBOSTART=$(grep -n '                          <CategoryCombo' "$FILE" | head -1 | cut -d: -f1)
echo "CategoryCombo in committed at line $COMBOSTART"
# Find closing /> of CategoryCombo - it's on the line with style={{ fontSize: 12 }}
CLOSELINE=$(awk "NR>=$COMBOSTART && /style={{ fontSize: 12 }}/" "$FILE" | head -1)
COMBOEND=$(grep -n 'style={{ fontSize: 12 }}' "$FILE" | awk -F: -v s="$COMBOSTART" '$1>=s{print $1; exit}')
COMBOEND_CLOSE=$((COMBOEND + 1))
echo "CategoryCombo from $COMBOSTART to $COMBOEND_CLOSE"
# Delete the CategoryCombo block
sed -i "${COMBOSTART},${COMBOEND_CLOSE}d" "$FILE"
# Insert select at the now-empty position
INSERTLINE=$((COMBOSTART - 1))
sed -i "${INSERTLINE}a\\                          <select value={ce.category||\"\"} onChange={e=>{const cat=e.target.value;setCommitted(prev=>prev.map(x=>x.id===ce.id?{...x,category:cat}:x));if(!cat)return;const normName=normaliseDesc(ce.name);setTransactions(prev=>prev.map(tx=>{if(tx.isCredit)return tx;const nd=normaliseDesc(tx.description||\"\");return(nd===normName||nd.includes(normName)||normName.includes(nd))?{...tx,category:cat}:tx;}));setRules(prev=>{const kw=normName.split(\" \").filter(w=>w.length>3).slice(0,2).join(\" \");if(!kw)return prev;return[...prev.filter(r=>!r.keywords?.includes(kw)),{id:Date.now().toString(),description:ce.name,keywords:[kw],category:cat}];});}} style={{...S.input,fontSize:12,flex:1}}><option value=\"\">-- Set category --<\/option>{Object.entries(OVERHEAD_GROUPS).map(([grp,cats])=>(<optgroup key={grp} label={grp}>{cats.map(c=><option key={c} value={c}>{c}<\/option>)}<\/optgroup>))}<\/select>" "$FILE"
echo "Fix 3 done: committed select"

# ── FIX 4: Wire goals and accounts tabs into router ──────────────────────────────
SETTINGSLINE=$(grep -n '{\/\* -- SETTINGS' "$FILE" | head -1 | cut -d: -f1)
echo "Settings anchor at line $SETTINGSLINE"
sed -i "$((SETTINGSLINE-1))a\\        {tab===\"accounts\"&&(<AccountsTab accounts={accounts} setAccounts={setAccounts} transactions={transactions} debts={debts} />)}\n        {tab===\"goals\"&&(<GoalsTab />)}" "$FILE"
echo "Fix 4 done: goals + accounts tabs wired"

# ── FIX 5: Drive smart merge - keep newer data ───────────────────────────────────
DRIVELINE=$(grep -n "LS_KEYS.forEach(k => { try { if (data\[k\]) localStorage.setItem" "$FILE" | head -1 | cut -d: -f1)
echo "Drive load line at $DRIVELINE"
sed -i "${DRIVELINE}s/.*/  const localTs=localStorage.getItem('_savedAt')||'1970'; const driveTs=data['_savedAt']||'1970'; const driveNewer=new Date(driveTs)>new Date(localTs); LS_KEYS.forEach(k=>{try{if(!data[k])return;if(driveNewer){localStorage.setItem(k,data[k]);}else{const lv=localStorage.getItem(k);if(!lv||lv==='[]'||lv==='{}')localStorage.setItem(k,data[k]);}}catch{}}); if(driveNewer)localStorage.setItem('_savedAt',driveTs);/" "$FILE"
echo "Fix 5 done: drive smart merge"

# ── FIX 6: Stamp _savedAt to localStorage on every save ─────────────────────────
sed -i "s/data\['_savedAt'\] = new Date().toISOString();/data['_savedAt'] = new Date().toISOString(); localStorage.setItem('_savedAt', data['_savedAt']);/" "$FILE"
echo "Fix 6 done: _savedAt localStorage stamp"

# ── VERIFY ───────────────────────────────────────────────────────────────────────
echo ""
echo "=== Verification ==="
echo "Lines after patch: $(wc -l < $FILE)"
echo "thisOneOnly instances:   $(grep -c 'thisOneOnly' "$FILE")"
echo "this-only button:        $(grep -c 'this only' "$FILE")"
echo "accounts tab render:     $(grep -c 'tab===\"accounts\"' "$FILE")"
echo "goals tab render:        $(grep -c 'tab===\"goals\"' "$FILE")"
echo "drive smart merge:       $(grep -c 'driveNewer' "$FILE")"
echo "committed select:        $(grep -c 'optgroup' "$FILE")"
echo "_savedAt localStorage:   $(grep -c '_savedAt.*localStorage.setItem' "$FILE")"
echo ""
tail -5 "$FILE"
echo ""
echo "If all counts above are >= 1, run:"
echo "  git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m 'Fix rule override, goals/accounts tabs, committed select, drive merge' && git -C ~/Downloads/fintrack-ie push origin main"
