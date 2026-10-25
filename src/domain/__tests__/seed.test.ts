import { describe, it, expect } from 'vitest';
import { generateSampleData } from '../seed';
import { AppDataSchema } from '../types';

describe('Seed Generator', () => {
  it('generates deterministic and valid data conforming to AppDataSchema', () => {
    const data1 = generateSampleData(1729864200000, 'Asia/Kolkata', 42);
    const data2 = generateSampleData(1729864200000, 'Asia/Kolkata', 42);

    expect(data1.entries.length).toBeGreaterThan(100);
    expect(data1.entries.length).toBe(data2.entries.length);
    expect(data1.entries[0]?.id).toBe(data2.entries[0]?.id);
    expect(data1.entries[0]?.amountCents).toBe(data2.entries[0]?.amountCents);

    // Validate entire generated tree with Zod
    const parsed = AppDataSchema.safeParse(data1);
    expect(parsed.success).toBe(true);
  });
});
