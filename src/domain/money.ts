/**
 * Money utilities for INR currency representation.
 *
 * Go vs TypeScript note:
 * Floating-point numbers (IEEE 754 float64 in JS, float64 in Go) introduce rounding errors
 * (e.g. 0.1 + 0.2 = 0.30000000000000004).
 * We store all amounts as positive integer cents/paise (1 Rupee = 100 paise).
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrFormatterCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Formats integer cents into standard Indian currency format (e.g. 10050 -> "₹100.50").
 */
export function formatINR(
  cents: number,
  options?: {
    showSign?: boolean;
    compactIfZeroPaise?: boolean;
  }
): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const rupees = absCents / 100;

  const hasPaise = absCents % 100 !== 0;
  const formatter = (options?.compactIfZeroPaise && !hasPaise)
    ? inrFormatterCompact
    : inrFormatter;

  const formatted = formatter.format(rupees);

  if (isNegative) {
    return `-${formatted}`;
  }
  if (options?.showSign && cents > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Parses user input string (e.g. "1500", "1500.50", "₹1,500.75") into integer cents.
 * Avoids direct float multiplication by separating integer rupees and fractional paise.
 * Returns null if the string cannot be parsed into a positive integer cents value.
 */
export function parseINRToCents(input: string): number | null {
  // Strip whitespace, rupee symbols, commas
  const cleaned = input.trim().replace(/₹/g, '').replace(/,/g, '').trim();
  if (cleaned.length === 0) {
    return null;
  }

  // Check valid numeric pattern: e.g. 123 or 123.4 or 123.45
  const match = cleaned.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    return null;
  }

  const rupeeStr = match[1];
  const paiseStr = match[2];

  if (!rupeeStr) {
    return null;
  }

  const rupees = parseInt(rupeeStr, 10);
  if (Number.isNaN(rupees)) {
    return null;
  }

  let paise = 0;
  if (paiseStr !== undefined) {
    if (paiseStr.length === 1) {
      paise = parseInt(paiseStr, 10) * 10;
    } else {
      paise = parseInt(paiseStr.slice(0, 2), 10);
    }
  }

  const totalCents = rupees * 100 + paise;
  if (totalCents <= 0 || !Number.isSafeInteger(totalCents)) {
    return null;
  }

  return totalCents;
}
