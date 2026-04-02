import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';

const T = {
  bg: "#0A0C10",
  surface: "#161820",
  surfaceHigh: "#1E2028",
  surfaceHover: "#23252F",
  text: "#EEEDF0",
  textMid: "#8B8DA0",
  textDim: "#454760",
  accent: "#F0A03C",
  accentDim: "#6B4518",
  green: "#3DB87A",
  greenDim: "#143D28",
  red: "#E05C5C",
  redDim: "#3D1818",
  blue: "#4A8FD4",
  blueDim: "#142640",
  purple: "#8B6FD4",
  purpleDim: "#241840",
  border: "#252830",
};

const CURRENCIES = ["EUR", "INR", "USD", "GBP"];
const getCurrencySymbol = (c) => ({ EUR: "€", INR: "₹", USD: "$", GBP: "£" }[c] || c);
const fmt = (n, c = "EUR") => `${getCurrencySymbol(c)}${Number(n || 0).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().split("T")[0];
const dateStr = (d) => { try { return new Date(d + "T12:00:00").toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "2-digit" }); } catch { return d; } };

// PMT calculation
function calcPMT(balance, annualRatePct, termMonths) {
  const P = parseFloat(balance) || 0;
  const annualRate = parseFloat(annualRatePct) || 0;
  const n = parseInt(termMonths) || 0;
  if (P <= 0 || n <= 0 || annualRate < 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

// Check if a due date is overdue
function isOverdue(dueDate) {
  if (!dueDate) return false;
  try { return new Date(dueDate + "T12:00:00") < new Date(); } catch { return false; }
}

const DEBT_TYPE_CONFIG = {
  loan:     { label: "Loan",        color: T.accent,  bg: T.accentDim },
  bnpl:     { label: "BNPL",        color: T.blue,    bg: T.blueDim },
  mortgage: { label: "Mortgage",    color: T.purple,  bg: T.purpleDim },
  credit:   { label: "Credit Card", color: T.red,     bg: T.redDim },
  internal: { label: "Personal",    color: T.textMid, bg: T.surfaceHigh },
};

function TypeBadge({ type }) {
  const cfg = DEBT_TYPE_CONFIG[type] || DEBT_TYPE_CONFIG.loan;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 7px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.04em",
      color: cfg.color,
      backgroundColor: cfg.bg,
      border: `1px solid ${cfg.color}40`,
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

function DebtRow({ debt, linkedAsset, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: debt.name || "",
    type: debt.type || "loan",
    total: debt.total || debt.balance || "",
    balance: debt.balance || "",
    balanceAsOf: debt.balanceAsOf || today(),
    currency: debt.currency || "EUR",
    rate: debt.rate || "",
    termMonths: debt.termMonths || "",
    knownPayment: debt.knownPayment || "",
    dueDate: debt.dueDate || "",
  });
  const fld = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const balance = parseFloat(debt.balance) || 0;
  const rate = parseFloat(debt.rate) || 0;
  const knownPmt = parseFloat(debt.knownPayment) || 0;
  const monthlyPayment = knownPmt || calcPMT(balance, rate, debt.termMonths);
  const overdue = isOverdue(debt.dueDate);
  const highRate = rate >= 10;

  const rowColor = overdue ? T.red : highRate ? T.accent : T.text;

  const inputStyle = {
    width: "100%",
    padding: "6px 8px",
    fontSize: 12,
    border: `1px solid ${T.border}`,
    backgroundColor: T.surface,
    color: T.text,
    borderRadius: 4,
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 10, fontWeight: 600, color: T.textMid, marginBottom: 3, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" };

  function save() {
    // ── Validation ──────────────────────────────────────────────────────
    const bal = parseFloat(form.balance);
    const tot = parseFloat(form.total);
    const rat = parseFloat(form.rate);
    if (!form.name.trim())                     { alert("Debt name is required.");                     return; }
    if (isNaN(bal) || bal < 0)                 { alert("Balance cannot be negative.");                return; }
    if (bal === 0)                             { alert("Balance must be greater than €.");         return; }
    if (!isNaN(tot) && tot > 0 && bal > tot)   { alert("Balance cannot exceed original amount.");     return; }
    if (!isNaN(rat) && (rat < 0 || rat > 100)) { alert("Interest rate must be between 0-100%.");      return; }

    // ── Recalculate payment / term when key fields change ───────────────
    const updatedForm = { ...form };
    const balanceChanged = parseFloat(form.balance) !== parseFloat(debt.balance);
    const rateChanged    = parseFloat(form.rate)    !== parseFloat(debt.rate);
    const termChanged    = parseInt(form.termMonths) !== parseInt(debt.termMonths);
    const hasManualPmt   = form.knownPayment !== "" && parseFloat(form.knownPayment) > 0;

    if (!hasManualPmt) {
      if (balanceChanged || rateChanged || termChanged) {
        const newPmt = calcPMT(
          parseFloat(updatedForm.balance) || 0,
          parseFloat(updatedForm.rate)    || 0,
          parseInt(updatedForm.termMonths) || 0
        );
        if (newPmt > 0) updatedForm.knownPayment = newPmt.toFixed(2);
      }
    }

    onChange({ ...debt, ...updatedForm });
    setEditing(false);
  }

  function cancel() {
    setForm({
      name: debt.name || "",
      type: debt.type || "loan",
      total: debt.total || debt.balance || "",
      balance: debt.balance || "",
      balanceAsOf: debt.balanceAsOf || today(),
      currency: debt.currency || "EUR",
      rate: debt.rate || "",
      termMonths: debt.termMonths || "",
      knownPayment: debt.knownPayment || "",
      dueDate: debt.dueDate || "",
    });
    setEditing(false);
  }

  return (
    <>
      {/* Compact row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px,2fr) 80px minmax(90px,1fr) minmax(90px,1fr) 52px 80px 90px 64px",
        gap: 6,
        alignItems: "center",
        padding: "9px 14px",
        borderBottom: `1px solid ${T.border}`,
        backgroundColor: editing ? T.surfaceHigh : "transparent",
        transition: "background 0.15s",
      }}>
        {/* Name */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: rowColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {debt.name}
          </div>
          {linkedAsset && (
            <div style={{ fontSize: 10, color: T.textDim }}>↗ {linkedAsset.name}</div>
          )}
        </div>

        {/* Type */}
        <div><TypeBadge type={debt.type} /></div>

        {/* Total / Original */}
        <div>
          <div style={{ fontSize: 12, color: T.textMid }}>
            {debt.total ? fmt(debt.total, debt.currency) : <span style={{ color: T.textDim }}>—</span>}
          </div>
        </div>

        {/* Current Balance */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.red }}>{fmt(balance, debt.currency)}</div>
          {debt.balanceAsOf && <div style={{ fontSize: 10, color: T.textDim }}>{dateStr(debt.balanceAsOf)}</div>}
        </div>

        {/* Rate */}
        <div style={{ textAlign: "right" }}>
          {rate > 0 ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: highRate ? T.red : T.textMid }}>{rate}%</span>
          ) : (
            <span style={{ fontSize: 12, color: T.textDim }}>—</span>
          )}
        </div>

        {/* Due Date */}
        <div>
          {debt.dueDate ? (
            <span style={{ fontSize: 11, color: overdue ? T.red : T.textMid, fontWeight: overdue ? 700 : 400 }}>
              {dateStr(debt.dueDate)}
              {overdue && <span style={{ fontSize: 9, color: T.red, display: "block" }}>OVERDUE</span>}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: T.textDim }}>—</span>
          )}
        </div>

        {/* Monthly Payment */}
        <div>
          {monthlyPayment > 0 ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>{fmt(monthlyPayment, debt.currency)}</span>
          ) : (
            <span style={{ fontSize: 11, color: T.textDim }}>—</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <button
            onClick={() => (editing ? cancel() : setEditing(true))}
            title={editing ? "Cancel edit" : "Edit liability"}
            style={{
              background: editing ? T.accentDim + "40" : T.surfaceHigh,
              color: editing ? T.accent : T.textMid,
              border: `1px solid ${editing ? T.accent + "50" : T.border}`,
              borderRadius: 5,
              padding: "4px 6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            {editing ? <X size={12} /> : <Pencil size={12} />}
          </button>
          <button
            onClick={onDelete}
            title="Delete liability"
            style={{
              background: "none",
              border: "none",
              color: T.textDim,
              cursor: "pointer",
              padding: "4px 5px",
              display: "flex",
              alignItems: "center",
              borderRadius: 5,
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div style={{
          padding: "12px 14px",
          borderBottom: `1px solid ${T.border}`,
          backgroundColor: T.surfaceHigh,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 10 }}>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Debt name</label>
              <input value={form.name} onChange={fld("name")} style={inputStyle} placeholder="e.g. CU Loan" />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={fld("type")} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="loan">Fixed-Term Loan</option>
                <option value="bnpl">BNPL</option>
                <option value="mortgage">Mortgage</option>
                <option value="credit">Credit Card</option>
                <option value="internal">Personal Loan</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={form.currency} onChange={fld("currency")} style={{ ...inputStyle, cursor: "pointer" }}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Original Amount</label>
              <input type="number" value={form.total} onChange={fld("total")} placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Current Balance</label>
              <input type="number" value={form.balance} onChange={fld("balance")} placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Balance Date</label>
              <input type="date" value={form.balanceAsOf} onChange={fld("balanceAsOf")} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Interest Rate %</label>
              <input type="number" value={form.rate} onChange={fld("rate")} placeholder="e.g. 8.5" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Term (months)</label>
              <input type="number" value={form.termMonths} onChange={fld("termMonths")} placeholder="e.g. 24" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Known Payment</label>
              <input type="number" value={form.knownPayment} onChange={fld("knownPayment")} placeholder="e.g. 137" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Next Due Date</label>
              <input type="date" value={form.dueDate} onChange={fld("dueDate")} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={save}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: T.accent,
                color: T.bg,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "inherit",
              }}
            >
              <Check size={12} /> Save
            </button>
            <button
              onClick={cancel}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                backgroundColor: T.surfaceHover,
                color: T.textMid,
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function LiabilitiesList({ debts = [], assets = [], onChange, onDelete }) {
  if (debts.length === 0) return null;

  const sorted = [...debts].sort((a, b) => (parseFloat(b.rate) || 0) - (parseFloat(a.rate) || 0));

  return (
    <div style={{
      backgroundColor: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      overflow: "hidden",
      overflowX: "auto",
    }}>
      {/* Table header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px,2fr) 80px minmax(90px,1fr) minmax(90px,1fr) 52px 80px 90px 64px",
        gap: 6,
        padding: "7px 14px",
        backgroundColor: T.surfaceHigh,
        borderBottom: `1px solid ${T.border}`,
        minWidth: 600,
      }}>
        {[
          { label: "Name",     align: "left"  },
          { label: "Type",     align: "left"  },
          { label: "Total",    align: "left"  },
          { label: "Balance",  align: "left"  },
          { label: "Rate",     align: "right" },
          { label: "Due Date", align: "left"  },
          { label: "Monthly",  align: "left"  },
          { label: "",         align: "left"  },
        ].map((h, i) => (
          <div key={i} style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            textAlign: h.align,
          }}>
            {h.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ minWidth: 600 }}>
        {sorted.map((debt) => (
          <DebtRow
            key={debt.id}
            debt={debt}
            linkedAsset={assets.find(a => a.id === debt.linkedAssetId) || null}
            onChange={onChange}
            onDelete={() => onDelete(debt.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default LiabilitiesList;
