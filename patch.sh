#!/bin/bash
# Patch script for FinTrack IE sidebar redesign
# Run from: bash patch.sh ~/Downloads/fintrack-ie/src/App.jsx

FILE="$1"
if [ -z "$FILE" ]; then
  echo "Usage: bash patch.sh path/to/App.jsx"
  exit 1
fi

echo "File: $FILE"
echo "Lines: $(wc -l < "$FILE")"

# Step 1: Find exact line numbers
TOPBAR=$(grep -n "TOP BAR" "$FILE" | head -1 | cut -d: -f1)
PADPAGE=$(grep -n "pad-page" "$FILE" | grep "maxWidth: 1280" | head -1 | cut -d: -f1)
TOTAL=$(wc -l < "$FILE")

echo "TOP BAR at line: $TOPBAR"
echo "pad-page at line: $PADPAGE"
echo "Total lines: $TOTAL"

# Step 2: Keep lines before top bar
head -n $((TOPBAR - 1)) "$FILE" > /tmp/app_part1.txt

# Step 3: Write new sidebar section
cat >> /tmp/app_part1.txt << 'SIDEBAR'
      {/* SIDEBAR LAYOUT */}
      <div className="app-shell">
        <aside className="sidebar">
          <div style={{padding:"18px 16px 14px",borderBottom:"1px solid #252830"}}>
            <div className="hn" style={{fontSize:20,fontWeight:800,color:"#EEEDF0"}}>Fin<span style={{color:"#F0A03C"}}>Track</span><span style={{color:"#454760",fontWeight:600,fontSize:11,marginLeft:4}}>IE</span></div>
            {nextPayday && payroll && (
              <div style={{marginTop:10,padding:"8px 10px",background:"rgba(240,160,60,0.09)",borderRadius:8,border:"1px solid rgba(240,160,60,0.2)"}}>
                <div style={{fontSize:9,color:"#F0A03C",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>Next Payday</div>
                <div style={{fontSize:12,color:"#EEEDF0",marginTop:2}}>{dateStr(nextPayday)}</div>
                <div className="mono" style={{fontSize:13,fontWeight:600,color:"#F0A03C"}}>{fmt(payroll.perNet)}</div>
              </div>
            )}
          </div>
          <nav style={{padding:"8px 0",flex:1}}>
            <div className="nav-label">Main</div>
            {[{id:"dashboard",label:"Overview",icon:BarChart2},{id:"transactions",label:"Transactions",icon:Layers}].map(t=>{const Icon=t.icon;return(<button key={t.id} className={"nav-item"+(tab===t.id?" active":"")} onClick={()=>setTab(t.id)}><Icon size={14} style={{flexShrink:0,opacity:0.8}}/><span>{t.label}</span>{t.id==="transactions"&&importQueue.length>0&&<span style={{marginLeft:"auto",background:"#E05C5C",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:700}}>{importQueue.length}</span>}</button>);})}
            <div className="nav-label" style={{marginTop:8}}>Planning</div>
            {[{id:"budgeting",label:"Budgeting",icon:Target},{id:"committed",label:"Committed",icon:Calendar}].map(t=>{const Icon=t.icon;return(<button key={t.id} className={"nav-item"+(tab===t.id?" active":"")} onClick={()=>setTab(t.id)}><Icon size={14} style={{flexShrink:0,opacity:0.8}}/><span>{t.label}</span></button>);})}
            <div className="nav-label" style={{marginTop:8}}>Insights</div>
            {[{id:"analytics",label:"Analytics",icon:TrendingDown},{id:"timeline",label:"Timeline",icon:Clock}].map(t=>{const Icon=t.icon;return(<button key={t.id} className={"nav-item"+(tab===t.id?" active":"")} onClick={()=>setTab(t.id)}><Icon size={14} style={{flexShrink:0,opacity:0.8}}/><span>{t.label}</span></button>);})}
            <div className="nav-label" style={{marginTop:8}}>Debt</div>
            {[{id:"debt",label:"Debt Tracker",icon:CreditCard},{id:"planner",label:"Planner",icon:TrendingUp}].map(t=>{const Icon=t.icon;return(<button key={t.id} className={"nav-item"+(tab===t.id?" active":"")} onClick={()=>setTab(t.id)}><Icon size={14} style={{flexShrink:0,opacity:0.8}}/><span>{t.label}</span></button>);})}
          </nav>
          <div style={{padding:"10px 8px",borderTop:"1px solid #252830"}}>
            <DriveSync/>
            <button className={"nav-item"+(tab==="settings"?" active":"")} onClick={()=>setTab("settings")} style={{marginTop:4}}><Settings size={14} style={{flexShrink:0,opacity:0.8}}/><span>Settings</span></button>
          </div>
        </aside>
        <div className="mobile-nav" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:"#0F1117",borderTop:"1px solid #252830",padding:"4px 0",justifyContent:"space-around",alignItems:"center"}}>
          {[{id:"dashboard",icon:BarChart2,label:"Home"},{id:"transactions",icon:Layers,label:"Txns"},{id:"analytics",icon:TrendingDown,label:"Stats"},{id:"committed",icon:Calendar,label:"Bills"},{id:"debt",icon:CreditCard,label:"Debt"},{id:"settings",icon:Settings,label:"More"}].map(t=>{const Icon=t.icon;const active=tab===t.id;return(<button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 8px",border:"none",background:"none",cursor:"pointer",color:active?"#F0A03C":"#454760",fontFamily:"inherit",minWidth:44}}><Icon size={17}/><span style={{fontSize:9,fontWeight:active?700:400}}>{t.label}</span></button>);})}
        </div>
        <main className="main-content" style={{paddingBottom:70}}>
          <div style={{padding:"16px 24px 12px",borderBottom:"1px solid #252830",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <h1 className="hn" style={{fontSize:22,fontWeight:800,color:"#EEEDF0"}}>{TABS.find(t=>t.id===tab)?TABS.find(t=>t.id===tab).label:"Overview"}</h1>
              <div style={{fontSize:11,color:"#454760",marginTop:2}}>{new Date().toLocaleDateString("en-IE",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
            </div>
            <div className="hide-mobile"><DriveSync/></div>
          </div>
          <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
SIDEBAR

# Step 4: Add all tab content (lines PADPAGE+1 to end-6, skipping the old closing divs)
# We skip lines TOPBAR to PADPAGE (the old top bar) 
# and we keep everything from PADPAGE+1 onwards BUT replace the last close

# Count lines to keep from middle section
MIDDLE_END=$((TOTAL - 4))  # Skip last 4 lines: </div>\n</div>\n  );\n}

# Add middle section (tab content)
tail -n +$((PADPAGE + 1)) "$FILE" | head -n $((MIDDLE_END - PADPAGE)) >> /tmp/app_part1.txt

# Step 5: Write correct closing
cat >> /tmp/app_part1.txt << 'CLOSING'
          </div>
        </main>
      </div>
    </div>
  );
}
CLOSING

# Step 6: Replace original file
cp /tmp/app_part1.txt "$FILE"
echo "Done! New line count: $(wc -l < "$FILE")"

# Verify structure
echo ""
echo "--- Verification ---"
grep -n "app-shell\|<main\|</main\|</aside" "$FILE" | head -10
echo ""
echo "Last 8 lines:"
tail -8 "$FILE"
