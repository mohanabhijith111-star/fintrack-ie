#!/bin/bash
FILE=~/Downloads/fintrack-ie/src/App.jsx

echo "Applying mobile fixes..."

# ── FIX M1: Expand mobile nav to include missing tabs ────────────────────────
# Replace the 6-tab mobile nav with a better 5+More pattern
# More now opens a bottom sheet with the remaining tabs
# We'll show: Home, Txns, Bills, Debt, More
# More cycles through: Accounts, Goals, Budgeting, Analytics, Timeline, Planner, Settings

OLD_NAV='          {[
            {id:"dashboard",icon:BarChart2,label:"Home"},
            {id:"transactions",icon:Layers,label:"Txns"},
            {id:"analytics",icon:TrendingDown,label:"Stats"},
            {id:"committed",icon:Calendar,label:"Bills"},
            {id:"debt",icon:CreditCard,label:"Debt"},
            {id:"settings",icon:Settings,label:"More"},
          ].map(t => { const Icon=t.icon; const active=tab===t.id; return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 8px",border:"none",background:"none",cursor:"pointer",color:active?"#F0A03C":"#454760",fontFamily:"inherit",minWidth:44}}><Icon size={17}/><span style={{fontSize:9,fontWeight:active?700:400}}>{t.label}</span></button>
          );})}
        </div>'

NEW_NAV='          {[
            {id:"dashboard",icon:BarChart2,label:"Home"},
            {id:"transactions",icon:Layers,label:"Txns"},
            {id:"committed",icon:Calendar,label:"Bills"},
            {id:"debt",icon:CreditCard,label:"Debt"},
            {id:"accounts",icon:CreditCard,label:"Accounts"},
            {id:"analytics",icon:TrendingDown,label:"Stats"},
            {id:"goals",icon:Target,label:"Goals"},
            {id:"budgeting",icon:Target,label:"Budget"},
            {id:"planner",icon:TrendingUp,label:"Planner"},
            {id:"timeline",icon:Clock,label:"Timeline"},
            {id:"settings",icon:Settings,label:"Settings"},
          ].slice(0,5).map(t => { const Icon=t.icon; const active=tab===t.id; return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 8px",border:"none",background:"none",cursor:"pointer",color:active?"#F0A03C":"#454760",fontFamily:"inherit",minWidth:44}}><Icon size={17}/><span style={{fontSize:9,fontWeight:active?700:400}}>{t.label}</span></button>
          );})}
          <button onClick={()=>setShowMobileMenu(s=>!s)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 8px",border:"none",background:"none",cursor:"pointer",color:["accounts","analytics","goals","budgeting","planner","timeline","settings"].includes(tab)?"#F0A03C":"#454760",fontFamily:"inherit",minWidth:44}}><Settings size={17}/><span style={{fontSize:9}}>More</span></button>
          {showMobileMenu && (
            <div style={{position:"absolute",bottom:56,left:0,right:0,background:"#0F1117",borderTop:"1px solid #252830",padding:"8px 0",display:"flex",flexWrap:"wrap",gap:0}}>
              {[{id:"accounts",icon:CreditCard,label:"Accounts"},{id:"analytics",icon:TrendingDown,label:"Analytics"},{id:"goals",icon:Target,label:"Goals"},{id:"budgeting",icon:Target,label:"Budgeting"},{id:"planner",icon:TrendingUp,label:"Planner"},{id:"timeline",icon:Clock,label:"Timeline"},{id:"settings",icon:Settings,label:"Settings"}].map(t=>{const Icon=t.icon;const active=tab===t.id;return(<button key={t.id} onClick={()=>{setTab(t.id);setShowMobileMenu(false);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"10px 0",border:"none",background:active?"rgba(240,160,60,0.09)":"none",cursor:"pointer",color:active?"#F0A03C":"#8B8DA0",fontFamily:"inherit",flex:"1 0 25%"}}><Icon size={17}/><span style={{fontSize:9,marginTop:2}}>{t.label}</span></button>);})}
            </div>
          )}
        </div>'

python3 -c "
content = open('$FILE').read()
old = '''          {[
            {id:\"dashboard\",icon:BarChart2,label:\"Home\"},
            {id:\"transactions\",icon:Layers,label:\"Txns\"},
            {id:\"analytics\",icon:TrendingDown,label:\"Stats\"},
            {id:\"committed\",icon:Calendar,label:\"Bills\"},
            {id:\"debt\",icon:CreditCard,label:\"Debt\"},
            {id:\"settings\",icon:Settings,label:\"More\"},
          ].map(t => { const Icon=t.icon; const active=tab===t.id; return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:\"flex\",flexDirection:\"column\",alignItems:\"center\",gap:2,padding:\"6px 8px\",border:\"none\",background:\"none\",cursor:\"pointer\",color:active?\"#F0A03C\":\"#454760\",fontFamily:\"inherit\",minWidth:44}}><Icon size={17}/><span style={{fontSize:9,fontWeight:active?700:400}}>{t.label}</span></button>
          );})}
        </div>'''
new = '''          {[
            {id:\"dashboard\",icon:BarChart2,label:\"Home\"},
            {id:\"transactions\",icon:Layers,label:\"Txns\"},
            {id:\"committed\",icon:Calendar,label:\"Bills\"},
            {id:\"debt\",icon:CreditCard,label:\"Debt\"},
          ].map(t => { const Icon=t.icon; const active=tab===t.id; return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:\"flex\",flexDirection:\"column\",alignItems:\"center\",gap:2,padding:\"6px 8px\",border:\"none\",background:\"none\",cursor:\"pointer\",color:active?\"#F0A03C\":\"#454760\",fontFamily:\"inherit\",minWidth:44}}><Icon size={17}/><span style={{fontSize:9,fontWeight:active?700:400}}>{t.label}</span></button>
          );})}
          <button onClick={()=>setShowMobileMenu(s=>!s)} style={{display:\"flex\",flexDirection:\"column\",alignItems:\"center\",gap:2,padding:\"6px 8px\",border:\"none\",background:\"none\",cursor:\"pointer\",color:[\"accounts\",\"analytics\",\"goals\",\"budgeting\",\"planner\",\"timeline\",\"settings\"].includes(tab)?\"#F0A03C\":\"#454760\",fontFamily:\"inherit\",minWidth:44}}><Settings size={17}/><span style={{fontSize:9}}>More</span></button>
          {showMobileMenu && (
            <div style={{position:\"absolute\",bottom:56,left:0,right:0,background:\"#0F1117\",borderTop:\"1px solid #252830\",padding:\"8px 0\",display:\"flex\",flexWrap:\"wrap\",gap:0}}>
              {[{id:\"accounts\",icon:CreditCard,label:\"Accounts\"},{id:\"analytics\",icon:TrendingDown,label:\"Analytics\"},{id:\"goals\",icon:Target,label:\"Goals\"},{id:\"budgeting\",icon:Target,label:\"Budgeting\"},{id:\"planner\",icon:TrendingUp,label:\"Planner\"},{id:\"timeline\",icon:Clock,label:\"Timeline\"},{id:\"settings\",icon:Settings,label:\"Settings\"}].map(t=>{const Icon=t.icon;const active=tab===t.id;return(<button key={t.id} onClick={()=>{setTab(t.id);setShowMobileMenu(false);}} style={{display:\"flex\",flexDirection:\"column\",alignItems:\"center\",gap:2,padding:\"10px 0\",border:\"none\",background:active?\"rgba(240,160,60,0.09)\":\"none\",cursor:\"pointer\",color:active?\"#F0A03C\":\"#8B8DA0\",fontFamily:\"inherit\",flex:\"1 0 25%\"}}><Icon size={17}/><span style={{fontSize:9,marginTop:2}}>{t.label}</span></button>);})}
            </div>
          )}
        </div>'''
if old in content:
    content = content.replace(old, new, 1)
    print('M1: Mobile nav fixed')
else:
    print('M1: WARNING - nav not found')
open('$FILE', 'w').write(content)
"

# ── FIX M1b: Add showMobileMenu state ────────────────────────────────────────
grep -n "const \[splitTx" $FILE | head -3
SPLIT_LINE=$(grep -n "const \[splitTx" $FILE | head -1 | cut -d: -f1)
echo "splitTx at line $SPLIT_LINE"
sed -i "${SPLIT_LINE}a\\  const [showMobileMenu, setShowMobileMenu] = useState(false);" $FILE
echo "M1b: showMobileMenu state added"

# ── FIX M2: KPI grid - stat-grid class at 390px ──────────────────────────────
# The stat-grid class already has repeat(2,1fr) on mobile via CSS
# But the overview KPI uses inline style minmax(140px) - fix it  
python3 -c "
content = open('$FILE').read()
# Fix the main KPI grid on overview (line ~1372 in original)
old = 'className=\"stat-grid\" style={{ display: \"grid\", gridTemplateColumns: \"repeat(auto-fit, minmax(140px, 1fr))\", gap: 10 }}'
new = 'className=\"stat-grid\" style={{ display: \"grid\", gridTemplateColumns: \"repeat(auto-fit, minmax(120px, 1fr))\", gap: 8 }}'
n = content.count(old)
content = content.replace(old, new)
print(f'M2: KPI grid fixed ({n} replacements)')
open('$FILE', 'w').write(content)
"

# ── FIX M3: Analytics table - make it scrollable with visible hint ───────────
# The monthly comparison table already has overflowX:auto wrapper
# But the sub-tab buttons (Cash Flow / Categories / etc) overflow
# Fix: make the analytics sub-tab bar wrap on mobile
python3 -c "
content = open('$FILE').read()
# Find the analytics sub-tab bar
old = \"display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2\"
new = \"display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2, flexWrap: 'wrap'\"
n = content.count(old)
content = content.replace(old, new)
print(f'M3: Analytics sub-tabs wrap fixed ({n} replacements)')
open('$FILE', 'w').write(content)
"

# ── FIX M4: Committed category - always show input ───────────────────────────
# Currently the input shows but badge also shows - on mobile the issue is
# that the input + badge + clear btn + amount + Project + delete is too wide
# Fix: on mobile stack the category row vertically, use full width for input
python3 -c "
content = open('$FILE').read()
# Find the category picker div in committed and change its flex layout
# The current layout is: [input flex:1] [badge] [-- btn]
# We need to ensure the input gets enough width on mobile
# The issue is the parent div has display:flex which on small screens squeezes the input
old = '{/* Category picker - always editable, clears with x button */}\n                        <div style={{ marginTop: 6, display: \"flex\", alignItems: \"center\", gap: 6 }}>'
new = '{/* Category picker - always editable, clears with x button */}\n                        <div style={{ marginTop: 6, display: \"flex\", alignItems: \"center\", gap: 6, flexWrap: \"wrap\" }}>'
n = content.count(old)
content = content.replace(old, new)
print(f'M4: Category row flex-wrap added ({n} replacements)')
open('$FILE', 'w').write(content)
"

echo ""
echo "All fixes applied. Verifying..."
grep -n "showMobileMenu\|More.*menu\|setShowMobileMenu" $FILE | head -6
grep -c "minmax(120px" $FILE
tail -5 $FILE
