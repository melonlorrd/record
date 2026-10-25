import { describe, it, expect } from 'vitest';
import { formatINR, parseINRToCents } from '../money';

describe('Money utilities (INR integer cents)', () => {
  it('formats positive and negative amounts correctly', () => {
    expect(formatINR(10050)).toBe('₹100.50');
    expect(formatINR(-50000)).toBe('-₹500.00');
    expect(formatINR(12500000)).toBe('₹1,25,000.00');
    expect(formatINR(10000, { compactIfZeroPaise: true })).toBe('₹100');
  });

  it('parses valid user input cleanly without floating point precision issues', () => {
    expect(parseINRToCents('500')).toBe(50000);
    expect(parseINRToCents('500.5')).toBe(50050);
    expect(parseINRToCents('500.50')).toBe(50050);
    expect(parseINRToCents('₹1,25,000.75')).toBe(12500075);
    expect(parseINRToCents(' 42.99 ')).toBe(4299);
  });

  it('rejects invalid currency strings', () => {
    expect(parseINRToCents('')).toBe(null);
    expect(parseINRToCents('abc')).toBe(null);
    expect(parseINRToCents('-50')).toBe(null);
    expect(parseINRToCents('0')).toBe(null);
  });
});
