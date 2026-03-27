#!/bin/bash
# Fix Overview KPI: add dates to income, fix grid layout
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "Lines before: $(wc -l < $FILE)"

# Find the stat-grid line
GRID_LINE=$(grep -n 'className="stat-grid"' "$FILE" | head -1 | cut -d: -f1)
echo "stat-grid at line $GRID_LINE"

# Fix 1: Change auto-fit to fixed 5-col grid so expansion doesn't break layout
sed -i "${GRID_LINE}s/repeat(auto-fit, minmax(100px, 1fr))/repeat(5, 1fr)/" "$FILE"
echo "Fix 1 done: KPI grid fixed to 5 columns"

# Fix 2: Add dates to income detail - find and replace the income detail section
# The income detail is on the StatCard label="EUR Income" line
INC_LINE=$(grep -n 'label="EUR Income"' "$FILE" | head -1 | cut -d: -f1)
echo "EUR Income StatCard at line $INC_LINE"

# Replace the detail prop content - add dates sorted by date
sed -i "${INC_LINE}s|const top = inc.sort((a,b)=>b.amount-a.amount).slice(0,5); return top.length ? top.map(t => <div key={t.id} style={{display:\"flex\",justifyContent:\"space-between\",fontSize:12,padding:\"3px 0\",borderBottom:\"1px solid #252830\"}}><span style={{color:T.textMid,overflow:\"hidden\",textOverflow:\"ellipsis\",whiteSpace:\"nowrap\",maxWidth:\"70%\"}}>{t.description}</span><span style={{color:T.green,flexShrink:0}}>{fmt(t.amount)}</span></div>|const top = inc.sort((a,b)=>b.date?.localeCompare(a.date)).slice(0,8); return top.length ? top.map(t => <div key={t.id} style={{display:\"flex\",alignItems:\"center\",gap:8,fontSize:12,padding:\"4px 0\",borderBottom:\"1px solid #252830\"}}><span style={{color:T.textDim,flexShrink:0,width:64}}>{t.date?new Date(t.date+\"T12:00:00\").toLocaleDateString(\"en-IE\",{day:\"numeric\",month:\"short\"}):\"\"}</span><span style={{color:T.textMid,flex:1,overflow:\"hidden\",textOverflow:\"ellipsis\",whiteSpace:\"nowrap\"}}>{t.description}</span><span style={{color:T.green,flexShrink:0,fontWeight:600}}>{fmt(t.amount)}</span></div>|" "$FILE"
echo "Fix 2 done: income dates added, sorted by date, show 8"

# Fix 3: Also update the label
sed -i "${INC_LINE}s/Top 5 income transactions/Recent income transactions/" "$FILE"

# Fix 4: Make KPI tiles responsive - on mobile use 2 cols
# Add a media query via style tag won't work in JSX, but we can add flexWrap
# Actually the grid is fine - just need mobile to be 2 cols
# The stat-grid class can handle this in CSS - skip for now

echo ""
echo "=== Verification ==="
echo "Lines after: $(wc -l < $FILE)"
echo "5-col grid: $(grep -c 'repeat(5, 1fr)' "$FILE")"
echo "Date column: $(grep -c 'en-IE.*day.*numeric.*month.*short' "$FILE")"
echo "Recent income: $(grep -c 'Recent income transactions' "$FILE")"
echo ""
tail -5 "$FILE"
echo ""
echo "Run:"
echo "  git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m 'Overview: fixed KPI grid, add dates to income, sort by date' && git -C ~/Downloads/fintrack-ie push origin main"
