import { useMemo } from 'react';

/**
 * Custom hook for all debt calculation logic
 * 
 * @param {Array} debts - Array of debt objects
 * @param {Array} assets - Array of asset objects  
 * @param {Array} transactions - Array of transactions for payment history
 * @returns {Object} - Calculated debt metrics and helper functions
 */
export function useDebtCalculations(debts = [], assets = [], transactions = []) {
  
  // Debt frequency mapping
  const DEBT_FREQ = { monthly: 12, fortnightly: 26, weekly: 52 };

  /**
   * Calculate monthly payment (PMT) for a loan
   * Standard amortization formula
   * 
   * @param {number} balance - Current loan balance
   * @param {number} annualRatePct - Annual interest rate as percentage (e.g., 8.5)
   * @param {number} termMonths - Loan term in months
   * @param {string} frequency - Payment frequency (monthly, fortnightly, weekly)
   * @returns {number} - Calculated periodic payment
   */
  const calcPMT = (balance, annualRatePct, termMonths, frequency = 'monthly') => {
    const P = parseFloat(balance) || 0;
    const freq = DEBT_FREQ[frequency] || 12;
    
    // Convert term to periods based on frequency
    const termPeriods = frequency === 'fortnightly' 
      ? Math.round((parseInt(termMonths) || 0) * 26 / 12)
      : frequency === 'weekly' 
      ? Math.round((parseInt(termMonths) || 0) * 52 / 12)
      : parseInt(termMonths) || 0;
    
    const r = (parseFloat(annualRatePct) || 0) / 100 / freq;
    
    if (P <= 0 || termPeriods <= 0) return 0;
    if (r === 0) return P / termPeriods;
    
    // PMT = P * r / (1 - (1 + r)^-n)
    return (P * r) / (1 - Math.pow(1 + r, -termPeriods));
  };

  /**
   * Calculate payoff months given balance, rate, and periodic payment
   * Used to determine how long until debt is cleared
   * 
   * @param {number} balance - Current loan balance
   * @param {number} annualRatePct - Annual interest rate as percentage
   * @param {number} periodicPayment - Regular payment amount
   * @param {string} frequency - Payment frequency
   * @returns {number|null} - Months until payoff, or null if impossible
   */
  const calcPayoffMonths = (balance, annualRatePct, periodicPayment, frequency = 'monthly') => {
    const P = parseFloat(balance) || 0;
    const freq = DEBT_FREQ[frequency] || 12;
    const r = (parseFloat(annualRatePct) || 0) / 100 / freq;
    const pmt = parseFloat(periodicPayment) || 0;
    
    if (P <= 0 || pmt <= 0) return null;
    if (r === 0) return Math.ceil((P / pmt) * (12 / freq));
    if (pmt <= P * r) return null; // Payment too low to cover interest
    
    // n = -log(1 - Pr/pmt) / log(1 + r)
    const periods = Math.ceil(-Math.log(1 - (P * r) / pmt) / Math.log(1 + r));
    return Math.ceil(periods * 12 / freq);
  };

  /**
   * Calculate term in months from balance, rate, and known payment
   * 
   * @param {number} balance - Current loan balance
   * @param {number} annualRatePct - Annual interest rate as percentage
   * @param {number} periodicPayment - Regular payment amount
   * @param {string} frequency - Payment frequency
   * @returns {number} - Term in months
   */
  const calcTermFromPayment = (balance, annualRatePct, periodicPayment, frequency = 'monthly') => {
    return calcPayoffMonths(balance, annualRatePct, periodicPayment, frequency);
  };

  /**
   * Generate full amortization schedule
   * Shows principal vs interest breakdown for each payment
   * 
   * @param {Object} debt - Debt object with balance, rate, termMonths
   * @param {number} numPayments - Number of payments to generate (default: all)
   * @returns {Array} - Array of payment objects with interest/principal breakdown
   */
  const generateAmortizationSchedule = (debt, numPayments = null) => {
    const balance = parseFloat(debt.balance) || 0;
    const annualRate = parseFloat(debt.rate) || 0;
    const term = parseInt(debt.termMonths) || 0;
    const frequency = debt.paymentFrequency || 'monthly';
    
    if (balance <= 0 || term <= 0) return [];
    
    const freq = DEBT_FREQ[frequency] || 12;
    const monthlyPayment = calcPMT(balance, annualRate, term, frequency);
    const periodicRate = annualRate / 100 / freq;
    const paymentCount = numPayments || term;
    
    const schedule = [];
    let remainingBalance = balance;
    let paymentDate = new Date(debt.dueDate || new Date());
    
    for (let i = 0; i < paymentCount && remainingBalance > 0; i++) {
      const interestPayment = remainingBalance * periodicRate;
      const principalPayment = Math.min(remainingBalance, monthlyPayment - interestPayment);
      remainingBalance = Math.max(0, remainingBalance - principalPayment);
      
      // Calculate next payment date
      if (frequency === 'weekly') {
        paymentDate.setDate(paymentDate.getDate() + 7);
      } else if (frequency === 'fortnightly') {
        paymentDate.setDate(paymentDate.getDate() + 14);
      } else {
        paymentDate.setMonth(paymentDate.getMonth() + 1);
      }
      
      schedule.push({
        paymentNumber: i + 1,
        dueDate: paymentDate.toISOString().split('T')[0],
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        remainingBalance: remainingBalance,
      });
    }
    
    return schedule;
  };

  /**
   * Calculate optimal due date based on cash flow timeline
   * Finds the day in next 31 days with highest net cash position
   * 
   * @param {Array} timeline60 - Array of event objects with date, type, amount
   * @param {number} paymentAmount - The payment amount to budget for
   * @returns {string|null} - ISO date string or null
   */
  const calcOptimalDueDate = (timeline60, paymentAmount) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = 31;
    
    // Build daily cash flow map for next 31 days
    const flow = {};
    for (let i = 1; i <= days; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const key = d.toISOString().split('T')[0];
      flow[key] = 0;
    }
    
    timeline60.forEach(ev => {
      const key = ev.date.toISOString().split('T')[0];
      if (!flow.hasOwnProperty(key)) return;
      if (ev.type === 'income') flow[key] += ev.amount;
      else flow[key] -= ev.amount; // bills and debts are outflows
    });
    
    // Find day with best running surplus AFTER payment
    let bestDate = null;
    let bestScore = -Infinity;
    let running = 0;
    
    const keys = Object.keys(flow).sort();
    keys.forEach(key => {
      running += flow[key];
      const score = running - paymentAmount; // headroom after payment
      if (score > bestScore) {
        bestScore = score;
        bestDate = key;
      }
    });
    
    return bestDate;
  };

  /**
   * Build payment history with interest/principal breakdown
   * Matches transactions to debts by description
   * 
   * @param {Object} debt - Single debt object
   * @param {Array} txPayments - Transaction payment records
   * @returns {Array} - Payment history with running balance
   */
  const buildPaymentHistory = (debt, txPayments = []) => {
    const freq = DEBT_FREQ[debt.paymentFrequency || 'monthly'] || 12;
    const periodicRate = (parseFloat(debt.rate) || 0) / 100 / freq;
    const original = parseFloat(debt.total || debt.balance) || 0;
    
    // Deduplicate and sort by date
    const allPayments = txPayments
      .filter((p, i, a) => a.findIndex(x => x.id === p.id) === i)
      .sort((a, b) => a.date?.localeCompare(b.date));
    
    // Calculate interest and principal for each payment
    let bal = original;
    return allPayments.map(p => {
      const interest = bal * periodicRate;
      const principal = Math.min(bal, Math.max(0, p.amount - interest));
      bal = Math.max(0, bal - principal);
      
      return {
        ...p,
        interest: periodicRate > 0 ? interest : 0,
        principal: periodicRate > 0 ? principal : p.amount,
        balanceAfter: bal,
      };
    });
  };

  /**
   * Get all debts sorted by Avalanche method (highest rate first)
   * This is the optimal strategy to minimize interest paid
   * 
   * @returns {Array} - Debts sorted by interest rate descending
   */
  const debtsSortedByAvalanche = useMemo(() => {
    return [...debts].sort((a, b) => 
      (parseFloat(b.rate) || 0) - (parseFloat(a.rate) || 0)
    );
  }, [debts]);

  /**
   * Get summary totals for all debts and assets
   * 
   * @returns {Object} - { totalBalance, totalAssets, netPosition }
   */
  const totals = useMemo(() => {
    const totalBalance = debts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0);
    const totalAssets = assets.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
    
    return {
      totalBalance,
      totalAssets,
      netPosition: totalAssets - totalBalance,
    };
  }, [debts, assets]);

  /**
   * Calculate comprehensive metrics for a single debt
   * Used for debt cards and dashboard display
   * 
   * @param {Object} debt - Debt object
   * @returns {Object} - Calculated metrics (payment, payoff date, progress, etc.)
   */
  const getDebtMetrics = (debt) => {
    const balance = parseFloat(debt.balance) || 0;
    const original = parseFloat(debt.total || debt.balance) || 0;
    const rate = parseFloat(debt.rate) || 0;
    const term = parseInt(debt.termMonths) || 0;
    const freq = debt.paymentFrequency || 'monthly';
    const knownPmt = parseFloat(debt.knownPayment) || 0;
    
    const monthlyPayment = knownPmt || calcPMT(balance, rate, term, freq) || 0;
    const payoffMonths = calcPayoffMonths(balance, rate, monthlyPayment, freq);
    
    return {
      balance,
      original,
      rate,
      term,
      frequency: freq,
      monthlyPayment,
      payoffMonths,
      payoffDate: payoffMonths 
        ? new Date(Date.now() + payoffMonths * 30.44 * 86400000).toLocaleDateString('en-IE', {
            month: 'short',
            year: 'numeric'
          })
        : null,
      progressPercent: original > 0 ? Math.min(100, ((original - balance) / original) * 100) : 0,
      interestAccrued: original - balance,
      totalInterestRemaining: payoffMonths ? (monthlyPayment * payoffMonths - balance) : 0,
    };
  };

  /**
   * Calculate total interest that will be paid across all debts
   * Useful for debt dashboard summary
   * 
   * @returns {number} - Total interest remaining to be paid
   */
  const totalInterestRemaining = useMemo(() => {
    return debts.reduce((sum, debt) => {
      const metrics = getDebtMetrics(debt);
      return sum + metrics.totalInterestRemaining;
    }, 0);
  }, [debts]);

  return {
    // Core calculation functions
    calcPMT,
    calcPayoffMonths,
    calcTermFromPayment,
    calcOptimalDueDate,
    generateAmortizationSchedule,
    buildPaymentHistory,
    getDebtMetrics,
    
    // Summary data (memoized)
    debtsSortedByAvalanche,
    totals,
    totalInterestRemaining,
    
    // Constants
    DEBT_FREQ,
  };
}

// Export individual calculation functions for testing
export {
  calcPMT as calculatePMT,
  generateAmortizationSchedule,
};
