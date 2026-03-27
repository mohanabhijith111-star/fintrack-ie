import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

const T = {
  bg: "#0A0C10",
  surface: "#161820",
  text: "#EEEDF0",
  textDim: "#454760",
  accent: "#F0A03C",
  red: "#E05C5C",
  border: "#252830"
};

function FormInput({ label, error, type = "text", value, onChange, placeholder, required, min, max, step, style: extra = {} }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {label && <label style={{ fontSize: 10, fontWeight: 600, color: T.text, marginBottom: 3, display: "block" }}>{label} {required && <span style={{ color: T.red }}>*</span>}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max} step={step} style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: `1px solid ${error ? T.red : T.border}`, backgroundColor: T.surface, color: T.text, borderRadius: 4, boxSizing: "border-box", ...extra }} />
      {error && <div style={{ fontSize: 10, color: T.red, marginTop: 2 }}><AlertCircle size={10} style={{ display: "inline", marginRight: 4 }} />{error}</div>}
    </div>
  );
}

function FormSelect({ label, value, onChange, children, required, style: extra = {} }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {label && <label style={{ fontSize: 10, fontWeight: 600, color: T.text, marginBottom: 3, display: "block" }}>{label} {required && <span style={{ color: T.red }}>*</span>}</label>}
      <select value={value} onChange={onChange} style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: `1px solid ${T.border}`, backgroundColor: T.surface, color: T.text, borderRadius: 4, boxSizing: "border-box", cursor: "pointer", ...extra }}>
        {children}
      </select>
    </div>
  );
}

export function DebtForm({ assets = [], onSubmit, initialData = null }) {
  const isEditing = !!initialData;
  const [form, setForm] = useState(initialData || { name: "", total: "", balance: "", balanceAsOf: new Date().toISOString().split("T")[0], currency: "EUR", rate: "", knownPayment: "", termMonths: "", dueDate: "", linkedAssetId: "" });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Required";
    if (!form.total || parseFloat(form.total) <= 0) newErrors.total = "> 0";
    if (form.balance < 0) newErrors.balance = "No negative";
    if (!form.rate || parseFloat(form.rate) < 0 || parseFloat(form.rate) > 100) newErrors.rate = "0-100%";
    const termProvided = form.termMonths && parseFloat(form.termMonths) > 0;
    const paymentProvided = form.knownPayment && parseFloat(form.knownPayment) > 0;
    if (!termProvided && !paymentProvided) newErrors.term = "Term or Payment";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div style={{ maxWidth: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
        <FormInput label="Loan Name" error={errors.name} value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. CU Loan" required />
        <FormSelect label="Currency" value={form.currency} onChange={(e) => setForm(p => ({ ...p, currency: e.target.value }))} required>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="USD">USD</option>
        </FormSelect>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <FormInput label="Original Amount" error={errors.total} type="number" value={form.total} onChange={(e) => setForm(p => ({ ...p, total: e.target.value }))} placeholder="0.00" min="0" step="0.01" required />
        <FormInput label="Current Balance" error={errors.balance} type="number" value={form.balance} onChange={(e) => setForm(p => ({ ...p, balance: e.target.value }))} placeholder="0.00" min="0" step="0.01" required />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <FormInput label="Balance Date" type="date" value={form.balanceAsOf} onChange={(e) => setForm(p => ({ ...p, balanceAsOf: e.target.value }))} />
        <FormInput label="Interest Rate %" error={errors.rate} type="number" value={form.rate} onChange={(e) => setForm(p => ({ ...p, rate: e.target.value }))} placeholder="8.5" min="0" max="100" step="0.01" required />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <FormInput label="Term (months)" error={errors.termMonths} type="number" value={form.termMonths} onChange={(e) => setForm(p => ({ ...p, termMonths: e.target.value }))} placeholder="60" min="1" />
        <FormInput label="Known Payment" error={errors.knownPayment} type="number" value={form.knownPayment} onChange={(e) => setForm(p => ({ ...p, knownPayment: e.target.value }))} placeholder="250.00" min="0" step="0.01" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <FormInput label="Next Due Date" type="date" value={form.dueDate} onChange={(e) => setForm(p => ({ ...p, dueDate: e.target.value }))} />
        {assets.length > 0 && (
          <FormSelect label="Link Asset" value={form.linkedAssetId} onChange={(e) => setForm(p => ({ ...p, linkedAssetId: e.target.value }))}>
            <option value="">- None -</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </FormSelect>
        )}
      </div>
      {errors.term && <div style={{ padding: 6, backgroundColor: "rgba(224, 92, 92, 0.1)", borderRadius: 4, color: T.red, fontSize: 11, marginBottom: 8 }}>⚠️ {errors.term}</div>}  
      <button onClick={() => validateForm() && onSubmit(form)} style={{ width: "100%", padding: "8px", fontSize: 12, fontWeight: 600, backgroundColor: T.accent, color: T.bg, border: "none", borderRadius: 4, cursor: "pointer" }}>
        {isEditing ? "✓ Update" : "➕ Add Loan"}
      </button>
    </div>
  );
}

export default DebtForm;
