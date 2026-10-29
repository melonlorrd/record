/**
 * Multi-Currency & Money Utilities.
 *
 * Architecture rules:
 * - We store all amounts as positive integer cents (1 Major Unit = 100 Minor Units / Cents / Paise).
 * - Floating point arithmetic is forbidden for currency calculations.
 * - Dynamic currency formatting supports INR (₹ default), USD ($), EUR (€), GBP (£), and others.
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  fractionDigits: number;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', fractionDigits: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', fractionDigits: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', fractionDigits: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', fractionDigits: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', fractionDigits: 0 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', fractionDigits: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', fractionDigits: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', fractionDigits: 2 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'ar-AE', fractionDigits: 2 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH', fractionDigits: 2 },
];

export function getCurrencyInfo(currencyCode: string): CurrencyInfo {
  const upper = (currencyCode || 'INR').toUpperCase().trim();
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === upper);
  if (found) return found;

  return {
    code: upper,
    symbol: upper,
    name: upper,
    locale: 'en-US',
    fractionDigits: 2,
  };
}

export function getCurrencySymbol(currencyCode: string): string {
  return getCurrencyInfo(currencyCode).symbol;
}

let activeCurrencyCode = 'INR';

export function setActiveCurrency(code: string): void {
  if (code) {
    activeCurrencyCode = code.toUpperCase().trim();
  }
}

export function getActiveCurrency(): string {
  return activeCurrencyCode;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currencyCode: string, compact: boolean): Intl.NumberFormat {
  const info = getCurrencyInfo(currencyCode);
  const key = `${info.code}_${compact}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const digits = compact ? 0 : info.fractionDigits;
  const formatter = new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: info.code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  formatterCache.set(key, formatter);
  return formatter;
}

/**
 * Formats integer cents into currency format (e.g. 10050 -> "₹100.50" or "$100.50").
 */
export function formatMoney(
  cents: number,
  options?: {
    showSign?: boolean;
    compactIfZeroPaise?: boolean;
  },
  currencyCode?: string
): string {
  const code = currencyCode || activeCurrencyCode;
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const majorUnits = absCents / 100;

  const hasSubunits = absCents % 100 !== 0;
  const isCompact = !!(options?.compactIfZeroPaise && !hasSubunits);
  const formatter = getFormatter(code, isCompact);

  const formatted = formatter.format(majorUnits);

  if (isNegative) {
    return formatted.startsWith('-') ? formatted : `-${formatted}`;
  }
  if (options?.showSign && cents > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Backward-compatible helper that defaults to active currency.
 */
export function formatINR(
  cents: number,
  options?: {
    showSign?: boolean;
    compactIfZeroPaise?: boolean;
  }
): string {
  return formatMoney(cents, options, activeCurrencyCode);
}

/**
 * Parses user input string (e.g. "1500", "1500.50", "₹1,500.75", "$1,500.75") into integer cents.
 * Avoids direct float multiplication by separating integer units and fractional subunits.
 * Returns null if the string cannot be parsed into a positive integer cents value.
 */
export function parseMoneyToCents(input: string): number | null {
  // Strip whitespace, symbols, commas
  const cleaned = input
    .trim()
    .replace(/[₹$€£¥]/g, '')
    .replace(/CA\$|A\$|S\$|AED|CHF/gi, '')
    .replace(/,/g, '')
    .trim();

  if (cleaned.length === 0) {
    return null;
  }

  // Check valid numeric pattern: e.g. 123 or 123.4 or 123.45
  const match = cleaned.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    return null;
  }

  const majorStr = match[1];
  const minorStr = match[2];

  if (!majorStr) {
    return null;
  }

  const major = parseInt(majorStr, 10);
  if (Number.isNaN(major)) {
    return null;
  }

  let minor = 0;
  if (minorStr !== undefined) {
    if (minorStr.length === 1) {
      minor = parseInt(minorStr, 10) * 10;
    } else {
      minor = parseInt(minorStr.slice(0, 2), 10);
    }
  }

  const totalCents = major * 100 + minor;
  if (totalCents <= 0 || !Number.isSafeInteger(totalCents)) {
    return null;
  }

  return totalCents;
}

export const parseINRToCents = parseMoneyToCents;
