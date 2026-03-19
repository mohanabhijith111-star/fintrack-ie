import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { TrendingUp, TrendingDown, AlertCircle, Target, Calendar, DollarSign, Plus, Trash2, ChevronRight, CreditCard, BarChart2, Clock, RefreshCw, Upload, Check, X, ChevronDown, ChevronUp, Search, Settings, Layers } from "lucide-react";

// âââ DESIGN TOKENS âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Palette: warm slate / ivory / amber accent â refined & editorial
const T = {
  bg: "#0E0E10",
  surface: "#18181C",
  surfaceHigh: "#222228",
  border: "#2C2C34",
  borderHover: "#3E3E4A",
  text: "#F0EEE8",
  textMid: "#A09E98",
  textDim: "#5A5856",
  accent: "#C8965A",       // amber gold
  accentDim: "#7A5530",
  green: "#4E9E72",
  greenDim: "#1E4030",
  red: "#B85450",
  redDim: "#3D1C1A",
  blue: "#5078A8",
  blueDim: "#1C2E44",
  purple: "#7E5EA8",
  purpleDim: "#2A1E3C",
};

// âââ CONSTANTS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const CURRENCIES = ["EUR", "INR", "USD", "GBP"];
const getCurrencySymbol = (c) => ({ EUR: "\u20AC", INR: "\u20B9", USD: "$", GBP: "\u00A3" }[c] || c);
const fmt = (n, c = "EUR") => `${getCurrencySymbol(c)}${Number(n || 0).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (n) => Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
const dateStr = (d) => { try { return new Date(d).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };
const today = () => new Date().toISOString().split("T")[0];
const toISO = (d) => { try { return new Date(d).toISOString().split("T")[0]; } catch { return today(); } };

// âââ OVERHEAD CATEGORIES âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const BUILTIN_OVERHEAD_GROUPS = {
  // ââ P&L: Income ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "Income": ["Salary", "Freelance / Contract", "Rental Income", "Investment Returns", "Social Welfare", "Other Income"],
  // ââ P&L: Expenses ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "Housing": ["Rent", "Mortgage", "Home Insurance", "Management Fee", "Repairs & Maintenance"],
  "Motor": ["Car Loan / HP", "Motor Insurance", "Motor Tax", "Fuel", "NCT / Service", "Toll / E-Flow", "Parking"],
  "Health": ["Health Insurance", "Dental", "Pharmacy", "GP / Specialist", "Gym"],
  "Utilities": ["Electricity", "Gas", "Broadband", "Mobile", "Bin Collection", "Water"],
  "Subscriptions": ["Streaming", "Music", "Software / Apps", "News / Magazines"],
  "Food & Grocery": ["Supermarket", "Takeaway / Delivery", "Cafes & Coffee", "Restaurants"],
  "Family": ["Childcare / Creche", "School Fees", "After-School Activities", "Kids Expenses"],
  "Personal": ["Clothing", "Personal Care", "Entertainment", "Gifts", "Holidays"],
  "Work": ["Work Expenses", "Training / Education", "Professional Membership"],
  "Tax": ["Income Tax Payment", "USC", "PRSI", "LPT"],
  // ââ Balance Sheet: Assets âââââââââââââââââââââââââââââââââââââââââââââââââ
  "Assets": [
    "Property Purchase",      // Capital â increases asset
    "Vehicle Purchase",       // Capital â increases asset
    "Equipment Purchase",     // Capital â increases asset
    "Investment Purchase",    // Capital â increases asset
    "Savings Deposit",        // Moves cash to savings â asset
    "Asset Sale",             // Reduces asset, receipt of cash
    "Capital Receipt",        // Other capital inflow
  ],
  // ââ Balance Sheet: Liabilities ââââââââââââââââââââââââââââââââââââââââââââ
  "Liabilities": [
    "Loan Received",          // Money in â creates a liability (not income)
    "Loan Repayment",         // Money out â reduces liability (not expense)
    "Credit Card Payment",    // Reduces credit card liability
    "Mortgage Drawdown",      // Money in â creates mortgage liability
    "Hire Purchase Drawdown", // Money in â creates HP liability
    "Intercompany Transfer",  // Internal transfer â no P&L impact
    "Deposit Received",       // Liability until returned
    "Deposit Refunded",       // Reduces liability
  ],
  // ââ Other âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "Financial": ["Credit Card Min Payment", "Savings Transfer", "AVC / Pension"],
  "Other": ["Bank Charges", "ATM / Cash", "Internal Transfer", "Unknown"],
};

// Accounting type per category â drives correct P&L vs Balance Sheet treatment
const ACCOUNTING_TYPE_MAP = {
  // Income â P&L credit
  "Salary": "income", "Freelance / Contract": "income", "Rental Income": "income",
  "Investment Returns": "income", "Social Welfare": "income", "Other Income": "income",
  "Capital Receipt": "income",
  // Assets â Balance Sheet debit (increases asset)
  "Property Purchase": "asset", "Vehicle Purchase": "asset", "Equipment Purchase": "asset",
  "Investment Purchase": "asset", "Savings Deposit": "asset", "Asset Sale": "asset",
  // Liabilities â Balance Sheet credit (increases liability) or reduces it
  "Loan Received": "liability", "Mortgage Drawdown": "liability",
  "Hire Purchase Drawdown": "liability", "Deposit Received": "liability",
  "Loan Repayment": "liability_reduction", "Credit Card Payment": "liability_reduction",
  "Credit Card Min Payment": "liability_reduction", "Hire Purchase Payment": "liability_reduction",
  "Deposit Refunded": "liability_reduction", "Intercompany Transfer": "transfer",
  "Savings Transfer": "transfer", "Internal Transfer": "transfer",
};
// Liability categories that mean "loan received" â should link to debt tracker
const LOAN_RECEIVED_CATS = new Set(["Loan Received", "Mortgage Drawdown", "Hire Purchase Drawdown"]);
// Liability reduction categories â should reduce debt balance
const LOAN_REPAYMENT_CATS = new Set(["Loan Repayment", "Credit Card Payment", "Credit Card Min Payment"]);

function getAccountingType(category) {
  return ACCOUNTING_TYPE_MAP[category] || (
    Object.keys(BUILTIN_OVERHEAD_GROUPS["Income"] || []).includes(category) ? "income" : "expense"
  );
}

function buildOverheadGroups(customOverheads = []) {
  const merged = {};
  Object.entries(BUILTIN_OVERHEAD_GROUPS).forEach(([g, cs]) => { merged[g] = [...cs]; });
  customOverheads.forEach(({ group, label }) => {
    if (!merged[group]) merged[group] = [];
    if (!merged[group].includes(label)) merged[group].push(label);
  });
  return merged;
}

// Nature: revenue vs capital â kept for P&L split but accounting type takes precedence
const CAPITAL_CATEGORIES = new Set([
  "Property Purchase", "Vehicle Purchase", "Equipment Purchase", "Investment Purchase",
  "Capital Receipt", "Asset Sale", "Investment Returns",
]);
function defaultNature(category) {
  if (LOAN_RECEIVED_CATS.has(category) || LOAN_REPAYMENT_CATS.has(category)) return "balance_sheet";
  return CAPITAL_CATEGORIES.has(category) ? "capital" : "revenue";
}

// Recurring transaction detection
// Groups by normalised description (strips embedded dates/times/terminal refs)
// so "ICT CLIVE HALL 04/03" and "ICT CLIVE HALL 11/03" are treated as the same merchant.
function normaliseDesc(raw) {
  return raw
    .toLowerCase()
    .trim()
    // Strip trailing DD/MM or MM/DD date patterns (e.g. "04/03", "11/03")
    .replace(/\b\d{1,2}\/\d{1,2}\b/g, "")
    // Strip trailing time patterns (e.g. "15:32", "08:30")
    .replace(/\b\d{1,2}:\d{2}\b/g, "")
    // Strip trailing standalone short numbers (terminal/ref, e.g. trailing "4", "1", "123")
    .replace(/\s+\d{1,4}(\s|$)/g, " ")
    // Collapse multiple spaces
    .replace(/\s{2,}/g, " ")
    .trim();
}

function detectRecurring(transactions) {
  const map = {};
  transactions.forEach(tx => {
    const norm = normaliseDesc(tx.description);
    // Group by normalised description + rounded amount (within 10% tolerance handled below)
    const key = norm + "|" + Math.round(tx.amount);
    if (!map[key]) {
      map[key] = {
        description: tx.description, // keep first seen original for display
        normDescription: norm,
        amount: tx.amount,
        isCredit: tx.isCredit,
        dates: [],
      };
    }
    map[key].dates.push(tx.date);
  });

  const results = [];
  Object.values(map).forEach(({ description, normDescription, amount, isCredit, dates }) => {
    if (dates.length < 2) return;
    const sorted = [...dates].sort();
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i - 1]), d2 = new Date(sorted[i]);
      gaps.push(Math.round((d2 - d1) / 86400000));
    }
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const consistent = gaps.every(g => Math.abs(g - avg) < 12);
    if (!consistent) return;
    let recurrence = null;
    if (avg >= 5 && avg <= 9)   recurrence = "weekly";
    else if (avg >= 12 && avg <= 16) recurrence = "fortnightly";
    else if (avg >= 27 && avg <= 34) recurrence = "monthly";
    else if (avg >= 55 && avg <= 70) recurrence = "bimonthly";
    else if (avg >= 85 && avg <= 100) recurrence = "quarterly";
    else if (avg >= 355 && avg <= 375) recurrence = "yearly";
    if (recurrence) {
      // Use the normalised description for display (cleaner)
      const displayDesc = normDescription.replace(/\b(tkn|ict|pos|dd|ct|so)\b\s*/gi, "").trim()
        || description;
      results.push({ description: displayDesc, amount, isCredit, dates: sorted, recurrence, avgGap: Math.round(avg) });
    }
  });
  return results.sort((a, b) => b.dates.length - a.dates.length);
}

const INCOME_CATS = new Set(BUILTIN_OVERHEAD_GROUPS["Income"]);

// âââ IRISH BANK HOLIDAYS 2026 âââââââââââââââââââââââââââââââââââââââââââââââââ
const IE_BANK_HOLIDAYS = new Set(["2026-01-01","2026-02-02","2026-03-17","2026-04-03","2026-04-06","2026-05-04","2026-06-01","2026-08-03","2026-10-26","2026-12-25","2026-12-26"]);
function nextBankDay(ds) {
  let d = new Date(ds + "T12:00:00");
  while (d.getDay() === 0 || d.getDay() === 6 || IE_BANK_HOLIDAYS.has(d.toISOString().split("T")[0])) {
    d = new Date(d.getTime() + 86400000);
  }
  return d.toISOString().split("T")[0];
}

// âââ PAY CALCULATIONS âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const PAY_FREQS = { weekly: 52, fortnightly: 26, monthly: 12 };
const DEFAULT_CREDITS = {
  single:   { personalCredit: 2000, employeeCredit: 2000 },
  married1: { personalCredit: 4000, employeeCredit: 2000 },
  married2: { personalCredit: 4000, employeeCredit: 4000 },
  widowed:  { personalCredit: 2190, employeeCredit: 2000 },
};
const DEFAULT_CUTOFFS = { single: 44000, married1: 53000, married2: 88000, widowed: 44000 };

function calcASC(gross, scheme) {
  const exempt = scheme === "fast" ? 28750 : 34500;
  if (gross <= exempt) return 0;
  const rate1 = scheme === "single" ? 0.0333 : 0.10;
  const rate2 = scheme === "single" ? 0.035 : 0.105;
  if (gross <= 60000) return (gross - exempt) * rate1;
  return (60000 - exempt) * rate1 + (gross - 60000) * rate2;
}

function calcPayroll(salary, tp) {
  const gross = parseFloat(salary) || 0;
  if (!gross) return null;
  const periods = PAY_FREQS[tp.payFrequency] || 26;
  const cutoff = parseFloat(tp.customCutoff) || DEFAULT_CUTOFFS[tp.maritalStatus] || 44000;
  const credits = [tp.personalCredit, tp.employeeCredit, tp.earnedIncomeCredit, tp.homeCarerCredit, tp.singlePersonChildCarerCredit, tp.rentCredit, tp.otherCredits]
    .reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const pension = tp.publicService ? gross * ((parseFloat(tp.pensionRate) || 0) / 100) : 0;
  const asc = tp.publicService ? calcASC(gross, tp.ascScheme || "standard") : 0;
  const taxable = Math.max(0, gross - pension - asc);
  const grossTax = taxable <= cutoff ? taxable * 0.2 : cutoff * 0.2 + (taxable - cutoff) * 0.4;
  const incomeTax = Math.max(0, grossTax - credits);
  let usc = 0;
  if (gross > 13000) {
    if (gross <= 12012) usc = gross * 0.005;
    else if (gross <= 28700) usc = 12012 * 0.005 + (gross - 12012) * 0.02;
    else if (gross <= 70044) usc = 12012 * 0.005 + 16688 * 0.02 + (gross - 28700) * 0.03;
    else usc = 12012 * 0.005 + 16688 * 0.02 + 41344 * 0.03 + (gross - 70044) * 0.08;
  }
  const prsi = gross > 18304 ? gross * 0.042 : 0;
  const afterTaxAnnual = (parseFloat(tp.afterTaxDeduction) || 0) * periods;
  const takeHome = gross - incomeTax - usc - prsi - pension - asc - afterTaxAnnual;
  const per = (v) => v / periods;
  return {
    annualGross: gross, incomeTax, usc, prsi, pension, asc, afterTaxAnnual, takeHome,
    perGross: per(gross), perTax: per(incomeTax), perUSC: per(usc), perPRSI: per(prsi),
    perPension: per(pension), perASC: per(asc), perAfterTax: parseFloat(tp.afterTaxDeduction) || 0,
    perNet: per(takeHome), monthlyNet: takeHome / 12,
    grossTax, taxable, credits, cutoff, periods,
  };
}

function getPaydays(firstDate, freq, count = 13) {
  if (!firstDate) return [];
  const dates = [];
  let d = new Date(firstDate + "T12:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const step = (date) => {
    if (freq === "weekly") return new Date(date.getTime() + 7 * 86400000);
    if (freq === "monthly") { const n = new Date(date); n.setMonth(n.getMonth() + 1); return n; }
    return new Date(date.getTime() + 14 * 86400000);
  };
  while (d < now) d = step(d);
  for (let i = 0; i < count; i++) { dates.push(new Date(d)); d = step(d); }
  return dates;
}

// âââ COMMITTED EXPENSE TYPES ââââââââââââââââââââââââââââââââââââââââââââââââââ
const RECURRENCES = [
  { v: "weekly", l: "Weekly", ppy: 52 },
  { v: "fortnightly", l: "Fortnightly", ppy: 26 },
  { v: "monthly", l: "Monthly", ppy: 12 },
  { v: "bimonthly", l: "Every 2 Months", ppy: 6 },
  { v: "quarterly", l: "Quarterly", ppy: 4 },
  { v: "yearly", l: "Yearly", ppy: 1 },
  { v: "one-time", l: "One-time", ppy: 0 },
];
const COMMITTED_TYPES = [
  { id: "rent", label: "Rent", group: "Housing", rec: "monthly", fixed: true },
  { id: "mortgage", label: "Mortgage", group: "Housing", rec: "monthly", fixed: true },
  { id: "home_ins", label: "Home Insurance", group: "Housing", rec: "yearly", fixed: true },
  { id: "mgmt_fee", label: "Management Fee", group: "Housing", rec: "yearly", fixed: true },
  { id: "car_loan", label: "Car Loan / HP", group: "Motor", rec: "monthly", fixed: true },
  { id: "car_ins", label: "Motor Insurance", group: "Motor", rec: "yearly", fixed: true },
  { id: "motor_tax", label: "Motor Tax", group: "Motor", rec: "yearly", fixed: true },
  { id: "nct", label: "NCT", group: "Motor", rec: "yearly", fixed: true },
  { id: "toll", label: "Toll / E-Flow", group: "Motor", rec: "monthly", fixed: false },
  { id: "health_ins", label: "Health Insurance", group: "Health", rec: "monthly", fixed: true },
  { id: "dental", label: "Dental Plan", group: "Health", rec: "monthly", fixed: true },
  { id: "gym", label: "Gym", group: "Health", rec: "monthly", fixed: true },
  { id: "electricity", label: "Electricity", group: "Utilities", rec: "bimonthly", fixed: false },
  { id: "gas", label: "Gas", group: "Utilities", rec: "bimonthly", fixed: false },
  { id: "broadband", label: "Broadband", group: "Utilities", rec: "monthly", fixed: true },
  { id: "mobile", label: "Mobile", group: "Utilities", rec: "monthly", fixed: true },
  { id: "bins", label: "Bin Collection", group: "Utilities", rec: "monthly", fixed: true },
  { id: "streaming", label: "Streaming", group: "Subscriptions", rec: "monthly", fixed: true },
  { id: "music", label: "Music", group: "Subscriptions", rec: "monthly", fixed: true },
  { id: "software", label: "Software / Apps", group: "Subscriptions", rec: "monthly", fixed: true },
  { id: "loan", label: "Personal Loan", group: "Financial", rec: "monthly", fixed: true },
  { id: "credit_card", label: "Credit Card Min", group: "Financial", rec: "monthly", fixed: true },
  { id: "savings_dd", label: "Savings DD", group: "Financial", rec: "monthly", fixed: true },
  { id: "avc", label: "AVC / Pension", group: "Financial", rec: "monthly", fixed: true },
  { id: "childcare", label: "Childcare / Creche", group: "Family", rec: "monthly", fixed: true },
  { id: "school", label: "School / College Fees", group: "Family", rec: "monthly", fixed: true },
  { id: "union", label: "Trade Union", group: "Memberships", rec: "monthly", fixed: true },
  { id: "professional", label: "Professional Membership", group: "Memberships", rec: "yearly", fixed: true },
  { id: "other_fixed", label: "Other Fixed", group: "Other", rec: "monthly", fixed: true },
  { id: "other_var", label: "Other Variable", group: "Other", rec: "monthly", fixed: false },
];
const COMMITTED_GROUPS = [...new Set(COMMITTED_TYPES.map(t => t.group))];

function projectDates(start, rec, count = 12) {
  if (!start) return [];
  const dates = [];
  let d = new Date(start + "T12:00:00");
  for (let i = 0; i < count; i++) {
    const sched = d.toISOString().split("T")[0];
    const eff = nextBankDay(sched);
    dates.push({ scheduled: sched, effective: eff, shifted: sched !== eff });
    if (rec === "one-time") break;
    if (rec === "weekly") d = new Date(d.getTime() + 7 * 86400000);
    else if (rec === "fortnightly") d = new Date(d.getTime() + 14 * 86400000);
    else if (rec === "monthly") { d = new Date(d); d.setMonth(d.getMonth() + 1); }
    else if (rec === "bimonthly") { d = new Date(d); d.setMonth(d.getMonth() + 2); }
    else if (rec === "quarterly") { d = new Date(d); d.setMonth(d.getMonth() + 3); }
    else if (rec === "yearly") { d = new Date(d); d.setFullYear(d.getFullYear() + 1); }
    else break;
  }
  return dates;
}

// âââ EXCEL PARSER (SheetJS) âââââââââââââââââââââââââââââââââââââââââââââââââââ
async function parseXLSXToTransactions(file) {
  // Dynamically load SheetJS from CDN
  if (!window.XLSX) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const XLSX = window.XLSX;
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  // Use the first sheet
  const ws = wb.Sheets[wb.SheetNames[0]];
  // Convert to array of arrays
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false, dateNF: "yyyy-mm-dd" });
  if (rows.length < 2) return [];
  // Convert to CSV-like text so we can reuse the CSV parser
  // But handle directly here since we have structured data
  const header = rows[0].map(h => (h || "").toString().trim());
  const cols = header.map(h => h.toLowerCase());

  // Find columns - handle PTSB "Money in (â¬)" / "Money out (â¬)" style
  const findCol = (...terms) => {
    for (const t of terms) {
      const i = cols.findIndex(c => c === t || c.includes(t));
      if (i >= 0) return i;
    }
    return -1;
  };

  const dateIdx   = findCol("completed date", "posted date", "value date", "transaction date", "date");
  const descIdx   = findCol("description", "details", "narrative", "particulars", "payee", "merchant", "reference");
  const creditIdx = findCol("money in", "credit", "paid in", "deposits", "in (");
  const debitIdx  = findCol("money out", "debit", "paid out", "withdrawals", "out (");
  const amtIdx    = findCol("amount", "transaction amount", "value");
  const stateIdx  = findCol("state", "status");

  const transactions = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(v => v === null || v === "")) continue;

    // Skip pending
    if (stateIdx >= 0 && row[stateIdx] && String(row[stateIdx]).toUpperCase() === "PENDING") continue;

    // Date
    let parsedDate = today();
    if (dateIdx >= 0 && row[dateIdx]) {
      const raw = String(row[dateIdx]).trim();
      // SheetJS with dateNF outputs YYYY-MM-DD
      const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) parsedDate = m[0];
      else parsedDate = parseDate(raw);
    }

    // Description
    const desc = descIdx >= 0 ? String(row[descIdx] || "").trim() : "";
    if (!desc) continue;

    // Amount
    let amount = 0;
    let isCredit = false;

    if (creditIdx >= 0 && debitIdx >= 0) {
      const cr = parseFloat(String(row[creditIdx] || "").replace(/[^0-9.-]/g, ""));
      const db = parseFloat(String(row[debitIdx] || "").replace(/[^0-9.-]/g, ""));
      if (!isNaN(cr) && cr > 0) { amount = cr; isCredit = true; }
      else if (!isNaN(db) && db !== 0) { amount = Math.abs(db); isCredit = false; }
    } else if (amtIdx >= 0) {
      const raw = parseFloat(String(row[amtIdx] || "").replace(/[^0-9.-]/g, ""));
      if (!isNaN(raw) && raw !== 0) { amount = Math.abs(raw); isCredit = raw > 0; }
    }

    if (amount === 0) continue;

    transactions.push({
      id: "xlsx-" + i + "-" + Date.now() + "-" + Math.random(),
      date: parsedDate,
      description: desc,
      amount,
      isCredit,
      currency: "EUR",
      category: null,
    });
  }
  return transactions;
}



// Properly split a CSV line respecting quoted fields (handles commas inside quotes)
function splitCSVLine(line) {
  const fields = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function parseDate(raw) {
  if (!raw || !raw.trim()) return today();
  const s = raw.trim();
  // Extract just the date part if there's a time component (e.g. "2026-03-01 11:35:25")
  const withTime = s.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (withTime) return withTime[1];
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})$/);
  if (dmy) { const iso = `${dmy[3]}-${dmy[2]}-${dmy[1]}`; const d = new Date(iso); if (!isNaN(d.getTime())) return iso; }
  // MM/DD/YYYY fallback
  const mdy = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (mdy) { const iso = `${mdy[3]}-${mdy[1]}-${mdy[2]}`; const d = new Date(iso); if (!isNaN(d.getTime())) return iso; }
  // Last resort
  try { const d = new Date(s); if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]; } catch {}
  return today();
}

function parseCSVToTransactions(text) {
  const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines = rawLines.filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerFields = splitCSVLine(lines[0]);
  const cols = headerFields.map(c => c.toLowerCase().trim());

  // Exact match first, then partial â prevents "started date" stealing "date" slot
  const findExact = (...candidates) => {
    for (const c of candidates) {
      const i = cols.findIndex(col => col === c);
      if (i >= 0) return i;
    }
    return -1;
  };
  const findPartial = (...candidates) => {
    for (const c of candidates) {
      const i = cols.findIndex(col => col.includes(c));
      if (i >= 0) return i;
    }
    return -1;
  };
  const find = (...candidates) => {
    const e = findExact(...candidates);
    return e >= 0 ? e : findPartial(...candidates);
  };

  // Date: prefer completed/posted date over started/initiated date
  // because completed date = actual bank posting date
  const dateIdx = (() => {
    // Try exact matches for completed/posted first
    const preferred = findExact("completed date", "posted date", "value date", "transaction date", "posting date", "date");
    if (preferred >= 0) return preferred;
    // Partial: completed before started
    const comp = cols.findIndex(col => col.includes("completed") || col.includes("posted") || col.includes("value date"));
    if (comp >= 0) return comp;
    // Any date column
    return cols.findIndex(col => col.includes("date"));
  })();

  // Description â do NOT include "type" (that's transaction type, not payee)
  const descIdx = find("description", "details", "narrative", "particulars", "transaction details", "payee", "merchant", "reference", "info", "memo");

  // Credit / debit separate columns â handle "Money in (â¬)", "Credit", "Paid in" etc.
  const creditIdx = (() => {
    const e = findExact("credit", "money in", "paid in", "in", "deposits");
    if (e >= 0) return e;
    return cols.findIndex(c => (c.includes("money in") || c.includes("paid in") || c.includes("credit")) && !c.includes("out"));
  })();
  const debitIdx = (() => {
    const e = findExact("debit", "money out", "paid out", "out", "withdrawals");
    if (e >= 0) return e;
    return cols.findIndex(c => (c.includes("money out") || c.includes("paid out") || c.includes("debit")) && !c.includes("in"));
  })();

  // Single amount column â but NOT "fee", "balance", "running balance"
  const amtIdx = (() => {
    const exact = findExact("amount", "transaction amount", "value", "eur amount", "net amount");
    if (exact >= 0) return exact;
    const i = cols.findIndex(col => col.includes("amount") && !col.includes("fee") && !col.includes("balance"));
    return i;
  })();

  const balIdx    = find("balance", "running balance");
  const feeIdx    = find("fee", "charges");
  const stateIdx  = findExact("state", "status");
  const typeIdx   = findExact("type");
  const currencyIdx = findExact("currency");

  // Fallback description: longest non-numeric, non-date, non-amount cell
  const skipIdxs = new Set([dateIdx, amtIdx, creditIdx, debitIdx, balIdx, feeIdx, stateIdx, typeIdx].filter(i => i >= 0));
  function guessDescFromRow(row) {
    let best = { idx: -1, len: 0 };
    row.forEach((cell, i) => {
      if (skipIdxs.has(i)) return;
      const isNumeric = /^[\d.,\-\s%]*$/.test(cell);
      const isDate = /\d{4}[-\/]\d{2}/.test(cell) || /\d{2}[-\/]\d{2}[-\/]\d{4}/.test(cell);
      if (!isNumeric && !isDate && cell.length > best.len) best = { idx: i, len: cell.length };
    });
    return best.idx >= 0 ? row[best.idx] : row.filter((_, i) => !skipIdxs.has(i)).join(" ");
  }

  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]);
    if (row.length < 2) continue;

    // Skip PENDING rows (incomplete transactions)
    if (stateIdx >= 0 && row[stateIdx] && row[stateIdx].toUpperCase() === "PENDING") continue;

    const rawDate = dateIdx >= 0 ? row[dateIdx] : row[0];
    const parsedDate = parseDate(rawDate);

    // Build description: primary description column
    let desc = (descIdx >= 0 ? row[descIdx] : guessDescFromRow(row)).trim();

    // For Revolut-style: prefix with Type if it adds context (e.g. "Card Payment", "Topup")
    if (typeIdx >= 0 && typeIdx !== descIdx) {
      const txType = row[typeIdx]?.trim();
      // Only prefix if description doesn't already encode the type
      if (txType && txType !== "Transfer" && !desc.toLowerCase().includes(txType.toLowerCase())) {
        desc = `${desc}`;
      }
    }
    if (!desc) desc = guessDescFromRow(row);

    // Amount
    let amount = 0;
    let isCredit = false;

    if (creditIdx >= 0 && debitIdx >= 0) {
      const cr = parseFloat((row[creditIdx] || "").replace(/[^0-9.-]/g, ""));
      const db = parseFloat((row[debitIdx] || "").replace(/[^0-9.-]/g, ""));
      if (!isNaN(cr) && cr > 0) { amount = cr; isCredit = true; }
      else if (!isNaN(db) && db > 0) { amount = db; isCredit = false; }
    } else if (amtIdx >= 0) {
      const rawAmt = parseFloat((row[amtIdx] || "").replace(/[^0-9.-]/g, ""));
      if (!isNaN(rawAmt) && rawAmt !== 0) { amount = Math.abs(rawAmt); isCredit = rawAmt > 0; }
    }

    if (!desc || amount === 0) continue;

    const currency = (currencyIdx >= 0 ? row[currencyIdx] : "EUR") || "EUR";

    transactions.push({
      id: `csv-${i}-${Date.now()}-${Math.random()}`,
      date: parsedDate,
      description: desc,
      amount,
      isCredit,
      currency: currency.trim() || "EUR",
      category: null,
    });
  }
  return transactions;
}

// âââ AI CATEGORISATION ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
async function categoriseTransactions(transactions, rules) {
  // Apply existing rules first
  const withRules = transactions.map(tx => {
    const matched = applyRules(tx.description, rules);
    return { ...tx, category: matched || tx.category };
  });
  // Batch uncategorised for Claude
  const uncategorised = withRules.filter(tx => !tx.category);
  if (uncategorised.length === 0) return withRules;
  const catList = ALL_CATEGORIES.map(c => c.label).join(", ");
  const txList = uncategorised.slice(0, 40).map((tx, i) => `${i + 1}. "${tx.description}" (${tx.isCredit ? "credit" : "debit"} ${fmt(tx.amount)})`).join("\n");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: "You are categorising Irish bank transactions. For each transaction below, return ONLY a JSON array of objects with \"index\" (1-based) and \"category\" (exact match from the list) and \"isIncome\" (boolean).\nCategories: " + catList + "\nTransactions:\n" + txList + "\nReturn ONLY valid JSON array, no markdown.",
        }],
      })
    });
    const data = await res.json();
    const text = (data.content || []).find(b => b.type === "text")?.text || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const result = [...withRules];
    parsed.forEach(({ index, category }) => {
      const tx = uncategorised[index - 1];
      if (tx) {
        const rIdx = result.findIndex(r => r.id === tx.id);
        if (rIdx >= 0) result[rIdx] = { ...result[rIdx], category, aiSuggested: true };
      }
    });
    return result;
  } catch {
    return withRules;
  }
}

function applyRules(description, rules) {
  const desc = description.toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some(kw => desc.includes(kw.toLowerCase()))) return rule.category;
  }
  return null;
}

// âââ UI PRIMITIVES ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const S = {
  card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 },
  cardHigh: { background: T.surfaceHigh, border: `1px solid ${T.border}`, borderRadius: 12 },
  input: {
    background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
    color: T.text, fontFamily: "inherit", fontSize: 13, padding: "8px 12px", width: "100%", outline: "none",
  },
  label: { fontSize: 11, color: T.textMid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 },
  btn: {
    primary: { background: T.accent, color: "#0E0E10", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
    ghost: { background: "transparent", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
    danger: { background: T.redDim, color: T.red, border: `1px solid ${T.red}40`, borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
    success: { background: T.greenDim, color: T.green, border: `1px solid ${T.green}40`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  },
};

function Field({ label, children }) {
  return (
    <div>
      {label && <label style={S.label}>{label}</label>}
      {children}
    </div>
  );
}

function Input({ label, style: extra = {}, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <input {...props}
        style={{ ...S.input, borderColor: focused ? T.accent : T.border, ...extra }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Field>
  );
}

function Select({ label, children, style: extra = {}, ...props }) {
  return (
    <Field label={label}>
      <select {...props} style={{ ...S.input, borderColor: T.border, cursor: "pointer", ...extra }}>
        {children}
      </select>
    </Field>
  );
}

function Btn({ children, variant = "primary", style: extra = {}, ...props }) {
  return <button {...props} style={{ ...S.btn[variant], ...extra }}>{children}</button>;
}

function Badge({ children, color = "accent" }) {
  const colors = {
    accent: { bg: T.accentDim + "60", text: T.accent },
    green: { bg: T.greenDim, text: T.green },
    red: { bg: T.redDim, text: T.red },
    blue: { bg: T.blueDim, text: T.blue },
    dim: { bg: T.surfaceHigh, text: T.textMid },
    purple: { bg: T.purpleDim, text: T.purple },
  };
  const c = colors[color] || colors.dim;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function MiniBar({ pct, color = "accent" }) {
  const colors = { accent: T.accent, green: T.green, red: T.red };
  return (
    <div style={{ background: T.border, borderRadius: 4, height: 4, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: colors[color] || T.accent, borderRadius: 4, transition: "width 0.4s ease" }} />
    </div>
  );
}

function StatCard({ label, value, sub, color = "text", trend }) {
  const colors = { text: T.text, green: T.green, red: T.red, accent: T.accent, dim: T.textMid };
  return (
    <div style={{ ...S.card, padding: "16px 20px" }}>
      <div style={{ fontSize: 11, color: T.textMid, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colors[color] || T.text, fontFamily: "inherit", letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.textDim, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${T.border}`, margin: "16px 0" }} />;
}

// âââ CATEGORY COMBO ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Free-text input with datalist suggestions from existing overheads.
// Typing a new value creates it as a custom overhead automatically.
function CategoryCombo({ value, onChange, overheadGroups, onNewCategory, placeholder, style: extra = {} }) {
  const OG = overheadGroups || BUILTIN_OVERHEAD_GROUPS;
  const allCats = Object.entries(OG).flatMap(([g, cs]) => cs.map(c => ({ g, c })));
  const listId = "cat-" + (OG ? Object.keys(OG).length : 0);
  const [inputVal, setInputVal] = useState(value || "");
  const [focused, setFocused] = useState(false);
  const prevValueRef = useRef(value);

  // When parent value changes externally (e.g. backfill from another row),
  // sync the display â but only when not focused so we don't clobber active typing
  if (prevValueRef.current !== value) {
    prevValueRef.current = value;
    if (!focused) {
      setInputVal(value || "");
    }
  }

  function handleChange(e) {
    const v = e.target.value;
    setInputVal(v);
    const exact = allCats.find(({ c }) => c.toLowerCase() === v.toLowerCase());
    if (exact) onChange(exact.c);
  }

  function handleBlur() {
    setFocused(false);
    const v = inputVal.trim();
    if (!v) { onChange(""); return; }
    const exact = allCats.find(({ c }) => c.toLowerCase() === v.toLowerCase());
    if (exact) {
      onChange(exact.c);
    } else {
      onChange(v);
      if (onNewCategory) onNewCategory(v);
    }
  }

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <input
        list={listId}
        value={inputVal}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder || "Type or select category..."}
        style={{ ...S.input, fontSize: 11, padding: "5px 8px", borderColor: value ? T.border : T.accent + "80", ...extra }}
      />
      <datalist id={listId}>
        {allCats.map(({ g, c }) => (
          <option key={g + c} value={c}>{g}: {c}</option>
        ))}
      </datalist>
    </div>
  );
}


// ─── GOOGLE DRIVE SYNC ────────────────────────────────────────────────────────
const GDRIVE_CLIENT_ID = '746587088287-p2rdrcg501p2gv1erfdttpvukihcur63.apps.googleusercontent.com';
const GDRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const GDRIVE_FILE_NAME = 'fintrack-ie-data.json';
const LS_KEYS = ['ft_transactions','ft_committed','ft_debts','ft_assets','ft_rules','ft_customOverheads','ft_salary','ft_firstPayday','ft_taxProfile','ft_budgets'];

function loadGoogleIdentity() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function getAccessToken() {
  await loadGoogleIdentity();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CLIENT_ID,
      scope: GDRIVE_SCOPES,
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

async function findOrCreateFile(token) {
  // Search in appDataFolder
  const q = encodeURIComponent(`name='${GDRIVE_FILE_NAME}' and trashed=false`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json();
  if (data.files && data.files.length > 0) return data.files[0].id;
  // Create new file
  const meta = { name: GDRIVE_FILE_NAME, parents: ['appDataFolder'] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', new Blob(['{}'], { type: 'application/json' }));
  const cr = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form
  });
  const created = await cr.json();
  return created.id;
}

async function saveToGDrive(token) {
  const fileId = await findOrCreateFile(token);
  const data = {};
  LS_KEYS.forEach(k => { try { const v = localStorage.getItem(k); if (v) data[k] = v; } catch {} });
  data['_savedAt'] = new Date().toISOString();
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name: GDRIVE_FILE_NAME })], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: form
  });
  return data['_savedAt'];
}

async function loadFromGDrive(token) {
  const fileId = await findOrCreateFile(token);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!r.ok) return null;
  const data = await r.json();
  if (!data || Object.keys(data).length <= 1) return null; // only _savedAt or empty
  LS_KEYS.forEach(k => { try { if (data[k]) localStorage.setItem(k, data[k]); } catch {} });
  return data['_savedAt'] || 'unknown time';
}

function DriveSync() {
  const [status, setStatus] = useState('idle'); // idle | syncing | saved | loaded | error
  const [lastSync, setLastSync] = useState(() => {
    try { return localStorage.getItem('ft_lastDriveSync') || null; } catch { return null; }
  });
  const [token, setToken] = useState(null);
  const [msg, setMsg] = useState('');

  const signIn = async () => {
    try {
      setStatus('syncing');
      setMsg('Signing in...');
      const t = await getAccessToken();
      setToken(t);
      setMsg('Loading from Drive...');
      const savedAt = await loadFromGDrive(t);
      if (savedAt) {
        const ts = new Date(savedAt).toLocaleString('en-IE');
        setLastSync(ts);
        localStorage.setItem('ft_lastDriveSync', ts);
        setStatus('loaded');
        setMsg('Data loaded! Refreshing...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setStatus('saved');
        setMsg('No existing data found — will save on next change.');
      }
    } catch (e) {
      setStatus('error');
      setMsg('Sign-in failed. Try again.');
      setTimeout(() => { setStatus('idle'); setMsg(''); }, 3000);
    }
  };

  const save = async () => {
    try {
      setStatus('syncing');
      setMsg('Saving to Drive...');
      const t = token || await getAccessToken();
      if (!token) setToken(t);
      const savedAt = await saveToGDrive(t);
      const ts = new Date(savedAt).toLocaleString('en-IE');
      setLastSync(ts);
      localStorage.setItem('ft_lastDriveSync', ts);
      setStatus('saved');
      setMsg('Saved to your Google Drive!');
      setTimeout(() => { setStatus('idle'); setMsg(''); }, 3000);
    } catch (e) {
      setStatus('error');
      setMsg('Save failed. Try again.');
      setTimeout(() => { setStatus('idle'); setMsg(''); }, 3000);
    }
  };

  const colors = { idle: T.textDim, syncing: T.accent, saved: T.green, loaded: T.green, error: T.red };
  const c = colors[status] || T.textDim;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {msg && <span style={{ fontSize: 11, color: c }}>{msg}</span>}
      {lastSync && !msg && <span style={{ fontSize: 10, color: T.textDim }}>Synced {lastSync}</span>}
      {!token ? (
        <button onClick={signIn} disabled={status === 'syncing'}
          style={{ ...S.btn.ghost, fontSize: 11, padding: '5px 10px', gap: 4, opacity: status === 'syncing' ? 0.6 : 1 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Sync Drive
        </button>
      ) : (
        <button onClick={save} disabled={status === 'syncing'}
          style={{ ...S.btn.ghost, fontSize: 11, padding: '5px 10px', gap: 4, opacity: status === 'syncing' ? 0.6 : 1, borderColor: T.green + '60', color: T.green }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Save
        </button>
      )}
    </div>
  );
}


const TABS = [
  { id: "dashboard", label: "Overview", icon: BarChart2 },
  { id: "transactions", label: "Transactions", icon: Layers },
  { id: "budgeting", label: "Budgeting", icon: Target },
  { id: "committed", label: "Committed", icon: Calendar },
  { id: "debt", label: "Debt", icon: CreditCard },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
];

// âââ MAIN APP âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function App() {
  // Navigation
  const [tab, setTab] = useState("dashboard");

  // Core data â persisted to localStorage
  const [transactions, setTransactions] = useState(() => { try { return JSON.parse(localStorage.getItem("ft_transactions") || "[]"); } catch { return []; } });
  const [committed, setCommitted] = useState(() => { try { return JSON.parse(localStorage.getItem("ft_committed") || "[]"); } catch { return []; } });
  const [debts, setDebts] = useState(() => { try { return JSON.parse(localStorage.getItem("ft_debts") || "[]"); } catch { return []; } });
  const [assets, setAssets] = useState(() => { try { return JSON.parse(localStorage.getItem("ft_assets") || "[]"); } catch { return []; } });
  const [rules, setRules] = useState(() => { try { return JSON.parse(localStorage.getItem("ft_rules") || "[]"); } catch { return []; } });
  const [customOverheads, setCustomOverheads] = useState(() => { try { return JSON.parse(localStorage.getItem("ft_customOverheads") || "[]"); } catch { return []; } });
  const [recurringAlerts, setRecurringAlerts] = useState([]);
  const [loanPrompt, setLoanPrompt] = useState(null); // {tx, type: "received"|"repayment"} // detected recurring patterns

  // Computed overhead groups (built-ins + custom)
  const OVERHEAD_GROUPS = useMemo(() => buildOverheadGroups(customOverheads), [customOverheads]);
  const ALL_CATEGORIES = useMemo(() => Object.entries(OVERHEAD_GROUPS).flatMap(([g, cs]) => cs.map(c => ({ group: g, label: c }))), [OVERHEAD_GROUPS]);
  // ââ Persist to localStorage on every change âââââââââââââââââââââââââââââââââ
  useEffect(() => { try { localStorage.setItem("ft_transactions", JSON.stringify(transactions)); } catch {} }, [transactions]);
  useEffect(() => { try { localStorage.setItem("ft_committed", JSON.stringify(committed)); } catch {} }, [committed]);
  useEffect(() => { try { localStorage.setItem("ft_debts", JSON.stringify(debts)); } catch {} }, [debts]);
  useEffect(() => { try { localStorage.setItem("ft_assets", JSON.stringify(assets)); } catch {} }, [assets]);
  useEffect(() => { try { localStorage.setItem("ft_rules", JSON.stringify(rules)); } catch {} }, [rules]);
  useEffect(() => { try { localStorage.setItem("ft_customOverheads", JSON.stringify(customOverheads)); } catch {} }, [customOverheads]);
  const [importQueue, setImportQueue] = useState([]); // transactions waiting to be confirmed
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef();

  // Payroll â pre-filled with mock PAYE data
  const [salary, setSalary] = useState(() => { try { return localStorage.getItem("ft_salary") || ""; } catch(e) { return ""; } });
  const [firstPayday, setFirstPayday] = useState(() => { try { return localStorage.getItem("ft_firstPayday") || ""; } catch(e) { return ""; } });
  const [taxProfile, setTaxProfile] = useState(() => {
    try { const s = localStorage.getItem("ft_taxProfile"); if (s) return JSON.parse(s); } catch {}
    return { maritalStatus: "single", customCutoff: "", payFrequency: "fortnightly", personalCredit: 2000, employeeCredit: 2000, earnedIncomeCredit: 0, homeCarerCredit: 0, singlePersonChildCarerCredit: 0, rentCredit: 0, otherCredits: 0, publicService: false, pensionRate: 6.5, ascScheme: "standard", afterTaxDeduction: 0 };
  });
  const [paydaysAdded, setPaydaysAdded] = useState(false);

  useEffect(() => { try { localStorage.setItem("ft_salary", salary); } catch {} }, [salary]);
  useEffect(() => { try { localStorage.setItem("ft_firstPayday", firstPayday); } catch {} }, [firstPayday]);
  useEffect(() => { try { localStorage.setItem("ft_taxProfile", JSON.stringify(taxProfile)); } catch {} }, [taxProfile]);


  // Committed form
  const [commitForm, setCommitForm] = useState({ typeId: "rent", name: "", amount: "", currency: "EUR", startDate: today(), recurrence: "monthly", isFixed: true, note: "" });
  const [showProjectId, setShowProjectId] = useState(null);

  // Debt form
  const [debtForm, setDebtForm] = useState({ name: "", total: "", balance: "", balanceAsOf: today(), currency: "EUR", rate: "", termMonths: "", dueDate: "", type: "loan", linkedAssetId: "" });
  const [assetForm, setAssetForm] = useState({ name: "", balance: "", balanceAsOf: today(), currency: "EUR", rate: "", type: "savings", note: "" });

  // Transaction filters
  const [txFilter, setTxFilter] = useState("all"); // all | income | expense | uncat
  const [txSearch, setTxSearch] = useState("");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");

  // Computed
  const payroll = useMemo(() => calcPayroll(salary, taxProfile), [salary, taxProfile]);

  const nextPayday = useMemo(() => {
    if (!firstPayday) return null;
    return getPaydays(firstPayday, taxProfile.payFrequency, 1)[0] || null;
  }, [firstPayday, taxProfile.payFrequency]);

  const totalsByCurrency = useMemo(() => {
    const res = {};
    transactions.forEach(tx => {
      if (!res[tx.currency]) res[tx.currency] = { income: 0, expense: 0 };
      if (tx.isCredit) res[tx.currency].income += tx.amount;
      else res[tx.currency].expense += tx.amount;
    });
    return res;
  }, [transactions]);

  const eurTotals = totalsByCurrency["EUR"] || { income: 0, expense: 0 };

  const committedMonthly = useMemo(() => {
    return committed.filter(c => c.currency === "EUR").reduce((sum, c) => {
      const r = RECURRENCES.find(r => r.v === c.recurrence);
      return sum + (parseFloat(c.amount) || 0) * (r?.ppy || 0) / 12;
    }, 0);
  }, [committed]);

  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      if (txFilter === "income" && !tx.isCredit) return false;
      if (txFilter === "expense" && tx.isCredit) return false;
      if (txFilter === "uncat" && tx.category) return false;
      if (txSearch && !tx.description.toLowerCase().includes(txSearch.toLowerCase())) return false;
      if (txDateFrom && tx.date < txDateFrom) return false;
      if (txDateTo && tx.date > txDateTo) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, txFilter, txSearch, txDateFrom, txDateTo]);

  const timeline60 = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const end = new Date(now.getTime() + 60 * 86400000);
    const events = [];
    if (firstPayday && payroll) {
      getPaydays(firstPayday, taxProfile.payFrequency, 20).forEach(d => {
        if (d >= now && d <= end) events.push({ date: d, label: "Payday (PAYE)", amount: payroll.perNet, currency: "EUR", type: "income" });
      });
    }
    const recurringIncome = detectRecurring(transactions.filter(tx => tx.isCredit && !tx.isPAYE));
    recurringIncome.forEach(({ description, amount, recurrence, dates }) => {
      if (!dates.length) return;
      let next = new Date(dates[dates.length - 1] + "T12:00:00");
      for (let i = 0; i < 20; i++) {
        if (recurrence === "weekly") next = new Date(next.getTime() + 7 * 86400000);
        else if (recurrence === "fortnightly") next = new Date(next.getTime() + 14 * 86400000);
        else if (recurrence === "monthly") { next = new Date(next); next.setMonth(next.getMonth() + 1); }
        else if (recurrence === "bimonthly") { next = new Date(next); next.setMonth(next.getMonth() + 2); }
        else if (recurrence === "quarterly") { next = new Date(next); next.setMonth(next.getMonth() + 3); }
        else if (recurrence === "yearly") { next = new Date(next); next.setFullYear(next.getFullYear() + 1); }
        else break;
        if (next > end) break;
        if (next >= now) events.push({ date: new Date(next), label: description, amount, currency: "EUR", type: "income" });
      }
    });
    committed.forEach(ce => {
      const dates = projectDates(ce.startDate, ce.recurrence, 60);
      dates.forEach(({ effective, shifted, scheduled }) => {
        const d = new Date(effective + "T12:00:00");
        if (d >= now && d <= end) events.push({ date: d, label: ce.name + (shifted ? ` (moved from ${scheduled})` : ""), amount: parseFloat(ce.amount), currency: ce.currency, type: "bill", shifted });
      });
    });
    debts.forEach(dbt => {
      if (dbt.dueDate) {
        const d = new Date(dbt.dueDate + "T12:00:00");
        if (d >= now && d <= end) {
          const pmt = parseFloat(dbt.knownPayment) || calcPMT(parseFloat(dbt.balance), parseFloat(dbt.rate), parseInt(dbt.termMonths), dbt.paymentFrequency || "monthly") || 0;
          events.push({ date: d, label: dbt.name + " repayment", amount: pmt, currency: dbt.currency, type: "debt" });
        }
      }
    });
    return events.sort((a, b) => a.date - b.date);
  }, [firstPayday, payroll, taxProfile.payFrequency, transactions, committed, debts]);

  // ââ Actions ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  function addManualTx(tx) {
    const newTx = {
      id: Date.now().toString(),
      nature: tx.nature || defaultNature(tx.category),
      ...tx,
    };

    // Create/update rule first
    if (tx.category && tx.description) {
      const kw = tx.description.split(" ").slice(0, 3).join(" ").toLowerCase().trim();
      if (kw.length > 2) {
        setRules(prev => {
          const existing = prev.findIndex(r => r.keywords.some(k => k === kw));
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = { ...next[existing], category: tx.category };
            return next;
          }
          return [...prev, { id: Date.now().toString(), keywords: [kw], category: tx.category, created: today() }];
        });
        // Single setTransactions â prepend new tx AND backfill ALL matching in one pass
        setTransactions(prev => [
          newTx,
          ...prev.map(t =>
            t.description.toLowerCase().includes(kw)
              ? { ...t, category: tx.category, nature: newTx.nature }
              : t
          ),
        ]);
        return;
      }
    }
    // No category or keyword â just prepend
    setTransactions(prev => [newTx, ...prev]);
  }

  function updateTxCategory(id, category) {
    const nature = defaultNature(category);
    const kw = (() => {
      // Get the keyword from the transaction description
      const tx = transactions.find(t => t.id === id);
      if (!tx) return null;
      const k = tx.description.split(" ").slice(0, 3).join(" ").toLowerCase().trim();
      return k.length > 2 ? k : null;
    })();

    // Update rule first (separate state, no nesting issue)
    if (kw) {
      setRules(prev => {
        const existing = prev.findIndex(r => r.keywords.some(k => k === kw));
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { ...next[existing], category };
          return next;
        }
        return [...prev, { id: Date.now().toString(), keywords: [kw], category, created: today() }];
      });
    }

    // Single setTransactions call â update target tx AND backfill ALL with same description
    setTransactions(prev => prev.map(tx => {
      if (tx.id === id) return { ...tx, category, nature };
      // Apply to ALL transactions with matching description (not just uncategorised)
      // This ensures filtered searches categorise all matching rows at once
      if (kw && tx.description.toLowerCase().includes(kw)) return { ...tx, category, nature };
      return tx;
    }));

    // Liability prompts â sum ALL matching transactions (target + backfilled)
    if (LOAN_RECEIVED_CATS.has(category) || LOAN_REPAYMENT_CATS.has(category)) {
      const targetTx = transactions.find(t => t.id === id);
      if (targetTx) {
        // Collect all transactions that match this description (same ones that got backfilled)
        const allMatching = kw
          ? transactions.filter(t => t.id === id || t.description.toLowerCase().includes(kw))
          : [targetTx];
        const totalAmount = allMatching.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const aggregatedTx = { ...targetTx, amount: totalAmount, category, nature };

        if (LOAN_RECEIVED_CATS.has(category)) {
          setLoanPrompt({ tx: aggregatedTx, type: "received", count: allMatching.length });
        } else {
          setLoanPrompt({ tx: aggregatedTx, type: "repayment", count: allMatching.length });
        }
      }
    }
  }

  // Build a dedup key from date + description (normalised)
  function dedupKey(tx) {
    return (tx.date || "") + "|" + (tx.description || "").toLowerCase().trim();
  }

  async function handleFileUpload(file) {
    setImporting(true);
    setImportMsg("Reading file...");
    try {
      const name = file.name.toLowerCase();
      let parsed = [];

      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        setImportMsg("Reading Excel file...");
        parsed = await parseXLSXToTransactions(file);
      } else if (name.endsWith(".csv") || name.endsWith(".txt")) {
        const text = await file.text();
        setImportMsg("Parsing CSV...");
        parsed = parseCSVToTransactions(text);
      } else {
        setImportMsg("Please upload a CSV or Excel (.xlsx) file.");
        setImporting(false);
        return;
      }

      if (parsed.length === 0) {
        setImportMsg("No transactions found. Check the file has Date, Description, and Amount columns.");
        setImporting(false);
        return;
      }

      // Deduplicate against already-recorded transactions by date + description
      const existingKeys = new Set(transactions.map(dedupKey));
      const fresh = parsed.filter(tx => !existingKeys.has(dedupKey(tx)));
      const dupeCount = parsed.length - fresh.length;

      if (fresh.length === 0) {
        setImportMsg("All " + parsed.length + " transactions already recorded â nothing new to import.");
        setImporting(false);
        return;
      }

      // Apply saved rules
      const withRules = fresh.map(tx => ({
        ...tx,
        category: applyRules(tx.description, rules) || null,
      }));

      setImportQueue(withRules);
      const msg = withRules.length + " new transactions ready for review" +
        (dupeCount > 0 ? " (" + dupeCount + " duplicate" + (dupeCount > 1 ? "s" : "") + " skipped)" : "") + ".";
      setImportMsg(msg);
    } catch (e) {
      setImportMsg("Error: " + (e.message || "Could not read file."));
    }
    setImporting(false);
  }

  function confirmImport() {
    const existingKeys = new Set(transactions.map(dedupKey));
    const toAdd = importQueue
      .filter(tx => !existingKeys.has(dedupKey(tx)))
      .map(tx => ({
        ...tx,
        id: tx.id || Date.now().toString() + Math.random(),
        nature: tx.nature || defaultNature(tx.category),
      }));

    const nextTransactions = [...toAdd, ...transactions];
    setTransactions(nextTransactions);

    // Extract rules from categorised items
    const newRules = [];
    toAdd.forEach(tx => {
      if (tx.category) {
        const kw = tx.description.split(" ").slice(0, 3).join(" ").toLowerCase().trim();
        if (kw.length > 2 && !rules.some(r => r.keywords.includes(kw))) {
          newRules.push({ id: Date.now().toString() + Math.random(), keywords: [kw], category: tx.category, created: today() });
        }
      }
    });
    if (newRules.length > 0) setRules(prev => [...prev, ...newRules]);

    // Detect recurring patterns in full transaction set
    const recurring = detectRecurring(nextTransactions.filter(tx => !tx.isCredit));
    const committedDescs = new Set(committed.map(c => c.name.toLowerCase().trim()));
    const newAlerts = recurring.filter(r =>
      !committedDescs.has(r.description.toLowerCase().trim()) &&
      r.dates.length >= 2
    );
    if (newAlerts.length > 0) setRecurringAlerts(newAlerts);

    setImportQueue([]);
    setImportMsg(toAdd.length + " transactions added.");
    setTab("transactions");
  }

  function addCommitted() {
    if (!commitForm.amount) return;
    const typeInfo = COMMITTED_TYPES.find(t => t.id === commitForm.typeId);
    setCommitted(prev => [...prev, {
      id: Date.now().toString(),
      typeId: commitForm.typeId,
      name: commitForm.name || typeInfo?.label || commitForm.typeId,
      group: typeInfo?.group || "Other",
      amount: commitForm.amount,
      currency: commitForm.currency,
      startDate: commitForm.startDate,
      recurrence: commitForm.recurrence,
      isFixed: commitForm.isFixed,
      note: commitForm.note,
    }]);
    setCommitForm(p => ({ ...p, name: "", amount: "", note: "" }));
  }

  function addDebt() {
    if (!debtForm.name || !debtForm.balance) return;
    setDebts(prev => [...prev, {
      id: Date.now().toString(),
      name: debtForm.name,
      total: debtForm.total || debtForm.balance,
      balance: debtForm.balance,
      balanceAsOf: debtForm.balanceAsOf || today(),
      currency: debtForm.currency,
      rate: debtForm.rate,
      termMonths: debtForm.termMonths || (debtForm.knownPayment && debtForm.rate
        ? (calcTermFromPayment(parseFloat(debtForm.balance), parseFloat(debtForm.rate), parseFloat(debtForm.knownPayment), debtForm.paymentFrequency || "monthly") || "").toString()
        : ""),
      paymentFrequency: debtForm.paymentFrequency || "monthly",
      knownPayment: debtForm.knownPayment || "",
      dueDate: debtForm.dueDate,
      type: debtForm.type || "loan",
      linkedAssetId: debtForm.linkedAssetId || null,
      paymentHistory: [],
    }]);
    setDebtForm({ name: "", total: "", balance: "", balanceAsOf: today(), currency: "EUR", rate: "", termMonths: "", dueDate: "", type: "loan", linkedAssetId: "" });
  }

  function addAsset() {
    if (!assetForm.name || !assetForm.balance) return;
    setAssets(prev => [...prev, {
      id: Date.now().toString(),
      name: assetForm.name,
      balance: assetForm.balance,
      balanceAsOf: assetForm.balanceAsOf || today(),
      currency: assetForm.currency,
      rate: assetForm.rate,
      type: assetForm.type || "savings",
      note: assetForm.note,
    }]);
    setAssetForm({ name: "", balance: "", balanceAsOf: today(), currency: "EUR", rate: "", type: "savings", note: "" });
  }

  function setupPaydays() {
    if (!payroll || !firstPayday) return;
    const freq = taxProfile.payFrequency;
    const count = freq === "weekly" ? 26 : freq === "monthly" ? 6 : 13;
    const dates = getPaydays(firstPayday, freq, count);
    const newTxs = dates.map(d => ({
      id: `payday-${d.toISOString()}`,
      date: d.toISOString().split("T")[0],
      description: "Salary (PAYE)",
      amount: payroll.perNet,
      isCredit: true,
      currency: "EUR",
      category: "Salary",
      isPAYE: true,
    }));
    setTransactions(prev => [...prev.filter(t => !t.isPAYE), ...newTxs]);
    setPaydaysAdded(true);
  }

  // ââ RENDER ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  return (
    <div style={{ fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace", background: T.bg, minHeight: "100vh", color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        select option { background: ${T.surface}; color: ${T.text}; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
        .hn { font-family: 'Syne', sans-serif; }
        .tab-pill:hover { background: ${T.surfaceHigh} !important; color: ${T.text} !important; }
        .row-hover:hover { background: ${T.surfaceHigh} !important; }
        /* Responsive two-col: stacks below 600px */
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) {
          .two-col { grid-template-columns: 1fr !important; }
          .hide-mobile { display: none !important; }
          .pad-page { padding: 14px 12px !important; }
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Viewport meta injected for mobile zoom fix */}
      {(() => { try { if (!document.querySelector('meta[name=viewport]')) { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, maximum-scale=1'; document.head.appendChild(m); } } catch(e){} return null; })()}

      {/* ââ TOP BAR ââ */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, paddingBottom: 8 }}>
            <span className="hn" style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.03em", flexShrink: 0 }}>
              Fin<span style={{ color: T.accent }}>Track</span> <span style={{ color: T.textDim, fontWeight: 600, fontSize: 13 }}>IE</span>
            </span>
            {nextPayday && payroll && (
              <div style={{ textAlign: "right", minWidth: 0 }}>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Next pay</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.accent, whiteSpace: "nowrap" }}>{dateStr(nextPayday)} Â· {fmt(payroll.perNet)}</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10 }}>
            <div style={{ display: "flex", gap: 2, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", flex: 1 }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} className="tab-pill" onClick={() => setTab(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400, whiteSpace: "nowrap", background: active ? T.accent : "transparent", color: active ? "#0E0E10" : T.textMid, fontFamily: "inherit", flexShrink: 0 }}>
                  <Icon size={11} />
                  {t.label}
                  {t.id === "transactions" && importQueue.length > 0 && (
                    <span style={{ background: T.red, color: "#fff", borderRadius: 8, padding: "0 5px", fontSize: 9, fontWeight: 700 }}>{importQueue.length}</span>
                  )}
                </button>
              );
            })}
            </div>
            <DriveSync />
          </div>
        </div>
      </div>

      <div className="pad-page" style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 14px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ââ DASHBOARD ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        {tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* KPI row â 2 cols on mobile, auto-fit on desktop */}
            <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <StatCard label="EUR Income" value={fmt(eurTotals.income)} color="green" />
              <StatCard label="EUR Expenses" value={fmt(eurTotals.expense)} color="red" />
              <StatCard label="Net Cash Flow" value={fmt(eurTotals.income - eurTotals.expense)} color={eurTotals.income - eurTotals.expense >= 0 ? "green" : "red"} />
              <StatCard label="Committed /mo" value={fmt(committedMonthly)} color="accent" />
              {payroll && <StatCard label="Fortnightly Net" value={fmt(payroll.perNet)} color="text" sub={fmt(payroll.takeHome) + " /yr"} />}
              <StatCard label="Uncategorised" value={transactions.filter(t => !t.category).length} color={transactions.filter(t => !t.category).length > 0 ? "accent" : "dim"} sub="transactions" />
            </div>

            {/* Two column â stacks on mobile */}
            <div className="two-col">
              {/* Spending by category */}
              <div style={{ ...S.card, padding: 20 }}>
                <div className="hn" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: T.text }}>Spending by Category</div>
                {(() => {
                  const catSpend = {};
                  transactions.filter(tx => !tx.isCredit && tx.category).forEach(tx => {
                    catSpend[tx.category] = (catSpend[tx.category] || 0) + tx.amount;
                  });
                  const sorted = Object.entries(catSpend).sort((a, b) => b[1] - a[1]).slice(0, 8);
                  const total = sorted.reduce((s, [, v]) => s + v, 0);
                  if (sorted.length === 0) return <div style={{ color: T.textDim, fontSize: 13, padding: "20px 0", textAlign: "center" }}>No categorised expenses yet.</div>;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {sorted.map(([cat, val]) => (
                        <div key={cat}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: T.textMid }}>{cat}</span>
                            <span style={{ color: T.text, fontWeight: 600 }}>{fmt(val)}</span>
                          </div>
                          <MiniBar pct={(val / total) * 100} color="accent" />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Recent transactions */}
              <div style={{ ...S.card, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div className="hn" style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Recent Transactions</div>
                  <button onClick={() => setTab("transactions")} style={{ background: "none", border: "none", color: T.accent, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>View all</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {transactions.slice(0, 8).map(tx => (
                    <div key={tx.id} className="tx-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8 }} onClick={() => setTab("transactions")}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{tx.description}</div>
                        <div style={{ fontSize: 11, color: T.textDim }}>{dateStr(tx.date)}{tx.category ? ` Â· ${tx.category}` : " Â· uncategorised"}</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: tx.isCredit ? T.green : T.red, flexShrink: 0, marginLeft: 8 }}>
                        {tx.isCredit ? "+" : "-"}{fmt(tx.amount, tx.currency)}
                      </span>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div style={{ color: T.textDim, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                      Import a bank statement or add transactions manually.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Committed summary row */}
            {committed.length > 0 && (
              <div style={{ ...S.card, padding: 20 }}>
                <div className="hn" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: T.text }}>Committed Costs Overview</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                  {(() => {
                    const byGroup = {};
                    committed.filter(c => c.currency === "EUR").forEach(c => {
                      const r = RECURRENCES.find(r => r.v === c.recurrence);
                      byGroup[c.group] = (byGroup[c.group] || 0) + (parseFloat(c.amount) || 0) * (r?.ppy || 0) / 12;
                    });
                    return Object.entries(byGroup).map(([group, mo]) => (
                      <div key={group} style={{ ...S.cardHigh, padding: "12px 14px" }}>
                        <div style={{ fontSize: 11, color: T.textDim, marginBottom: 4 }}>{group}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.accent }}>{fmt(mo)}</div>
                        <div style={{ fontSize: 10, color: T.textDim }}>/month</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ââ TRANSACTIONS ââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        {tab === "transactions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Recurring transaction alerts */}
            {recurringAlerts.length > 0 && (
              <div style={{ ...S.card, padding: 16, borderColor: T.accent + "60" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div className="hn" style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>Recurring Transactions Detected</div>
                  <button onClick={() => setRecurringAlerts([])} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Dismiss all</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {recurringAlerts.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: T.surfaceHigh, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>
                        <div style={{ fontSize: 11, color: T.textDim }}>{fmt(r.amount)} &middot; {r.recurrence} &middot; seen {r.dates.length}x</div>
                      </div>
                      <Btn variant="ghost" style={{ fontSize: 11, padding: "5px 10px", flexShrink: 0 }} onClick={() => {
                        setCommitted(prev => [...prev, {
                          id: Date.now().toString(),
                          typeId: "other_fixed",
                          name: r.description,
                          group: "Other",
                          amount: r.amount.toString(),
                          currency: "EUR",
                          startDate: r.dates[r.dates.length - 1],
                          recurrence: r.recurrence,
                          isFixed: true,
                          note: "Auto-detected from transactions",
                        }]);
                        setRecurringAlerts(prev => prev.filter((_, j) => j !== i));
                      }}>
                        + Add to Committed
                      </Btn>
                      <button onClick={() => setRecurringAlerts(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer" }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bank import */}
            <div style={{ ...S.card, padding: 20 }}>
              <div className="hn" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Import Bank Statement</div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 14 }}>
                Upload a <b style={{ color: T.text }}>CSV</b> or <b style={{ color: T.text }}>Excel (.xlsx)</b> export from your bank. PTSB, Revolut, AIB, BOI and most Irish banks are supported. Your saved rules auto-apply to known descriptions.
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" style={{ display: "none" }}
                  onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); e.target.value = ""; }} />
                <Btn onClick={() => fileRef.current?.click()} variant={importing ? "ghost" : "primary"}>
                  <Upload size={13} />
                  {importing ? "Reading..." : "Upload CSV or Excel"}
                </Btn>
                {importMsg && (
                  <span style={{ fontSize: 12, color: importMsg.startsWith("Error") ? T.red : T.textMid }}>
                    {importMsg}
                  </span>
                )}
              </div>
              {importQueue.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Btn onClick={confirmImport} variant="success">
                    <Check size={13} />
                    Confirm {importQueue.length} transactions
                  </Btn>
                  <Btn onClick={() => { setImportQueue([]); setImportMsg(""); }} variant="danger">
                    <X size={13} /> Discard
                  </Btn>
                </div>
              )}

              {/* Import review queue */}
              {importQueue.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: T.textMid, marginBottom: 8 }}>Review & categorise before confirming. Categorising one transaction auto-applies to all similar ones.</div>
                  <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                    {importQueue.map((tx, i) => (
                      <div key={tx.id} style={{ padding: "10px 12px", borderRadius: 8, background: tx.category ? T.surfaceHigh : T.bg, border: `1px solid ${tx.category ? T.green + "40" : T.border}` }}>
                        {/* Top row: date + description + amount */}
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: T.textDim, flexShrink: 0 }}>{dateStr(tx.date)}</span>
                          <span style={{ fontSize: 12, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{tx.description}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: tx.isCredit ? T.green : T.red, flexShrink: 0 }}>
                            {tx.isCredit ? "+" : "-"}{fmt(tx.amount)}
                          </span>
                        </div>
                        {/* Bottom row: category combo full width */}
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <CategoryCombo
                            value={tx.category || ""}
                            overheadGroups={OVERHEAD_GROUPS}
                            onNewCategory={label => {
                              setCustomOverheads(prev => {
                                if (prev.some(o => o.label.toLowerCase() === label.toLowerCase())) return prev;
                                return [...prev, { id: Date.now().toString(), label, group: "Other", nature: "revenue" }];
                              });
                            }}
                            onChange={cat => {
                              const kw = tx.description.split(" ").slice(0, 3).join(" ").toLowerCase();
                              setImportQueue(prev => prev.map((t, j) => {
                                if (j === i) return { ...t, category: cat };
                                if (!t.category && t.description.toLowerCase().includes(kw)) return { ...t, category: cat, autoMatched: true };
                                return t;
                              }));
                              if (cat) {
                                setRules(prev => {
                                  const exists = prev.findIndex(r => r.keywords.includes(kw));
                                  if (exists >= 0) { const n = [...prev]; n[exists] = { ...n[exists], category: cat }; return n; }
                                  return [...prev, { id: Date.now().toString(), keywords: [kw], category: cat, created: today() }];
                                });
                              }
                            }}
                          />
                          {tx.aiSuggested && <Badge color="blue">AI</Badge>}
                          {tx.autoMatched && <Badge color="accent">auto</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ ...S.card, padding: 20 }}>
              <ManualTxForm onAdd={addManualTx} overheadGroups={OVERHEAD_GROUPS}
                onNewCategory={label => setCustomOverheads(prev => {
                  if (prev.some(o => o.label.toLowerCase() === label.toLowerCase())) return prev;
                  return [...prev, { id: Date.now().toString(), label, group: "Other", nature: "revenue" }];
                })}
              />
            </div>

            {/* Filter bar â single compact row */}
            <div style={{ ...S.card, padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                {[["all","All"],["income","In"],["expense","Out"],["uncat","Uncat"]].map(([v,l]) => (
                  <button key={v} onClick={() => setTxFilter(v)}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit", background: txFilter===v ? T.accent : T.surfaceHigh, color: txFilter===v ? "#0E0E10" : T.textMid, fontWeight: txFilter===v ? 700 : 400, display: "flex", alignItems: "center", gap: 4 }}>
                    {l}
                    {v==="uncat" && transactions.filter(t=>!t.category).length > 0 && (
                      <span style={{ background: T.red, color:"#fff", borderRadius:8, padding:"0 4px", fontSize:9, fontWeight:700 }}>{transactions.filter(t=>!t.category).length}</span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ position:"relative", flex:1, minWidth:120 }}>
                <Search size={11} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:T.textDim, pointerEvents:"none" }} />
                <input value={txSearch} onChange={e=>setTxSearch(e.target.value)} placeholder="Search..." style={{ ...S.input, paddingLeft:26, fontSize:12 }} />
              </div>
              <input type="date" value={txDateFrom} onChange={e=>setTxDateFrom(e.target.value)} style={{ ...S.input, width:130, fontSize:12, flexShrink:0 }} />
              <span style={{ color:T.textDim, fontSize:11, flexShrink:0 }}>to</span>
              <input type="date" value={txDateTo} onChange={e=>setTxDateTo(e.target.value)} style={{ ...S.input, width:130, fontSize:12, flexShrink:0 }} />
            </div>

            {/* Transaction ledger */}
            <div style={{ ...S.card, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", gap: 8 }}>
                <div style={{ width: 80, flexShrink: 0 }}>Date</div>
                <div style={{ flex: 1 }}>Description</div>
                <div style={{ flexShrink: 0 }}>Amount</div>
              </div>
              <div style={{ maxHeight: 520, overflowY: "auto" }}>
                {filteredTx.length === 0 && (
                  <div style={{ padding: 40, textAlign: "center", color: T.textDim, fontSize: 13 }}>No transactions match filters.</div>
                )}
                {filteredTx.map(tx => (
                  <TxRow key={tx.id} tx={tx}
                    overheadGroups={OVERHEAD_GROUPS}
                    debts={debts}
                    onCategory={cat => updateTxCategory(tx.id, cat)}
                    onNature={nature => setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, nature } : t))}
                    onNewCategory={label => setCustomOverheads(prev => {
                      if (prev.some(o => o.label.toLowerCase() === label.toLowerCase())) return prev;
                      return [...prev, { id: Date.now().toString(), label, group: "Other", nature: "revenue" }];
                    })}
                    onAllocateDebt={(debtId, amount) => {
                      const debt = debts.find(d => d.id === debtId);
                      // Don't reduce balance if this transaction predates the balance snapshot
                      if (debt && debt.balanceAsOf && tx.date < debt.balanceAsOf) {
                        // Still mark as allocated for categorisation, but don't touch the balance
                        setTransactions(prev => prev.map(t => t.id === tx.id
                          ? { ...t, debtAllocated: debtId, category: t.category || "Loan Repayment", nature: "balance_sheet" }
                          : t
                        ));
                        return;
                      }
                      // Reduce the debt balance
                      setDebts(prev => prev.map(d => d.id === debtId
                        ? { ...d, balance: Math.max(0, parseFloat(d.balance) - amount).toFixed(2), balanceAsOf: today() }
                        : d
                      ));
                      setTransactions(prev => prev.map(t => t.id === tx.id
                        ? { ...t, debtAllocated: debtId, category: t.category || "Loan Repayment", nature: "balance_sheet" }
                        : t
                      ));
                    }}
                    onDelete={() => setTransactions(prev => prev.filter(t => t.id !== tx.id))} />
                ))}
              </div>
              {filteredTx.length > 0 && (
                <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", fontSize: 12, color: T.textDim }}>
                  <span>{filteredTx.length} transactions</span>
                  <span>In: <b style={{ color: T.green }}>{fmt(filteredTx.filter(t => t.isCredit).reduce((s, t) => s + t.amount, 0))}</b> &nbsp; Out: <b style={{ color: T.red }}>{fmt(filteredTx.filter(t => !t.isCredit).reduce((s, t) => s + t.amount, 0))}</b></span>
                </div>
              )}
            </div>

            {/* Auto-cat rules */}
            {rules.length > 0 && (
              <div style={{ ...S.card, padding: 20 }}>
                <div className="hn" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Auto-Categorisation Rules ({rules.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {rules.map(r => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: T.surfaceHigh }}>
                      <div>
                        <span style={{ fontSize: 12, color: T.text }}>{r.keywords.join(", ")}</span>
                        <span style={{ fontSize: 11, color: T.textDim }}> &rarr; </span>
                        <Badge color="accent">{r.category}</Badge>
                      </div>
                      <button onClick={() => setRules(prev => prev.filter(x => x.id !== r.id))} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer" }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ââ BUDGETING ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        {tab === "budgeting" && (
          <BudgetingTab transactions={transactions} overheadGroups={OVERHEAD_GROUPS} committed={committed} />
        )}

        {/* ââ COMMITTED âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        {tab === "committed" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Compact add form */}
            <div style={{ ...S.card, padding: 20 }}>
              <div className="hn" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Add Committed Expense</div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 14 }}>Fixed and variable recurring costs â projected with Irish banking day adjustments.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <Select label="Type" value={commitForm.typeId} onChange={e => {
                    const t = COMMITTED_TYPES.find(x => x.id === e.target.value);
                    setCommitForm(p => ({ ...p, typeId: e.target.value, recurrence: t?.rec || "monthly", isFixed: t?.fixed ?? true }));
                  }}>
                    {COMMITTED_GROUPS.map(g => (
                      <optgroup key={g} label={g}>
                        {COMMITTED_TYPES.filter(t => t.group === g).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </optgroup>
                    ))}
                  </Select>
                </div>
                <Input label="Custom name (opt)" value={commitForm.name} onChange={e => setCommitForm(p => ({ ...p, name: e.target.value }))} placeholder="Override label" />
                <Input label="Amount" type="number" value={commitForm.amount} onChange={e => setCommitForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                <Select label="Currency" value={commitForm.currency} onChange={e => setCommitForm(p => ({ ...p, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </Select>
                <Input label="Start / First payment" type="date" value={commitForm.startDate} onChange={e => setCommitForm(p => ({ ...p, startDate: e.target.value }))} />
                <Select label="Frequency" value={commitForm.recurrence} onChange={e => setCommitForm(p => ({ ...p, recurrence: e.target.value }))}>
                  {RECURRENCES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                </Select>
                <div>
                  <label style={S.label}>Type</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[{ v: true, l: "Fixed" }, { v: false, l: "Variable" }].map(({ v, l }) => (
                      <button key={l} onClick={() => setCommitForm(p => ({ ...p, isFixed: v }))}
                        style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${commitForm.isFixed === v ? T.accent : T.border}`, background: commitForm.isFixed === v ? T.accentDim + "40" : "transparent", color: commitForm.isFixed === v ? T.accent : T.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: commitForm.isFixed === v ? 700 : 400 }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <Input label="Note" value={commitForm.note} onChange={e => setCommitForm(p => ({ ...p, note: e.target.value }))} placeholder="e.g. ESB a/c 123" />
              </div>
              <Btn onClick={addCommitted}><Plus size={13} /> Add</Btn>
            </div>

            {/* Monthly summary */}
            {committed.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {(() => {
                  const byGroup = {};
                  committed.filter(c => c.currency === "EUR").forEach(c => {
                    const r = RECURRENCES.find(r => r.v === c.recurrence);
                    byGroup[c.group] = (byGroup[c.group] || 0) + (parseFloat(c.amount) || 0) * (r?.ppy || 0) / 12;
                  });
                  const total = Object.values(byGroup).reduce((a, b) => a + b, 0);
                  return [
                    ...Object.entries(byGroup).map(([g, mo]) => (
                      <StatCard key={g} label={g} value={fmt(mo)} sub="/month" color="accent" />
                    )),
                    <StatCard key="total" label="Total EUR" value={fmt(total)} sub={`${fmt(total * 12)} /year`} color="text" />,
                  ];
                })()}
              </div>
            )}

            {/* Committed list */}
            <div style={{ ...S.card, overflow: "hidden" }}>
              {committed.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: T.textDim, fontSize: 13 }}>No committed expenses yet.</div>
              )}
              {committed.map(ce => {
                const rec = RECURRENCES.find(r => r.v === ce.recurrence);
                const nextDates = projectDates(ce.startDate, ce.recurrence, 3);
                const next = nextDates.find(d => d.effective >= today());
                const isOpen = showProjectId === ce.id;
                return (
                  <div key={ce.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <div className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{ce.name}</span>
                          <Badge color={ce.isFixed ? "blue" : "accent"}>{ce.isFixed ? "Fixed" : "Variable"}</Badge>
                          <Badge color="dim">{rec?.l}</Badge>
                          <span style={{ fontSize: 11, color: T.textDim }}>{ce.group}</span>
                        </div>
                        {ce.note && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{ce.note}</div>}
                        {next && (
                          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                            Next: {dateStr(next.effective)}
                            {next.shifted && <span style={{ color: T.accent, marginLeft: 6 }}>(moved â weekend/holiday)</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{fmt(ce.amount, ce.currency)}</span>
                        <button onClick={() => setShowProjectId(isOpen ? null : ce.id)}
                          style={{ background: isOpen ? T.blueDim : T.surfaceHigh, color: isOpen ? T.blue : T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                          {isOpen ? "Hide" : "Project"}
                        </button>
                        <button onClick={() => setCommitted(prev => prev.filter(x => x.id !== ce.id))}
                          style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 4 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding: "12px 16px", background: T.bg, borderTop: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8 }}>12-month projection &middot; * = moved past weekend or Irish bank holiday</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 6 }}>
                          {projectDates(ce.startDate, ce.recurrence, 12).map((pd, i) => {
                            const past = pd.effective < today();
                            return (
                              <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: past ? T.surfaceHigh + "80" : T.surfaceHigh, border: `1px solid ${pd.shifted ? T.accent + "50" : T.border}`, opacity: past ? 0.5 : 1 }}>
                                <div style={{ fontSize: 11, color: pd.shifted ? T.accent : T.textMid }}>{dateStr(pd.effective)}{pd.shifted ? " *" : ""}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginTop: 2 }}>{fmt(ce.amount, ce.currency)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ââ DEBT ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        {tab === "debt" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Net position summary */}
            {(debts.length > 0 || assets.length > 0) && (() => {
              const totalAssets = assets.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
              const totalLiabilities = debts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0);
              const netPosition = totalAssets - totalLiabilities;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12 }}>
                  <StatCard label="Total Assets" value={fmt(totalAssets)} color="green" />
                  <StatCard label="Total Liabilities" value={fmt(totalLiabilities)} color="red" />
                  <StatCard label="Net Position" value={fmt(netPosition)} color={netPosition >= 0 ? "green" : "red"} />
                </div>
              );
            })()}

            {/* ââ ASSETS âââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
            <div style={{ ...S.card, padding: 20 }}>
              <div className="hn" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Add Asset / Savings Account</div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 14 }}>Track savings accounts, share accounts, deposits and investments. A Credit Union share account is an asset.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <Input label="Account / Asset name" value={assetForm.name} onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Credit Union Shares" />
                </div>
                <div>
                  <label style={S.label}>Current balance</label>
                  <input type="number" value={assetForm.balance} onChange={e => setAssetForm(p => ({ ...p, balance: e.target.value }))}
                    placeholder="0.00" style={{ ...S.input, marginBottom: 4 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: T.textDim, flexShrink: 0 }}>as of</span>
                    <input type="date" value={assetForm.balanceAsOf} onChange={e => setAssetForm(p => ({ ...p, balanceAsOf: e.target.value }))}
                      style={{ ...S.input, fontSize: 11, padding: "5px 8px" }} />
                  </div>
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>Set a past date for existing accounts</div>
                </div>
                <Select label="Currency" value={assetForm.currency} onChange={e => setAssetForm(p => ({ ...p, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </Select>
                <Input label="Interest / dividend rate %" type="number" value={assetForm.rate} onChange={e => setAssetForm(p => ({ ...p, rate: e.target.value }))} placeholder="e.g. 1.5" />
                <Select label="Type" value={assetForm.type} onChange={e => setAssetForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="savings">Savings Account</option>
                  <option value="shares">Share Account (CU)</option>
                  <option value="deposit">Fixed Deposit</option>
                  <option value="investment">Investment</option>
                  <option value="property">Property</option>
                  <option value="other">Other Asset</option>
                </Select>
                <Input label="Note" value={assetForm.note} onChange={e => setAssetForm(p => ({ ...p, note: e.target.value }))} placeholder="e.g. CU account no." />
              </div>
              <Btn onClick={addAsset}><Plus size={13} /> Add Asset</Btn>
            </div>

            {assets.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Assets</div>
                {assets.map(a => (
                  <AssetCard key={a.id} asset={a}
                    linkedDebts={debts.filter(d => d.linkedAssetId === a.id)}
                    onChange={updated => setAssets(prev => prev.map(x => x.id === a.id ? updated : x))}
                    onDelete={() => setAssets(prev => prev.filter(x => x.id !== a.id))}
                  />
                ))}
              </div>
            )}

            {/* ââ LIABILITIES ââââââââââââââââââââââââââââââââââââââââââââââââ */}
            <div style={{ ...S.card, padding: 20 }}>
              <div className="hn" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Add Liability / Loan</div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 14 }}>
                Sorted by Avalanche method. Monthly repayment auto-calculated. You can link a loan to a share account (e.g. CU share-secured loan).
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <Input label="Loan name" value={debtForm.name} onChange={e => setDebtForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. CU Share Loan" />
                </div>
                <Input label="Original loan amount" type="number" value={debtForm.total} onChange={e => setDebtForm(p => ({ ...p, total: e.target.value }))} placeholder="0.00" />
                <div>
                  <label style={S.label}>Current balance</label>
                  <input type="number" value={debtForm.balance} onChange={e => setDebtForm(p => ({ ...p, balance: e.target.value }))}
                    placeholder="0.00" style={{ ...S.input, marginBottom: 4 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: T.textDim, flexShrink: 0 }}>as of</span>
                    <input type="date" value={debtForm.balanceAsOf} onChange={e => setDebtForm(p => ({ ...p, balanceAsOf: e.target.value }))}
                      style={{ ...S.input, fontSize: 11, padding: "5px 8px" }} />
                  </div>
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>Set a past date for existing loans</div>
                </div>
                <Select label="Currency" value={debtForm.currency} onChange={e => setDebtForm(p => ({ ...p, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </Select>
                <Select label="Payment frequency" value={debtForm.paymentFrequency || "monthly"} onChange={e => setDebtForm(p => ({ ...p, paymentFrequency: e.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="weekly">Weekly</option>
                </Select>
                <Input label="Interest rate % p.a." type="number" value={debtForm.rate} onChange={e => setDebtForm(p => ({ ...p, rate: e.target.value }))} placeholder="e.g. 8.5" />
                <div>
                  <label style={S.label}>Known {debtForm.paymentFrequency || "monthly"} payment (optional)</label>
                  <input type="number" value={debtForm.knownPayment || ""} onChange={e => setDebtForm(p => ({ ...p, knownPayment: e.target.value }))}
                    placeholder="e.g. 250.00" style={{ ...S.input }} />
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>Term will be auto-calculated from this + rate</div>
                </div>
                <Input label="Term (months â or leave blank)" type="number" value={debtForm.termMonths} onChange={e => setDebtForm(p => ({ ...p, termMonths: e.target.value }))} placeholder="e.g. 60" />
                <Input label="Next due date" type="date" value={debtForm.dueDate} onChange={e => setDebtForm(p => ({ ...p, dueDate: e.target.value }))} />
                {assets.length > 0 && (
                  <div>
                    <label style={S.label}>Linked asset (optional)</label>
                    <select value={debtForm.linkedAssetId} onChange={e => setDebtForm(p => ({ ...p, linkedAssetId: e.target.value }))} style={{ ...S.input, fontSize: 12 }}>
                      <option value="">â none â</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <Btn onClick={addDebt}><Plus size={13} /> Add Loan</Btn>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {debts.length > 0 && <div style={{ fontSize: 12, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Liabilities</div>}
              {[...debts].sort((a, b) => (parseFloat(b.rate) || 0) - (parseFloat(a.rate) || 0)).map((d, i) => (
                <DebtCard key={d.id}
                  debt={d}
                  isFirst={i === 0}
                  timeline60={timeline60}
                  linkedAsset={assets.find(a => a.id === d.linkedAssetId) || null}
                  onChange={updated => setDebts(prev => prev.map(x => x.id === d.id ? updated : x))}
                  onDelete={() => setDebts(prev => prev.filter(x => x.id !== d.id))}
                />
              ))}
              {debts.length === 0 && assets.length === 0 && (
                <div style={{ ...S.card, padding: 40, textAlign: "center", color: T.textDim, fontSize: 13 }}>
                  No assets or liabilities tracked yet. Add your Credit Union shares as an asset and your share loan as a liability above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ââ TIMELINE ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        {tab === "timeline" && (
          <div style={{ ...S.card, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
              <div className="hn" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>60-Day Cash Flow</div>
              <div style={{ fontSize: 12, color: T.textDim }}>All income, committed costs and debt payments in the next 60 days, with Irish banking day adjustments applied.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {timeline60.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.textDim, fontSize: 13 }}>No events in the next 60 days. Set up payroll, committed costs or debts.</div>}
              {timeline60.map((ev, i) => {
                const colors = { income: T.green, bill: T.accent, debt: T.red };
                const c = colors[ev.type] || T.textMid;
                const now = new Date(); now.setHours(0, 0, 0, 0);
                const daysAway = Math.ceil((ev.date - now) / 86400000);
                return (
                  <div key={i} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ width: 72, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.textMid }}>{ev.date.toLocaleDateString("en-IE", { day: "numeric", month: "short" })}</div>
                      <div style={{ fontSize: 10, color: T.textDim }}>{daysAway === 0 ? "Today" : "in " + daysAway + "d"}</div>
                    </div>
                    <div style={{ fontSize: 13, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c, flexShrink: 0 }}>
                      {ev.type === "income" ? "+" : "-"}{fmt(ev.amount, ev.currency)}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <Badge color={ev.type === "income" ? "green" : ev.type === "bill" ? "accent" : "red"}>
                        {ev.type}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ââ SETTINGS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 700 }}>

            {/* Custom Overheads */}
            <div style={{ ...S.card, padding: 20 }}>
              <div className="hn" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Manage Overhead Categories</div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 14 }}>Add custom categories that appear alongside the built-in list in all dropdowns.</div>
              <AddOverheadForm onAdd={o => setCustomOverheads(prev => [...prev, { id: Date.now().toString(), ...o }])} />
              {customOverheads.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Custom overheads</div>
                  {customOverheads.map(o => (
                    <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: T.surfaceHigh }}>
                      <div>
                        <span style={{ fontSize: 12, color: T.text }}>{o.label}</span>
                        <span style={{ fontSize: 11, color: T.textDim, marginLeft: 8 }}>{o.group}</span>
                        <span style={{ marginLeft: 8 }}><Badge color={o.nature === "capital" ? "purple" : "dim"}>{o.nature === "capital" ? "Capital" : "Revenue"}</Badge></span>
                      </div>
                      <button onClick={() => setCustomOverheads(prev => prev.filter(x => x.id !== o.id))} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer" }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
              {/* Built-in summary */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Built-in groups</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(BUILTIN_OVERHEAD_GROUPS).map(([g, cs]) => (
                    <div key={g} style={{ background: T.surfaceHigh, borderRadius: 6, padding: "4px 10px", fontSize: 11, color: T.textMid }}>
                      {g} <span style={{ color: T.textDim }}>({cs.length})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Auto-categorisation rules */}
            <div style={{ ...S.card, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div className="hn" style={{ fontSize: 15, fontWeight: 700 }}>Auto-Categorisation Rules</div>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setRules(prev => [...prev, { id: Date.now().toString(), keywords: [""], category: "", created: today(), isNew: true }])}>
                  <Plus size={11} /> Add Rule
                </Btn>
              </div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 12 }}>
                Each rule matches any transaction whose description contains one of the keywords (case-insensitive) and assigns it the chosen category automatically on import.
              </div>
              {rules.length === 0 && <div style={{ color: T.textDim, fontSize: 13 }}>No rules yet. They are created automatically when you categorise a transaction, or add one manually above.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rules.map(r => (
                  <RuleEditor
                    key={r.id}
                    rule={r}
                    overheadGroups={OVERHEAD_GROUPS}
                    onChange={updated => {
                      // Update the rule
                      setRules(prev => prev.map(x => x.id === r.id ? { ...updated, id: r.id } : x));
                      // Backfill: apply the updated rule to all transactions whose
                      // description matches any keyword AND whose category is either
                      // empty or was previously set by the old version of this rule
                      if (updated.category && updated.keywords && updated.keywords.length > 0) {
                        setTransactions(prev => prev.map(tx => {
                          const desc = tx.description.toLowerCase();
                          const matchesNew = updated.keywords.some(k => k && desc.includes(k.toLowerCase()));
                          const matchedOldRule = r.keywords && r.keywords.some(k => k && desc.includes(k.toLowerCase()));
                          // Apply if: matches new keywords, AND (uncategorised OR previously matched old rule)
                          if (matchesNew && (!tx.category || matchedOldRule)) {
                            return { ...tx, category: updated.category };
                          }
                          return tx;
                        }));
                      }
                    }}
                    onDelete={() => setRules(prev => prev.filter(x => x.id !== r.id))}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ââ LOAN PROMPT MODAL ââââââââââââââââââââââââââââââââââââââââââââââ */}
      {loanPrompt && (
        <LoanPromptModal
          prompt={loanPrompt}
          debts={debts}
          onAddDebt={debt => { setDebts(prev => [...prev, debt]); setLoanPrompt(null); }}
          onReduceDebt={(debtId, amount) => {
            const txDate = loanPrompt?.tx?.date;
            setDebts(prev => prev.map(d => {
              if (d.id !== debtId) return d;
              // Skip reduction if transaction predates the balance snapshot
              if (d.balanceAsOf && txDate && txDate < d.balanceAsOf) return d;
              return { ...d, balance: Math.max(0, parseFloat(d.balance) - amount).toFixed(2), balanceAsOf: today() };
            }));
            setLoanPrompt(null);
          }}
          onDismiss={() => setLoanPrompt(null)}
        />
      )}
    </div>
  );
}
// âââ PMT CALCULATION âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Standard loan amortisation: monthly payment given balance, annual rate, months
// Periods per year by frequency
const DEBT_FREQ = { monthly: 12, fortnightly: 26, weekly: 52 };

function calcPMT(balance, annualRatePct, termMonths, frequency) {
  const P = parseFloat(balance) || 0;
  const freq = DEBT_FREQ[frequency] || 12;
  const termPeriods = frequency === "fortnightly" ? Math.round((parseInt(termMonths)||0) * 26/12)
    : frequency === "weekly" ? Math.round((parseInt(termMonths)||0) * 52/12)
    : parseInt(termMonths) || 0;
  const r = (parseFloat(annualRatePct) || 0) / 100 / freq;
  if (P <= 0 || termPeriods <= 0) return 0;
  if (r === 0) return P / termPeriods;
  return (P * r) / (1 - Math.pow(1 + r, -termPeriods));
}

function calcPayoffMonths(balance, annualRatePct, periodicPayment, frequency) {
  const P = parseFloat(balance) || 0;
  const freq = DEBT_FREQ[frequency] || 12;
  const r = (parseFloat(annualRatePct) || 0) / 100 / freq;
  const pmt = parseFloat(periodicPayment) || 0;
  if (P <= 0 || pmt <= 0) return null;
  if (r === 0) return Math.ceil((P / pmt) * (12 / freq));
  if (pmt <= P * r) return null;
  const periods = Math.ceil(-Math.log(1 - (P * r) / pmt) / Math.log(1 + r));
  // Convert periods back to months
  return Math.ceil(periods * 12 / freq);
}

// Calculate term in months given balance, rate, and known periodic payment
function calcTermFromPayment(balance, annualRatePct, periodicPayment, frequency) {
  return calcPayoffMonths(balance, annualRatePct, periodicPayment, frequency);
}

// âââ OPTIMAL DUE DATE CALCULATOR âââââââââââââââââââââââââââââââââââââââââââââ
// Finds the best day in the next 30 days to make a debt payment.
// Strategy: find the day with highest estimated net cash position
// (after income has landed, before the next cluster of bills).
function calcOptimalDueDate(timeline60, paymentAmount) {
  const now = new Date(); now.setHours(0,0,0,0);
  const days = 31;
  // Build daily cash flow map for the next 31 days
  const flow = {};
  for (let i = 1; i <= days; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const key = d.toISOString().split("T")[0];
    flow[key] = 0;
  }
  timeline60.forEach(ev => {
    const key = ev.date.toISOString().split("T")[0];
    if (!flow.hasOwnProperty(key)) return;
    if (ev.type === "income") flow[key] += ev.amount;
    else flow[key] -= ev.amount; // bills and debts are outflows
  });
  // Find the day with the best running surplus AFTER the payment
  let bestDate = null, bestScore = -Infinity;
  let running = 0;
  const keys = Object.keys(flow).sort();
  keys.forEach(key => {
    running += flow[key];
    const score = running - paymentAmount; // headroom after making the payment
    if (score > bestScore) {
      bestScore = score;
      bestDate = key;
    }
  });
  // Prefer a date that is at least 2 days after any payday for settlement
  return bestDate;
}

// âââ ASSET CARD ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AssetCard({ asset, linkedDebts, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: asset.name || "", balance: asset.balance || "",
    balanceAsOf: asset.balanceAsOf || today(),
    currency: asset.currency || "EUR", rate: asset.rate || "",
    type: asset.type || "savings", note: asset.note || "",
  });
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const bal = parseFloat(form.balance) || 0;
  const annualInterest = bal * ((parseFloat(form.rate) || 0) / 100);
  const typeLabels = { savings: "Savings", shares: "CU Shares", deposit: "Deposit", investment: "Investment", property: "Property", other: "Asset" };

  return (
    <div style={{ ...S.card, overflow: "hidden", borderColor: T.green + "40" }}>
      <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="hn" style={{ fontSize: 14, fontWeight: 700 }}>{asset.name}</span>
            <Badge color="green">{typeLabels[asset.type] || "Asset"}</Badge>
            {parseFloat(asset.rate) > 0 && <Badge color="dim">{asset.rate}% p.a.</Badge>}
          </div>
          {asset.note && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{asset.note}</div>}
          {linkedDebts.length > 0 && (
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
              Secured against: {linkedDebts.map(d => d.name).join(", ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setEditing(e => !e)}
            style={{ background: editing ? T.accentDim+"40" : T.surfaceHigh, color: editing ? T.accent : T.textMid, border: `1px solid ${editing ? T.accent+"50" : T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            {editing ? "Cancel" : "Edit"}
          </button>
          <button onClick={onDelete} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 4 }}><Trash2 size={13} /></button>
        </div>
      </div>

      {editing && (
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 10 }}>
            <Input label="Name" value={form.name} onChange={fld("name")} />
            <div>
              <label style={S.label}>Current balance</label>
              <input type="number" value={form.balance} onChange={fld("balance")} placeholder="0.00"
                style={{ ...S.input, marginBottom: 4 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: T.textDim, flexShrink: 0 }}>as of</span>
                <input type="date" value={form.balanceAsOf} onChange={fld("balanceAsOf")}
                  style={{ ...S.input, fontSize: 11, padding: "5px 8px" }} />
              </div>
            </div>
            <Select label="Currency" value={form.currency} onChange={fld("currency")}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Input label="Rate / dividend %" type="number" value={form.rate} onChange={fld("rate")} placeholder="e.g. 1.5" />
            <Select label="Type" value={form.type} onChange={fld("type")}>
              <option value="savings">Savings Account</option>
              <option value="shares">Share Account (CU)</option>
              <option value="deposit">Fixed Deposit</option>
              <option value="investment">Investment</option>
              <option value="property">Property</option>
              <option value="other">Other Asset</option>
            </Select>
            <Input label="Note" value={form.note} onChange={fld("note")} placeholder="Account number etc." />
          </div>
          <Btn onClick={() => { onChange({ ...asset, ...form }); setEditing(false); }}><Check size={12} /> Save</Btn>
        </div>
      )}

      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Balance</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.green }}>{fmt(bal, asset.currency)}</div>
            {asset.balanceAsOf && (
              <div style={{ fontSize: 10, color: T.textDim, marginTop: 1 }}>as of {dateStr(asset.balanceAsOf)}</div>
            )}
          </div>
          {annualInterest > 0 && (
            <div>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Annual Return</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.textMid }}>{fmt(annualInterest, asset.currency)}</div>
            </div>
          )}
          {linkedDebts.map(d => (
            <div key={d.id}>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Loan vs Shares</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: (bal - parseFloat(d.balance)) >= 0 ? T.green : T.red }}>
                {fmt(bal - parseFloat(d.balance), asset.currency)} equity
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function DebtCard({ debt, isFirst, onChange, onDelete, timeline60, linkedAsset }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: debt.name || "",
    total: debt.total || debt.balance || "",
    balance: debt.balance || "",
    balanceAsOf: debt.balanceAsOf || today(),
    currency: debt.currency || "EUR",
    rate: debt.rate || "",
    termMonths: debt.termMonths || "",
    paymentFrequency: debt.paymentFrequency || "monthly",
    knownPayment: debt.knownPayment || "",
    dueDate: debt.dueDate || "",
  });
  const [paymentAmt, setPaymentAmt] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [lastPayment, setLastPayment] = useState(null);

  // Sync form balance when debt changes externally (repayment applied from transaction)
  const prevBalanceRef = useRef(debt.balance);
  if (prevBalanceRef.current !== debt.balance) {
    prevBalanceRef.current = debt.balance;
    if (!editing) setForm(f => ({ ...f, balance: debt.balance, balanceAsOf: today() }));
  }

  const balance = parseFloat(form.balance) || 0;
  const total = parseFloat(form.total) || balance;
  const rate = parseFloat(form.rate) || 0;
  const term = parseInt(form.termMonths) || 0;
  const freq = form.paymentFrequency || "monthly";
  const pct = total > 0 ? Math.min(100, ((total - balance) / total) * 100) : 0;

  const periodicPayment = calcPMT(balance, rate, term, freq);
  // Monthly equivalent for display
  const monthlyEquiv = freq === "fortnightly" ? periodicPayment * 26 / 12
    : freq === "weekly" ? periodicPayment * 52 / 12
    : periodicPayment;
  const totalInterest = term > 0 && periodicPayment > 0
    ? (periodicPayment * (freq === "fortnightly" ? Math.round(term * 26/12) : freq === "weekly" ? Math.round(term * 52/12) : term)) - balance
    : 0;
  const payoffMonths = term > 0 ? term : calcPayoffMonths(balance, rate, parseFloat(form.knownPayment) || periodicPayment, freq);
  const payoffDate = payoffMonths
    ? new Date(Date.now() + payoffMonths * 30.44 * 86400000).toLocaleDateString("en-IE", { month: "short", year: "numeric" })
    : null;

  // Auto-calculate term from known payment + rate
  const suggestedTerm = (form.knownPayment && rate && !term)
    ? calcTermFromPayment(balance, rate, parseFloat(form.knownPayment), freq)
    : null;

  // Suggested due date from cash flow
  const suggestedDueDate = timeline60
    ? calcOptimalDueDate(timeline60, periodicPayment || parseFloat(debt.balance) || 0)
    : null;

  function save() {
    onChange({ ...debt, ...form });
    setEditing(false);
  }

  function applyPayment() {
    const amt = parseFloat(paymentAmt);
    if (!amt || amt <= 0) return;
    // Split payment into interest and principal
    const periodicRate = rate / 100 / (DEBT_FREQ[freq] || 12);
    const interestPortion = balance * periodicRate;
    const principalPortion = Math.min(balance, Math.max(0, amt - interestPortion));
    const newBalance = Math.max(0, balance - principalPortion);
    const entry = {
      date: today(),
      totalPayment: amt,
      interest: parseFloat(interestPortion.toFixed(2)),
      principal: parseFloat(principalPortion.toFixed(2)),
      prevBalance: balance,
      newBalance: parseFloat(newBalance.toFixed(2)),
      note: paymentNote,
    };
    const newForm = { ...form, balance: newBalance.toFixed(2), balanceAsOf: today() };
    setForm(newForm);
    const history = [...(debt.paymentHistory || []), entry];
    onChange({ ...debt, ...newForm, paymentHistory: history });
    setLastPayment(entry);
    setPaymentAmt("");
    setPaymentNote("");
    setShowPayment(false);
  }

  function useSuggestedDate() {
    if (suggestedDueDate) {
      setForm(f => ({ ...f, dueDate: suggestedDueDate }));
      onChange({ ...debt, ...form, dueDate: suggestedDueDate });
    }
  }

  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ ...S.card, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="hn" style={{ fontSize: 14, fontWeight: 700 }}>{debt.name}</span>
            {isFirst && <Badge color="red">Avalanche Priority</Badge>}
            {rate > 0 && <Badge color="accent">{rate}% APR</Badge>}
            {freq !== "monthly" && <Badge color="dim">{freq === "fortnightly" ? "Fortnightly" : "Weekly"}</Badge>}
            {(debt.knownPayment || periodicPayment > 0) && (
              <Badge color="dim">
                {fmt(parseFloat(debt.knownPayment) || periodicPayment, debt.currency)}{" "}
                {freq === "fortnightly" ? "/ fortnight" : freq === "weekly" ? "/ week" : "/ month"}
              </Badge>
            )}
          </div>
          {form.dueDate && (
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
              Next payment: {dateStr(form.dueDate)}
              {suggestedDueDate && suggestedDueDate !== form.dueDate && (
                <button onClick={useSuggestedDate}
                  style={{ marginLeft: 8, background: "none", border: `1px solid ${T.green}50`, borderRadius: 4, padding: "1px 6px", fontSize: 10, color: T.green, cursor: "pointer", fontFamily: "inherit" }}>
                  Better date: {dateStr(suggestedDueDate)}
                </button>
              )}
            </div>
          )}
          {debt.balanceAsOf && (
            <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>
              Balance recorded as of {dateStr(debt.balanceAsOf)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { setShowPayment(false); setEditing(e => !e); }}
            style={{ background: editing ? T.accentDim+"40" : T.surfaceHigh, color: editing ? T.accent : T.textMid, border: `1px solid ${editing ? T.accent+"50" : T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            {editing ? "Cancel" : "Edit"}
          </button>
          <button onClick={onDelete} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 4 }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 10 }}>
            <Input label="Name" value={form.name} onChange={fld("name")} />
            <Input label="Original loan amount" type="number" value={form.total} onChange={fld("total")} placeholder="0.00" />
            <div>
              <label style={S.label}>Balance</label>
              <input type="number" value={form.balance} onChange={fld("balance")} placeholder="0.00"
                style={{ ...S.input, marginBottom: 4 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: T.textDim, flexShrink: 0 }}>as of</span>
                <input type="date" value={form.balanceAsOf} onChange={fld("balanceAsOf")}
                  style={{ ...S.input, fontSize: 11, padding: "5px 8px" }} />
              </div>
              <div style={{ fontSize: 10, color: T.textDim, marginTop: 3 }}>
                Set to a past date if this is an existing loan
              </div>
            </div>
            <Select label="Currency" value={form.currency} onChange={fld("currency")}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Select label="Payment frequency" value={form.paymentFrequency} onChange={fld("paymentFrequency")}>
              <option value="monthly">Monthly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="weekly">Weekly</option>
            </Select>
            <Input label="Interest rate % p.a." type="number" value={form.rate} onChange={fld("rate")} placeholder="e.g. 8.5" />
            <div>
              <label style={S.label}>Term (months)</label>
              <input type="number" value={form.termMonths} onChange={fld("termMonths")} placeholder="e.g. 60"
                style={{ ...S.input, marginBottom: 4 }} />
              {suggestedTerm && (
                <button onClick={() => setForm(f => ({ ...f, termMonths: suggestedTerm.toString() }))}
                  style={{ background: T.accentDim+"40", color: T.accent, border: `1px solid ${T.accent}40`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                  Calculate from payment: {suggestedTerm} months ({Math.round(suggestedTerm/12 * 10)/10} yrs)
                </button>
              )}
            </div>
            <div>
              <label style={S.label}>Known {form.paymentFrequency || "monthly"} payment</label>
              <input type="number" value={form.knownPayment} onChange={fld("knownPayment")} placeholder="e.g. 250.00"
                style={{ ...S.input }} />
              <div style={{ fontSize: 10, color: T.textDim, marginTop: 3 }}>
                Enter your actual repayment â term will be calculated automatically
              </div>
            </div>
            <div>
              <label style={S.label}>Next due date</label>
              <div style={{ display: "flex", gap: 4 }}>
                <input type="date" value={form.dueDate} onChange={fld("dueDate")} style={{ ...S.input, flex: 1 }} />
              </div>
              {suggestedDueDate && (
                <button onClick={useSuggestedDate}
                  style={{ marginTop: 4, background: T.greenDim, color: T.green, border: `1px solid ${T.green}40`, borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                  Use cash-flow optimal: {dateStr(suggestedDueDate)}
                </button>
              )}
            </div>
          </div>
          <Btn onClick={save}><Check size={12} /> Save Changes</Btn>
        </div>
      )}

      {/* Stats */}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Balance</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.red }}>{fmt(balance, debt.currency)}</div>
            {debt.balanceAsOf && (
              <div style={{ fontSize: 10, color: T.textDim, marginTop: 1 }}>as of {dateStr(debt.balanceAsOf)}</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
              {freq === "fortnightly" ? "Fortnightly" : freq === "weekly" ? "Weekly" : "Monthly"} Payment
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.accent }}>
              {periodicPayment > 0 ? fmt(periodicPayment, debt.currency)
                : form.knownPayment ? fmt(parseFloat(form.knownPayment), debt.currency)
                : <span style={{ color: T.textDim, fontSize: 12 }}>Set rate & term</span>}
            </div>
            {freq !== "monthly" && monthlyEquiv > 0 && (
              <div style={{ fontSize: 10, color: T.textDim }}>â {fmt(monthlyEquiv, debt.currency)}/mo</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Total Interest</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.textMid }}>
              {totalInterest > 0 ? fmt(totalInterest, debt.currency) : "â"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Payoff</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{payoffDate || (term > 0 ? "â" : "Set term")}</div>
            {payoffMonths && <div style={{ fontSize: 10, color: T.textDim }}>{payoffMonths} months</div>}
          </div>
        </div>

        <MiniBar pct={pct} color={pct > 75 ? "green" : "accent"} />
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{pct.toFixed(1)}% paid off {total > 0 && ("of " + fmt(total, debt.currency))}</div>

        {/* Linked asset panel */}
        {linkedAsset && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: T.greenDim, border: `1px solid ${T.green}30` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.green, marginBottom: 4 }}>Linked Asset: {linkedAsset.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em" }}>Shares Balance</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{fmt(parseFloat(linkedAsset.balance), linkedAsset.currency)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em" }}>Loan Balance</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.red }}>{fmt(balance, debt.currency)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em" }}>Net Equity</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: (parseFloat(linkedAsset.balance) - balance) >= 0 ? T.green : T.red }}>
                  {fmt(parseFloat(linkedAsset.balance) - balance, debt.currency)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last payment confirmation with principal/interest split */}
        {lastPayment && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: T.greenDim, border: `1px solid ${T.green}40`, fontSize: 11 }}>
            <div style={{ fontWeight: 600, color: T.green, marginBottom: 4 }}>
              Payment of {fmt(lastPayment.totalPayment, debt.currency)} applied on {dateStr(lastPayment.date)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 6 }}>
              <div><span style={{ color: T.textDim }}>Principal: </span><span style={{ color: T.text, fontWeight: 600 }}>{fmt(lastPayment.principal, debt.currency)}</span></div>
              <div><span style={{ color: T.textDim }}>Interest: </span><span style={{ color: T.red, fontWeight: 600 }}>{fmt(lastPayment.interest, debt.currency)}</span></div>
              <div><span style={{ color: T.textDim }}>Balance: </span><span style={{ color: T.text, fontWeight: 600 }}>{fmt(lastPayment.newBalance, debt.currency)}</span></div>
            </div>
            {lastPayment.note && <div style={{ color: T.textDim, marginTop: 4 }}>{lastPayment.note}</div>}
          </div>
        )}

        {/* Payment history */}
        {debt.paymentHistory && debt.paymentHistory.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Payment History ({debt.paymentHistory.length})
              {debt.paymentHistory.length > 0 && (
                <span style={{ marginLeft: 8, color: T.textDim }}>
                  Total interest paid: {fmt(debt.paymentHistory.reduce((s, p) => s + p.interest, 0), debt.currency)}
                </span>
              )}
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
              {[...debt.paymentHistory].reverse().map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 8px", borderRadius: 6, background: T.bg, fontSize: 11 }}>
                  <span style={{ color: T.textDim, width: 76, flexShrink: 0 }}>{dateStr(p.date)}</span>
                  <span style={{ color: T.text, fontWeight: 600, flexShrink: 0 }}>{fmt(p.totalPayment, debt.currency)}</span>
                  <span style={{ color: T.textDim, fontSize: 10 }}>
                    principal {fmt(p.principal, debt.currency)} + interest {fmt(p.interest, debt.currency)}
                  </span>
                  {p.note && <span style={{ color: T.textDim, marginLeft: "auto", fontSize: 10, fontStyle: "italic" }}>{p.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested due date (when no date set) */}
        {!form.dueDate && suggestedDueDate && (
          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: T.greenDim, border: `1px solid ${T.green}40`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.green }}>Cash-flow optimal payment date</div>
              <div style={{ fontSize: 11, color: T.textDim }}>Based on your income & committed expenses â most headroom on {dateStr(suggestedDueDate)}.</div>
            </div>
            <button onClick={useSuggestedDate}
              style={{ background: T.green, color: "#0E0E10", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
              Use
            </button>
          </div>
        )}

        {/* Manual payment */}
        <div style={{ marginTop: 10 }}>
          {!showPayment ? (
            <button onClick={() => { setShowPayment(true); setEditing(false); }}
              style={{ background: T.surfaceHigh, color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
              + Record Manual Payment
            </button>
          ) : (
            <div style={{ background: T.surfaceHigh, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 10 }}>Record a payment</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginBottom: 8 }}>
                <Input label="Amount" type="number" value={paymentAmt}
                  onChange={e => setPaymentAmt(e.target.value)} placeholder={fmt(periodicPayment || 0)} />
                <Input label="Note (optional)" value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)} placeholder="e.g. Extra lump sum" />
              </div>
              {parseFloat(paymentAmt) > 0 && (
                <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8 }}>
                  New balance: {fmt(Math.max(0, balance - parseFloat(paymentAmt)), debt.currency)}
                  {rate > 0 && term > 0 && (
                    <span style={{ color: T.accent, marginLeft: 6 }}>
                      &rarr; new monthly payment: {fmt(calcPMT(Math.max(0, balance - parseFloat(paymentAmt)), rate, Math.max(1, term - 1)), debt.currency)}
                    </span>
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <Btn onClick={applyPayment} variant="success"><Check size={12} /> Apply</Btn>
                <Btn onClick={() => { setShowPayment(false); setPaymentAmt(""); setPaymentNote(""); }} variant="ghost">Cancel</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function LoanPromptModal({ prompt, debts, onAddDebt, onReduceDebt, onDismiss }) {
  const { tx, type, count } = prompt;
  const [selectedDebt, setSelectedDebt] = useState(debts[0]?.id || "");
  const [newDebtName, setNewDebtName] = useState(tx.description);
  const [loanAmount, setLoanAmount] = useState(parseFloat(tx.amount).toFixed(2));
  const confirmedAmount = parseFloat(loanAmount) || 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...S.card, padding: 24, maxWidth: 440, width: "100%", background: T.surface }}>
        <div className="hn" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: type === "received" ? T.purple : T.accent }}>
          {type === "received" ? "Loan Received â Liability" : "Loan Repayment â Reduces Liability"}
        </div>
        <div style={{ fontSize: 12, color: T.textDim, marginBottom: 16 }}>
          {type === "received"
            ? "This is a liability, not income â it creates a debt. Add it to the Debt tracker to track the balance."
            : "This payment reduces a liability. Link it to an existing debt to update the outstanding balance."}
        </div>

        <div style={{ background: T.surfaceHigh, borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</div>
            {count > 1 && (
              <div style={{ fontSize: 11, color: T.accent, marginTop: 2 }}>
                {count} transactions â total aggregated
              </div>
            )}
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: type === "received" ? T.purple : T.accent, flexShrink: 0 }}>
            {fmt(parseFloat(tx.amount), tx.currency || "EUR")}
          </span>
        </div>

        {type === "received" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Debt / Liability name</label>
              <input value={newDebtName} onChange={e => setNewDebtName(e.target.value)} style={{ ...S.input }} />
            </div>
            <div>
              <label style={S.label}>Total loan amount {count > 1 ? `(${count} transactions combined)` : "(edit if needed)"}</label>
              <input type="number" step="0.01" value={loanAmount}
                onChange={e => setLoanAmount(e.target.value)}
                style={{ ...S.input, borderColor: T.accent + "60" }} />
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>
                Opening balance will be set to {fmt(confirmedAmount, tx.currency || "EUR")}.
              </div>
            </div>
          </div>
        )}

        {type === "repayment" && debts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Apply repayment to</label>
            <select value={selectedDebt} onChange={e => setSelectedDebt(e.target.value)} style={{ ...S.input, marginBottom: 6 }}>
              {debts.map(d => (
                <option key={d.id} value={d.id}>{d.name} â balance {fmt(parseFloat(d.balance), d.currency)}</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: T.textDim }}>
              Balance will be reduced by {fmt(parseFloat(tx.amount).toFixed(2), tx.currency || "EUR")}
              {count > 1 ? ` (${count} repayments combined).` : "."}
            </div>
          </div>
        )}

        {type === "repayment" && debts.length === 0 && (
          <div style={{ fontSize: 12, color: T.textDim, marginBottom: 16, padding: "10px 12px", borderRadius: 8, background: T.surfaceHigh }}>
            No debts in tracker yet. Add a debt first in the Debt tab, then come back to link repayments.
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {type === "received" && confirmedAmount > 0 && (
            <Btn onClick={() => onAddDebt({
              id: Date.now().toString(),
              name: newDebtName,
              total: confirmedAmount.toFixed(2),
              balance: confirmedAmount.toFixed(2),
              currency: tx.currency || "EUR",
              rate: "", termMonths: "", dueDate: "",
            })}>
              <Plus size={13} /> Add to Debt Tracker
            </Btn>
          )}
          {type === "repayment" && selectedDebt && (
            <Btn variant="success" onClick={() => onReduceDebt(selectedDebt, parseFloat(parseFloat(tx.amount).toFixed(2)))}>
              <Check size={13} /> Apply Repayment
            </Btn>
          )}
          <Btn variant="ghost" onClick={onDismiss}>Dismiss</Btn>
        </div>
      </div>
    </div>
  );
}

function TxRow({ tx, onCategory, onDelete, onNature, onNewCategory, overheadGroups, debts, onAllocateDebt }) {
  const OG = overheadGroups || BUILTIN_OVERHEAD_GROUPS;
  const nature = tx.nature || defaultNature(tx.category);
  const [allocating, setAllocating] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState("");

  function applyAllocation() {
    if (!selectedDebt) return;
    onAllocateDebt && onAllocateDebt(selectedDebt, tx.amount);
    setAllocating(false);
  }

  return (
    <div className="row-hover" style={{ borderBottom: `1px solid ${T.border}`, padding: "10px 14px" }}>
      {/* Line 1: date Â· description Â· nature badge Â· amount */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: T.textDim, flexShrink: 0, width: 80 }}>{dateStr(tx.date)}</span>
        <span style={{ fontSize: 13, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tx.description || <span style={{ color: T.textDim, fontStyle: "italic" }}>No description</span>}
        </span>
        <button onClick={() => onNature && onNature(nature === "revenue" ? "capital" : nature === "capital" ? "balance_sheet" : "revenue")}
          title="Revenue / Capital / Balance Sheet"
          style={{ background: nature === "capital" ? T.purpleDim : nature === "balance_sheet" ? T.blueDim : T.surfaceHigh, color: nature === "capital" ? T.purple : nature === "balance_sheet" ? T.blue : T.textDim, border: `1px solid ${nature === "capital" ? T.purple+"50" : nature === "balance_sheet" ? T.blue+"50" : T.border}`, borderRadius: 5, padding: "1px 6px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, fontWeight: 600 }}>
          {nature === "capital" ? "CAP" : nature === "balance_sheet" ? "B/S" : "REV"}
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: tx.isCredit ? T.green : T.red, flexShrink: 0 }}>
          {tx.isCredit ? "+" : "-"}{fmt(tx.amount, tx.currency || "EUR")}
        </span>
      </div>

      {/* Line 2: category combo Â· badges Â· delete */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
        <CategoryCombo
          value={tx.category || ""}
          overheadGroups={OG}
          onNewCategory={label => { if (onNewCategory) onNewCategory(label); }}
          onChange={cat => onCategory(cat)}
          placeholder="Type or select category..."
        />
        {tx.debtAllocated && <Badge color="purple">Debt</Badge>}
        {tx.aiSuggested && <Badge color="blue">AI</Badge>}
        {tx.isPAYE && <Badge color="green">PAYE</Badge>}
        {/* Debt allocation button â only on outgoing transactions when debts exist */}
        {!tx.isCredit && debts && debts.length > 0 && !allocating && (
          <button onClick={() => { setAllocating(true); setSelectedDebt(debts[0]?.id || ""); }}
            title="Allocate this payment toward a debt"
            style={{ background: tx.debtAllocated ? T.purpleDim : T.surfaceHigh, color: tx.debtAllocated ? T.purple : T.textDim, border: `1px solid ${tx.debtAllocated ? T.purple+"50" : T.border}`, borderRadius: 5, padding: "2px 7px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" }}>
            {tx.debtAllocated ? "Reallocate" : "â Debt"}
          </button>
        )}
        <button onClick={onDelete} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}><X size={12} /></button>
      </div>

      {/* Line 3: debt allocation picker (expands inline) */}
      {allocating && debts && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }} onClick={e => e.stopPropagation()}>
          {(() => {
            const chosen = debts.find(d => d.id === selectedDebt);
            const preSnapshot = chosen && chosen.balanceAsOf && tx.date < chosen.balanceAsOf;
            return (
              <>
                {preSnapshot && (
                  <div style={{ fontSize: 11, color: T.accent, background: T.accentDim+"30", borderRadius: 6, padding: "5px 8px" }}>
                    This transaction ({dateStr(tx.date)}) is before the balance snapshot ({dateStr(chosen.balanceAsOf)}) â it will be tagged for record-keeping but the balance will not be reduced.
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <select value={selectedDebt} onChange={e => setSelectedDebt(e.target.value)}
                    style={{ ...S.input, fontSize: 11, padding: "4px 8px", flex: 1 }}>
                    {debts.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} â balance {fmt(parseFloat(d.balance), d.currency)}{d.balanceAsOf ? " (as of " + dateStr(d.balanceAsOf) + ")" : ""}
                      </option>
                    ))}
                  </select>
                  <Btn variant={preSnapshot ? "ghost" : "success"} style={{ fontSize: 11, padding: "5px 10px", flexShrink: 0 }} onClick={applyAllocation}>
                    <Check size={11} /> {preSnapshot ? "Tag only" : "Apply " + fmt(tx.amount, tx.currency || "EUR")}
                  </Btn>
                  <button onClick={() => setAllocating(false)}
                    style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 4, flexShrink: 0 }}>
                    <X size={12} />
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// âââ MANUAL TX FORM ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ManualTxForm({ onAdd, overheadGroups, onNewCategory }) {
  const OG = overheadGroups || BUILTIN_OVERHEAD_GROUPS;
  const [form, setForm] = useState({ date: today(), description: "", amount: "", currency: "EUR", isCredit: false, category: "", nature: "revenue" });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  function submit() {
    if (!form.description || !form.amount) return;
    onAdd({ ...form, amount: parseFloat(form.amount), isCredit: form.isCredit === true || form.isCredit === "true" });
    setForm(p => ({ ...p, description: "", amount: "", category: "", nature: "revenue" }));
  }
  return (
    <div>
      <div className="hn" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: T.textMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>Add Transaction Manually</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 8 }}>
        <Input label="Date" type="date" value={form.date} onChange={set("date")} />
        <div style={{ gridColumn: "span 2" }}>
          <Input label="Description" value={form.description} onChange={set("description")} placeholder="e.g. Lidl weekly shop" />
        </div>
        <Input label="Amount" type="number" value={form.amount} onChange={set("amount")} placeholder="0.00" />
        <Select label="Currency" value={form.currency} onChange={set("currency")}>
          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
        </Select>
        <div>
          <label style={S.label}>Type</label>
          <div style={{ display: "flex", gap: 5 }}>
            {[{ v: false, l: "Expense" }, { v: true, l: "Income" }].map(({ v, l }) => (
              <button key={l} onClick={() => setForm(p => ({ ...p, isCredit: v }))}
                style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${form.isCredit === v ? (v ? T.green : T.red) : T.border}`, background: form.isCredit === v ? (v ? T.greenDim : T.redDim) : "transparent", color: form.isCredit === v ? (v ? T.green : T.red) : T.textMid, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: form.isCredit === v ? 700 : 400 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={S.label}>Nature</label>
          <div style={{ display: "flex", gap: 5 }}>
            {[{ v: "revenue", l: "Revenue" }, { v: "capital", l: "Capital" }].map(({ v, l }) => (
              <button key={v} onClick={() => setForm(p => ({ ...p, nature: v }))}
                style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${form.nature === v ? T.accent : T.border}`, background: form.nature === v ? T.accentDim + "40" : "transparent", color: form.nature === v ? T.accent : T.textMid, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: form.nature === v ? 700 : 400 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={S.label}>Category</label>
          <CategoryCombo
            value={form.category}
            overheadGroups={OG}
            onNewCategory={label => {
              if (onNewCategory) onNewCategory(label);
            }}
            onChange={cat => {
              setForm(p => ({ ...p, category: cat, nature: defaultNature(cat) }));
            }}
            placeholder="Type or select category..."
            style={{ fontSize: 12 }}
          />
        </div>
      </div>
      <Btn onClick={submit} style={{ marginTop: 2 }}><Plus size={12} /> Add Transaction</Btn>
    </div>
  );
}

// âââ ADD OVERHEAD FORM ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AddOverheadForm({ onAdd }) {
  const allGroups = [...Object.keys(BUILTIN_OVERHEAD_GROUPS), "Custom"];
  const [form, setForm] = useState({ label: "", group: "Other", nature: "revenue", newGroup: "" });
  function submit() {
    if (!form.label.trim()) return;
    const group = form.group === "Custom" ? (form.newGroup.trim() || "Custom") : form.group;
    onAdd({ label: form.label.trim(), group, nature: form.nature });
    setForm(p => ({ ...p, label: "", newGroup: "" }));
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
        <div style={{ gridColumn: "span 2" }}>
          <Input label="Category name" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. ESB Smart Meter" />
        </div>
        <div>
          <label style={S.label}>Group</label>
          <select value={form.group} onChange={e => setForm(p => ({ ...p, group: e.target.value }))} style={{ ...S.input, fontSize: 11 }}>
            {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {form.group === "Custom" && (
          <Input label="New group name" value={form.newGroup} onChange={e => setForm(p => ({ ...p, newGroup: e.target.value }))} placeholder="Group name" />
        )}
        <div>
          <label style={S.label}>Nature</label>
          <div style={{ display: "flex", gap: 4 }}>
            {[{ v: "revenue", l: "Revenue" }, { v: "capital", l: "Capital" }].map(({ v, l }) => (
              <button key={v} onClick={() => setForm(p => ({ ...p, nature: v }))}
                style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border: `1px solid ${form.nature === v ? (v === "capital" ? T.purple : T.accent) : T.border}`, background: form.nature === v ? (v === "capital" ? T.purpleDim : T.accentDim + "40") : "transparent", color: form.nature === v ? (v === "capital" ? T.purple : T.accent) : T.textMid, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: form.nature === v ? 700 : 400 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <Btn onClick={submit}><Plus size={12} /> Add Category</Btn>
      </div>
    </div>
  );
}


// âââ RULE EDITOR âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function RuleEditor({ rule, overheadGroups, onChange, onDelete }) {
  const OG = overheadGroups || BUILTIN_OVERHEAD_GROUPS;
  const [keywordsStr, setKeywordsStr] = useState((rule.keywords || []).join(", "));
  const [category, setCategory] = useState(rule.category || "");
  const [dirty, setDirty] = useState(rule.isNew || false);
  const [savedMsg, setSavedMsg] = useState("");

  function save() {
    const keywords = keywordsStr.split(",").map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    if (keywords.length === 0 || !category) return;
    onChange({ ...rule, keywords, category, created: rule.created || today(), isNew: false });
    setDirty(false);
    setSavedMsg("Rule saved â applying to transactions...");
    setTimeout(() => setSavedMsg(""), 3000);
  }

  function handleKeywordsChange(e) {
    setKeywordsStr(e.target.value);
    setDirty(true);
  }

  function handleCategoryChange(val) {
    setCategory(val);
    setDirty(true);
  }

  return (
    <div style={{ borderRadius: 8, background: T.surfaceHigh, border: `1px solid ${dirty ? T.accent + "50" : T.border}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", flexWrap: "wrap" }}>
        {/* Keywords field */}
        <div style={{ flex: 2, minWidth: 160 }}>
          <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Keywords (comma-separated)</div>
          <input
            value={keywordsStr}
            onChange={handleKeywordsChange}
            onKeyDown={e => e.key === "Enter" && save()}
            placeholder="e.g. lidl, tesco, supervalu"
            style={{ ...S.input, fontSize: 12, padding: "5px 8px", borderColor: dirty ? T.accent + "60" : T.border }}
          />
        </div>

        {/* Arrow */}
        <div style={{ color: T.textDim, fontSize: 16, flexShrink: 0, paddingTop: 16 }}>&rarr;</div>

        {/* Category combo */}
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Category</div>
          <CategoryCombo
            value={category}
            overheadGroups={OG}
            onChange={val => handleCategoryChange(val)}
            placeholder="Select or type..."
            style={{ fontSize: 12 }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, paddingTop: dirty ? 0 : 16 }}>
          {dirty && (
            <Btn onClick={save} style={{ fontSize: 11, padding: "5px 12px" }}>
              <Check size={11} /> Save
            </Btn>
          )}
          <button onClick={onDelete} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 4 }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Footer: saved message or keyword pills */}
      {savedMsg ? (
        <div style={{ padding: "4px 12px 8px", fontSize: 11, color: T.green }}>{savedMsg}</div>
      ) : (!dirty && rule.keywords && rule.keywords.filter(k => k).length > 0 && (
        <div style={{ padding: "4px 12px 8px", fontSize: 11, color: T.textDim }}>
          Created {rule.created} &middot; {rule.keywords.filter(k => k).map(k => (
            <span key={k} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: "1px 6px", marginRight: 4, color: T.textMid }}>{k}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

// âââ BUDGETING TAB ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function BudgetingTab({ transactions, overheadGroups, committed }) {
  const [period, setPeriod] = useState("thisMonth");
  const [budgets, setBudgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ft_budgets") || "{}"); } catch { return {}; }
  });
  const [editingGroup, setEditingGroup] = useState(null);
  useEffect(() => { try { localStorage.setItem("ft_budgets", JSON.stringify(budgets)); } catch {} }, [budgets]);

  const { from, to, label: periodLabel } = useMemo(() => {
    const now = new Date();
    if (period === "thisMonth") {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0], to: new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split("T")[0], label: now.toLocaleDateString("en-IE", { month: "long", year: "numeric" }) };
    }
    if (period === "lastMonth") {
      const d = new Date(now.getFullYear(), now.getMonth()-1, 1);
      return { from: d.toISOString().split("T")[0], to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0], label: d.toLocaleDateString("en-IE", { month: "long", year: "numeric" }) };
    }
    if (period === "last3") {
      return { from: new Date(now.getFullYear(), now.getMonth()-2, 1).toISOString().split("T")[0], to: new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split("T")[0], label: "Last 3 Months" };
    }
    return { from: new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0], to: new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0], label: `${now.getFullYear()}` };
  }, [period]);

  const actualByGroup = useMemo(() => {
    const r = {};
    transactions.forEach(tx => {
      if (tx.isCredit || !tx.category || tx.date < from || tx.date > to) return;
      let g = "Other";
      for (const [grp, cats] of Object.entries(overheadGroups)) { if (cats.includes(tx.category)) { g = grp; break; } }
      r[g] = (r[g] || 0) + tx.amount;
    });
    return r;
  }, [transactions, overheadGroups, from, to]);

  const committedByGroup = useMemo(() => {
    const r = {};
    committed.filter(c => c.currency === "EUR").forEach(c => {
      const rec = RECURRENCES.find(x => x.v === c.recurrence);
      const monthly = (parseFloat(c.amount) || 0) * (rec?.ppy || 0) / 12;
      r[c.group || "Other"] = (r[c.group || "Other"] || 0) + monthly;
    });
    return r;
  }, [committed]);

  const allGroups = useMemo(() => {
    const gs = new Set([...Object.keys(actualByGroup), ...Object.keys(budgets), ...Object.keys(committedByGroup)]);
    ["Income","Assets","Liabilities"].forEach(g => gs.delete(g));
    return [...gs].sort();
  }, [actualByGroup, budgets, committedByGroup]);

  const totalBudget = Object.values(budgets).reduce((s, v) => s + (parseFloat(v)||0), 0);
  const totalActual = Object.values(actualByGroup).reduce((s, v) => s + v, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...S.card, padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="hn" style={{ fontSize: 15, fontWeight: 700 }}>Budget vs Actual</div>
            <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>{periodLabel} Â· Click any row to set a budget</div>
          </div>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ ...S.input, width: "auto", fontSize: 12, padding: "6px 10px" }}>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="last3">Last 3 Months</option>
            <option value="thisYear">This Year</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
          {[{label:"Total Budget",value:fmt(totalBudget),color:T.accent},{label:"Total Spent",value:fmt(totalActual),color:totalActual>totalBudget&&totalBudget>0?T.red:T.text},{label:"Remaining",value:fmt(Math.max(0,totalBudget-totalActual)),color:T.green}].map(({label,value,color})=>(
            <div key={label} style={{ background: T.surfaceHigh, borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...S.card, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 80px", gap: 8 }}>
          {["Category Group","Budget/Mo","Committed","Actual","Status"].map(h=>(
            <div key={h} style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>
        {allGroups.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.textDim, fontSize: 13 }}>Import transactions or add committed expenses to see budget data.</div>}
        {allGroups.map(group => {
          const budget = parseFloat(budgets[group])||0, actual = actualByGroup[group]||0, comm = committedByGroup[group]||0;
          const pct = budget > 0 ? Math.min(100, (actual/budget)*100) : 0, over = budget > 0 && actual > budget;
          return (
            <div key={group} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 80px", gap: 8, padding: "12px 20px", alignItems: "center", cursor: "pointer" }} onClick={() => setEditingGroup(editingGroup===group?null:group)}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{group}</div>
                <div style={{ fontSize: 13, color: budget>0?T.accent:T.textDim }}>{budget>0?fmt(budget):<span style={{fontSize:11}}>â set</span>}</div>
                <div style={{ fontSize: 13, color: comm>0?T.text:T.textDim }}>{comm>0?fmt(comm):"â"}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: over?T.red:T.text }}>{fmt(actual)}</div>
                <div>{budget>0?<Badge color={over?"red":pct>80?"accent":"green"}>{over?"Over":Math.round(pct)+"%"}</Badge>:actual>0?<Badge color="dim">No budget</Badge>:null}</div>
              </div>
              {budget > 0 && <div style={{ height: 2, background: T.border }}><div style={{ height: "100%", width: pct+"%", background: over?T.red:pct>80?T.accent:T.green, transition: "width 0.4s" }} /></div>}
              {editingGroup === group && (
                <div style={{ padding: "12px 20px", background: T.surfaceHigh, display: "flex", gap: 10, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                  <span style={{ fontSize: 12, color: T.textMid }}>Monthly budget for <b style={{color:T.text}}>{group}</b>:</span>
                  <input type="number" placeholder="0.00" defaultValue={budgets[group]||""}
                    style={{ ...S.input, width: 120, fontSize: 13, padding: "6px 10px" }}
                    onKeyDown={e => {
                      if (e.key==="Enter") { const v=parseFloat(e.target.value)||0; setBudgets(p=>v>0?{...p,[group]:v}:Object.fromEntries(Object.entries(p).filter(([k])=>k!==group))); setEditingGroup(null); }
                      if (e.key==="Escape") setEditingGroup(null);
                    }} autoFocus />
                  <span style={{ fontSize: 11, color: T.textDim }}>Enter to save Â· Esc to cancel</span>
                  {budgets[group] && <button onClick={()=>{setBudgets(p=>Object.fromEntries(Object.entries(p).filter(([k])=>k!==group)));setEditingGroup(null);}} style={{background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:11}}>Clear</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: T.textDim, padding: "0 4px" }}>ð¡ Budgets are monthly targets. Click any row to set or edit.</div>
    </div>
  );
}
