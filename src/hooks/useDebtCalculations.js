/**
 * useDebtCalculations.js
 * A custom hook for performing various debt-related calculations.
 */

/**
 * Calculates the monthly payment for a loan.
 * 
 * @param {number} principal - The loan amount.
 * @param {number} annualRate - The annual interest rate (as a decimal).
 * @param {number} payments - The total number of payments.
 * @returns {number} The monthly payment amount.
 */
export const calculatePMT = (principal, annualRate, payments) => {
  const monthlyRate = annualRate / 12;
  return (principal * monthlyRate) / (1 - Math.pow((1 + monthlyRate), -payments));
};

/**
 * Calculates the term of a loan in months.
 * 
 * @param {number} principal - The loan amount.
 * @param {number} monthlyPayment - The monthly payment amount.
 * @param {number} annualRate - The annual interest rate (as a decimal).
 * @returns {number} The number of months until the loan is paid off.
 */
export const calculateTerm = (principal, monthlyPayment, annualRate) => {
  const monthlyRate = annualRate / 12;
  return Math.log(monthlyPayment / (monthlyPayment - principal * monthlyRate)) / Math.log(1 + monthlyRate);
};

/**
 * Calculates the remaining balance of a loan after a certain number of payments.
 * 
 * @param {number} principal - The loan amount.
 * @param {number} annualRate - The annual interest rate (as a decimal).
 * @param {number} paymentsMade - The number of payments made.
 * @returns {number} The remaining loan balance.
 */
export const calculateBalance = (principal, annualRate, paymentsMade) => {
  const monthlyRate = annualRate / 12;
  return principal * Math.pow((1 + monthlyRate), paymentsMade) - calculatePMT(principal, annualRate, paymentsMade) * ((Math.pow((1 + monthlyRate), paymentsMade) - 1) / monthlyRate);
};

/**
 * Generates an amortization schedule for the loan.
 * 
 * @param {number} principal - The loan amount.
 * @param {number} annualRate - The annual interest rate (as a decimal).
 * @param {number} term - The total number of payments.
 * @returns {Array<Object>} An array of objects representing each month's payment details.
 */
export const generateAmortizationSchedule = (principal, annualRate, term) => {
  const monthlyPayment = calculatePMT(principal, annualRate, term);
  const schedule = [];
  let balance = principal;

  for (let i = 0; i < term; i++) {
    const interestPayment = balance * (annualRate / 12);
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;

    schedule.push({
      month: i + 1,
      interestPayment,
      principalPayment,
      remainingBalance: balance > 0 ? balance : 0
    });
  }

  return schedule;
};
