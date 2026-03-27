#!/bin/bash
# FinTrack IE - Timeline patch
# - Project from last transaction date to same date next year
# - Only project salary as income (not all recurring credits)
# - Salary amount = last actual salary received, auto-updates when new one arrives
set -e
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "=== Timeline patch ==="
echo "Lines before: $(wc -l < $FILE)"

# ── FIX 1: Change end date from 60 days to year-end from last transaction ────────
# Current: const end = new Date(now.getTime() + 60 * 86400000);
# New: const end = last transaction date + 1 year
ENDLINE=$(grep -n "const end = new Date(now.getTime() + 60 \* 86400000);" "$FILE" | head -1 | cut -d: -f1)
echo "End date at line $ENDLINE"
sed -i "${ENDLINE}s/.*/    const lastTxDate = transactions.length ? new Date(Math.max(...transactions.map(t=>new Date(t.date+'T12:00:00').getTime()))) : now; const end = new Date(lastTxDate); end.setFullYear(end.getFullYear()+1);/" "$FILE"
echo "Fix 1 done: end date = last tx date + 1 year"

# ── FIX 2: Replace recurringIncome block with salary-only projection ─────────────
SALARYSTART=$(grep -n "const recurringIncome = detectRecurring" "$FILE" | head -1 | cut -d: -f1)
# Find the end of the recurringIncome.forEach block - it ends with "});""
SALARYEND=$(awk -v s="$SALARYSTART" 'NR>=s && /^\s+\}\);$/ {print NR; exit}' "$FILE")
echo "recurringIncome block: lines $SALARYSTART to $SALARYEND"

# Delete the old block
sed -i "${SALARYSTART},${SALARYEND}d" "$FILE"

# Insert new salary-only projection after SALARYSTART-1
sed -i "$((SALARYSTART-1))a\\    // Salary projection - only project salary category transactions\n    const salaryTxs = transactions.filter(t => t.isCredit && (t.category === 'Salary' || t.category === 'salary'));\n    const lastSalary = salaryTxs.sort((a,b) => new Date(b.date) - new Date(a.date))[0];\n    if (lastSalary) {\n      // Detect salary frequency from recurring salary transactions\n      const salaryDates = salaryTxs.sort((a,b) => new Date(a.date)-new Date(b.date)).map(t=>t.date);\n      const recurring = salaryDates.length > 1 ? detectRecurring(salaryTxs) : [];\n      const salaryRecurrence = recurring[0]?.recurrence || 'monthly';\n      const salaryAmount = parseFloat(lastSalary.amount) || 0;\n      let next = new Date(lastSalary.date + 'T12:00:00');\n      for (let i = 0; i < 60; i++) {\n        if (salaryRecurrence === 'weekly') next = new Date(next.getTime() + 7*86400000);\n        else if (salaryRecurrence === 'fortnightly') next = new Date(next.getTime() + 14*86400000);\n        else { next = new Date(next); next.setMonth(next.getMonth()+1); }\n        if (next > end) break;\n        // Check if actual salary already received for this period (within 5 days)\n        const alreadyReceived = salaryTxs.some(t => Math.abs(new Date(t.date)-next) < 5*86400000);\n        if (next >= now && !alreadyReceived) {\n          const adjusted = adjustForBankingDay(next.toISOString().split('T')[0]);\n          events.push({ date: new Date(adjusted+'T12:00:00'), label: lastSalary.description, amount: salaryAmount, currency: lastSalary.currency||'EUR', type: 'income', projected: true });\n        }\n      }\n    }" "$FILE"
echo "Fix 2 done: salary-only projection"

# ── FIX 3: Increase projectDates limit for committed from 60 to 365 ─────────────
sed -i 's/const dates = projectDates(ce.startDate, ce.recurrence, 60)/const dates = projectDates(ce.startDate, ce.recurrence, 365)/' "$FILE"
echo "Fix 3 done: committed projected 365 days"

# ── FIX 4: Increase paydays from 20 to 52 iterations ────────────────────────────
sed -i 's/getPaydays(firstPayday, taxProfile.payFrequency, 20)/getPaydays(firstPayday, taxProfile.payFrequency, 52)/' "$FILE"
echo "Fix 4 done: paydays 52 iterations"

# ── FIX 5: Update heading and empty message ──────────────────────────────────────
sed -i 's/60-Day Cash Flow/12-Month Cash Flow/' "$FILE"
sed -i 's/All income, committed costs and debt payments in the next 60 days/Salary, committed costs and debt payments projected to same date next year/' "$FILE"
sed -i 's/No events in the next 60 days. Set up payroll/No events projected. Categorise salary transactions, set up committed/' "$FILE"
echo "Fix 5 done: heading updated"

# ── FIX 6: Add "projected" badge to timeline items ──────────────────────────────
# Find the timeline item render and add a projected indicator
sed -i 's/<div style={{ fontSize: 10, color: T\.textDim }}>{\(daysAway === 0 ? "Today" : "in " + daysAway + "d"\)}<\/div>/<div style={{ fontSize: 10, color: T.textDim }}>{daysAway === 0 ? "Today" : "in " + daysAway + "d"}<\/div>{ev.projected \&\& <span style={{fontSize:9,color:T.textDim,marginLeft:2}}>est.<\/span>}/' "$FILE"
echo "Fix 6 done: projected badge"

# ── VERIFY ───────────────────────────────────────────────────────────────────────
echo ""
echo "=== Verification ==="
echo "Lines after: $(wc -l < $FILE)"
echo "Year-end calc:      $(grep -c 'setFullYear.*getFullYear.*1' "$FILE")"
echo "Salary projection:  $(grep -c 'salaryTxs' "$FILE")"
echo "365 committed:      $(grep -c 'projectDates.*365' "$FILE")"
echo "12-Month heading:   $(grep -c '12-Month Cash Flow' "$FILE")"
echo ""
tail -5 "$FILE"
echo ""
echo "If all counts >= 1, run:"
echo "  git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m 'Timeline: 12-month projection, salary-only income, auto-detect salary amount' && git -C ~/Downloads/fintrack-ie push origin main"
