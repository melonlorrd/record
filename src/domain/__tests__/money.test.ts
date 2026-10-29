import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatINR,
  formatMoney,
  parseINRToCents,
  parseMoneyToCents,
  setActiveCurrency,
  getActiveCurrency,
  getCurrencySymbol,
} from '../money';

describe('Money utilities (Multi-currency & integer cents)', () => {
  beforeEach(() => {
    setActiveCurrency('INR');
  });

  it('formats positive and negative amounts correctly in INR by default', () => {
    expect(formatINR(10050)).toBe('₹100.50');
    expect(formatINR(-50000)).toBe('-₹500.00');
    expect(formatINR(12500000)).toBe('₹1,25,000.00');
    expect(formatINR(10000, { compactIfZeroPaise: true })).toBe('₹100');
  });

  it('formats amounts in other currencies when requested', () => {
    expect(formatMoney(10050, undefined, 'USD')).toBe('$100.50');
    expect(formatMoney(25000, { compactIfZeroPaise: true }, 'USD')).toBe('$250');
    expect(formatMoney(5000, undefined, 'GBP')).toBe('£50.00');
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('dynamically adapts formatINR when active currency is changed', () => {
    expect(getActiveCurrency()).toBe('INR');
    expect(formatINR(10000)).toBe('₹100.00');

    setActiveCurrency('USD');
    expect(getActiveCurrency()).toBe('USD');
    expect(formatINR(10000)).toBe('$100.00');

    setActiveCurrency('INR');
  });

  it('parses valid user input cleanly without floating point precision issues', () => {
    expect(parseINRToCents('500')).toBe(50000);
    expect(parseINRToCents('500.5')).toBe(50050);
    expect(parseINRToCents('500.50')).toBe(50050);
    expect(parseINRToCents('₹1,25,000.75')).toBe(12500075);
    expect(parseMoneyToCents('$1,250.75')).toBe(125075);
    expect(parseMoneyToCents('€99.95')).toBe(9995);
    expect(parseINRToCents(' 42.99 ')).toBe(4299);
  });

  it('rejects invalid currency strings', () => {
    expect(parseINRToCents('')).toBe(null);
    expect(parseINRToCents('abc')).toBe(null);
    expect(parseINRToCents('-50')).toBe(null);
    expect(parseINRToCents('0')).toBe(null);
  });
});
