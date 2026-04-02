// src/utils/validation.js
// Centralised validation for FinTrack IE forms.

const CURRENCIES = ["EUR", "INR", "USD", "GBP"];
const RECURRENCES = ["monthly", "fortnightly", "weekly", "quarterly", "annually", "once"];

function isValidDate(str) {
  if (!str) return false;
  const d = new Date(str + "T12:00:00");
  return !isNaN(d.getTime());
}

/**
 * Validate a manual transaction before saving.
 * @param {Object} tx
 * @returns {Object} errors — empty means valid
 */
export function validateTransaction(tx) {
  const errors = {};

  if (!tx.date || !isValidDate(tx.date))
    errors.date = "Date is required and must be a valid date";

  if (!tx.description || !tx.description.trim())
    errors.description = "Description cannot be empty";

  const amount = parseFloat(tx.amount);
  if (!tx.amount || isNaN(amount) || amount <= 0)
    errors.amount = "Amount must be greater than 0";

  return errors;
}

/**
 * Validate a debt before saving.
 * @param {Object} debt
 * @returns {Object} errors — empty means valid
 */
export function validateDebt(debt) {
  const errors = {};

  if (!debt.name || !String(debt.name).trim())
    errors.name = "Debt name is required";

  const balance = parseFloat(debt.balance);
  if (debt.balance === "" || debt.balance === undefined || isNaN(balance))
    errors.balance = "Current balance is required";
  else if (balance < 0)
    errors.balance = "Balance cannot be negative";
  else if (balance === 0)
    errors.balance = "Cannot add debt with \u20AC0 balance";

  const rate = parseFloat(debt.rate);
  if (debt.rate === "" || debt.rate === undefined || isNaN(rate) || rate < 0 || rate > 100)
    errors.rate = "Rate must be between 0 and 100%";

  if (debt.termMonths !== "" && debt.termMonths !== undefined) {
    const term = parseFloat(debt.termMonths);
    if (!isNaN(term) && term <= 0)
      errors.termMonths = "Term must be a positive number";
  }

  if (debt.knownPayment !== "" && debt.knownPayment !== undefined) {
    const pmt = parseFloat(debt.knownPayment);
    if (!isNaN(pmt) && pmt <= 0)
      errors.knownPayment = "Payment must be greater than 0";
  }

  if (debt.currency && !CURRENCIES.includes(debt.currency))
    errors.currency = "Invalid currency";

  return errors;
}

/**
 * Validate a committed direct debit / standing order before saving.
 * @param {Object} committed
 * @returns {Object} errors — empty means valid
 */
export function validateCommitted(committed) {
  const errors = {};

  if (!committed.name || !String(committed.name).trim())
    errors.name = "Name is required";

  const amount = parseFloat(committed.amount);
  if (!committed.amount || isNaN(amount) || amount <= 0)
    errors.amount = "Amount must be greater than \u20AC0";

  if (!committed.startDate || !isValidDate(committed.startDate))
    errors.startDate = "Start date is required";

  if (committed.recurrence && !RECURRENCES.includes(committed.recurrence))
    errors.recurrence = "Invalid recurrence value";

  if (committed.currency && !CURRENCIES.includes(committed.currency))
    errors.currency = "Invalid currency";

  return errors;
}
