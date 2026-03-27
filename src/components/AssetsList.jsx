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

const TYPE_CONFIG = {
  savings:    { label: "Savings",    color: T.blue,   bg: T.blueDim },
  shares:     { label: "CU Shares",  color: T.green,  bg: T.greenDim },
  deposit:    { label: "Deposit",    color: T.accent, bg: T.accentDim },
  investment: { label: "Investment", color: T.purple, bg: T.purpleDim },
  property:   { label: "Property",   color: T.green,  bg: T.greenDim },
  other:      { label: "Asset",      color: T.textMid, bg: T.surfaceHigh },
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other;
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

function AssetRow({ asset, linkedDebts, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: asset.name || "",
    balance: asset.balance || "",
    balanceAsOf: asset.balanceAsOf || today(),
    currency: asset.currency || "EUR",
    rate: asset.rate || "",
    type: asset.type || "savings",
    note: asset.note || "",
  });
  const fld = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

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
    onChange({ ...asset, ...form });
    setEditing(false);
  }

  function cancel() {
    setForm({
      name: asset.name || "",
      balance: asset.balance || "",
      balanceAsOf: asset.balanceAsOf || today(),
      currency: asset.currency || "EUR",
      rate: asset.rate || "",
      type: asset.type || "savings",
      note: asset.note || "",
    });
    setEditing(false);
  }

  return (
    <>
      {/* Compact row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px,2fr) 90px minmax(90px,1fr) 60px minmax(80px,1fr) 64px",
        gap: 8,
        alignItems: "center",
        padding: "9px 14px",
        borderBottom: `1px solid ${T.border}`,
        backgroundColor: editing ? T.surfaceHigh : "transparent",
        transition: "background 0.15s",
      }}
        className="asset-row"
      >
        {/* Name */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {asset.name}
          </div>
          {asset.note && (
            <div style={{ fontSize: 10, color: T.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.note}</div>
          )}
          {linkedDebts && linkedDebts.length > 0 && (
            <div style={{ fontSize: 10, color: T.textDim }}>Secured: {linkedDebts.map(d => d.name).join(", ")}</div>
          )}
        </div>

        {/* Type */}
        <div><TypeBadge type={asset.type} /></div>

        {/* Balance */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{fmt(asset.balance, asset.currency)}</div>
        </div>

        {/* Rate */}
        <div style={{ fontSize: 12, color: T.textMid, textAlign: "right" }}>
          {asset.rate ? `${asset.rate}%` : <span style={{ color: T.textDim }}>—</span>}
        </div>

        {/* Last Updated */}
        <div style={{ fontSize: 11, color: T.textDim }}>
          {asset.balanceAsOf ? dateStr(asset.balanceAsOf) : "—"}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <button
            onClick={() => (editing ? cancel() : setEditing(true))}
            title={editing ? "Cancel edit" : "Edit asset"}
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
            title="Delete asset"
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginBottom: 10 }}>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Asset name</label>
              <input value={form.name} onChange={fld("name")} style={inputStyle} placeholder="e.g. Credit Union Shares" />
            </div>
            <div>
              <label style={labelStyle}>Balance</label>
              <input type="number" value={form.balance} onChange={fld("balance")} placeholder="0.00" style={{ ...inputStyle, marginBottom: 4 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: T.textDim, flexShrink: 0 }}>as of</span>
                <input type="date" value={form.balanceAsOf} onChange={fld("balanceAsOf")} style={{ ...inputStyle, fontSize: 11, padding: "5px 8px" }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={form.currency} onChange={fld("currency")} style={{ ...inputStyle, cursor: "pointer" }}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Rate / Dividend %</label>
              <input type="number" value={form.rate} onChange={fld("rate")} placeholder="e.g. 1.5" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={fld("type")} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="savings">Savings Account</option>
                <option value="shares">Share Account (CU)</option>
                <option value="deposit">Fixed Deposit</option>
                <option value="investment">Investment</option>
                <option value="property">Property</option>
                <option value="other">Other Asset</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Note</label>
              <input value={form.note} onChange={fld("note")} placeholder="Account number etc." style={inputStyle} />
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

export function AssetsList({ assets = [], debts = [], onChange, onDelete }) {
  if (assets.length === 0) return null;

  return (
    <div style={{
      backgroundColor: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      overflow: "hidden",
    }}>
      {/* Table header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px,2fr) 90px minmax(90px,1fr) 60px minmax(80px,1fr) 64px",
        gap: 8,
        padding: "7px 14px",
        backgroundColor: T.surfaceHigh,
        borderBottom: `1px solid ${T.border}`,
      }}>
        {["Name", "Type", "Balance", "Rate", "Updated", ""].map((h, i) => (
          <div key={i} style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            textAlign: i === 3 ? "right" : "left",
          }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      {assets.map((asset) => (
        <AssetRow
          key={asset.id}
          asset={asset}
          linkedDebts={debts.filter(d => d.linkedAssetId === asset.id)}
          onChange={onChange}
          onDelete={() => onDelete(asset.id)}
        />
      ))}
    </div>
  );
}

export default AssetsList;
