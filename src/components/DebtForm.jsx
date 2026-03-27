import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const T = { bg: "#0A0C10", sidebar: "#0F1117", surface: "#161820", surfaceHigh: "#1E2028", border: "#252830", text: "#EEEDF0", textDim: "#454760", accent: "#F0A03C", red: "#E05C5C" };

function FormInput({ label, hint, error, type = "text", value, onChange, placeholder, required, min, max, step }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4, display: "block" }}>
        {label} {required && <span style={{ color: T.red }}>*</span>}
      </label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max} step={step} style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: `1px solid ${error ? T.red : T.border}`, backgroundColor: T.surface, color: T.text, borderRadius: 4 }} />
      {hint && <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>💡 {hint}</div>}
      {error && <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}><AlertCircle size={12} /> {error}</div>}
    </div>
  );
}

export function DebtForm({ assets = [], onSubmit, initialData = null }) {
  const [form, setForm] = useState(initialData || { name: "", total: "", balance: "", balanceAsOf: new Date().toISOString().split("T")[0], currency: "EUR", rate: "", knownPayment: "", termMonths: "", dueDate: "", linkedAssetId: "" });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Loan name required";
    if (!form.total || parseFloat(form.total) <= 0) newErrors.total = "Amount > 0";
    if (form.balance < 0) newErrors.balance = "Cannot be negative";
    if (!form.rate || parseFloat(form.rate) < 0 || parseFloat(form.rate) > 100) newErrors.rate = "0-100%";
    const termProvided = form.termMonths && parseFloat(form.termMonths) > 0;
    const paymentProvided = form.knownPayment && parseFloat(form.knownPayment) > 0;
    if (!termProvided && !paymentProvided) newErrors.term = "Term OR payment required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <FormInput label="Loan Name" hint="e.g. CU Share Loan" error={errors.name} value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Loan name" required />
      <FormInput label="Original Amount" hint="Amount borrowed" error={errors.total} type="number" value={form.total} onChange={(e) => setForm(p => ({ ...p, total: e.target.value }))} placeholder="0.00" min="0" step="0.01" required />
      <FormInput label="Current Balance" hint="Amount owed now" error={errors.balance} type="number" value={form.balance} onChange={(e) => setForm(p => ({ ...p, balance: e.target.value }))} placeholder="0.00" min="0" step="0.01" required />
      <FormInput label="Balance Date" hint="When you checked balance" type="date" value={form.balanceAsOf} onChange={(e) => setForm(p => ({ ...p, balanceAsOf: e.target.value }))} />
      <FormInput label="Interest Rate %" hint="Annual rate" error={errors.rate} type="number" value={form.rate} onChange={(e) => setForm(p => ({ ...p, rate: e.target.value }))} placeholder="8.5" min="0" max="100" step="0.01" required />
      <FormInput label="Term (months)" hint="Leave blank if using payment" error={errors.termMonths} type="number" value={form.termMonths} onChange={(e) => setForm(p => ({ ...p, termMonths: e.target.value }))} placeholder="60" min="1" />
      <FormInput label="Known Payment" hint="Regular payment amount" error={errors.knownPayment} type="number" value={form.knownPayment} onChange={(e) => setForm(p => ({ ...p, knownPayment: e.target.value }))} placeholder="250.00" min="0" step="0.01" />
      <FormInput label="Next Due Date" hint="Next payment date" type="date" value={form.dueDate} onChange={(e) => setForm(p => ({ ...p, dueDate: e.target.value }))} />
      {errors.term && <div style={{ color: T.red, fontSize: 12, marginBottom: 12 }}>⚠️ {errors.term}</div>}
      <button onClick={() => validateForm() && onSubmit(form)} style={{ width: "100%", padding: "12px", fontSize: 13, fontWeight: 600, backgroundColor: T.accent, color: T.bg, border: "none", borderRadius: 6, cursor: "pointer" }}>
        {initialData ? "✓ Update" : "➕ Add Loan"}
      </button>
    </div>
  );
}

export default DebtForm;
