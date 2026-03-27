#!/bin/bash
FILE=~/Downloads/fintrack-ie/src/App.jsx
echo "Fixing line 1436 - removing curly quotes"

# First revert line 1436 back to the simple version (no + Rule button here)
sed -i '1436s/.*/                        <div style={{ fontSize: 11, color: T.textDim }}>{dateStr(tx.date)}{tx.category ? ` - ${tx.category}` : " - uncategorised"}<\/div>/' "$FILE"

# Verify it looks clean
echo "Line 1436 now:"
sed -n '1436p' "$FILE"

echo ""
echo "Lines: $(wc -l < $FILE)"
git -C ~/Downloads/fintrack-ie add src/App.jsx && git -C ~/Downloads/fintrack-ie commit -m "Fix build - revert broken + Rule button from collapsed row" && git -C ~/Downloads/fintrack-ie push origin main
