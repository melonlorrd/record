import { describe, it, expect } from 'vitest';
import { EntrySchema, CategorySchema, AppDataSchema, ExportPayloadSchema } from '../types';

describe('Zod Schemas', () => {
  it('validates a correct entry successfully', () => {
    const entry = {
      id: 'a0000000-0000-4000-8000-000000000001',
      kind: 'expense' as const,
      amountCents: 45000,
      categoryId: 'c1111111-1111-4111-8111-111111111111',
      occurredAt: 1729864200000,
      tz: 'Asia/Kolkata',
      intent: 'need' as const,
      tags: ['groceries'],
      note: 'Fresh milk and sourdough',
      createdAt: 1729864200000,
      updatedAt: 1729864200000,
      deviceId: 'dev-1',
      deleted: false,
    };

    const parsed = EntrySchema.safeParse(entry);
    expect(parsed.success).toBe(true);
  });

  it('validates a correct category successfully', () => {
    const category = {
      id: 'c1111111-1111-4111-8111-111111111111',
      name: 'Groceries',
      color: '#10b981',
      archived: false,
      updatedAt: 1729864200000,
      deleted: false,
    };
    expect(CategorySchema.safeParse(category).success).toBe(true);
  });

  it('rejects entries with non-integer or negative amounts', () => {
    const invalidEntry = {
      id: 'a0000000-0000-4000-8000-000000000001',
      kind: 'expense' as const,
      amountCents: 45.5, // Float not allowed!
      categoryId: 'c1111111-1111-4111-8111-111111111111',
      occurredAt: 1729864200000,
      tz: 'Asia/Kolkata',
      tags: [],
      note: 'Test',
      createdAt: 1729864200000,
      updatedAt: 1729864200000,
      deviceId: 'dev-1',
      deleted: false,
    };

    const parsed = EntrySchema.safeParse(invalidEntry);
    expect(parsed.success).toBe(false);
  });

  it('validates full app data payload safely', () => {
    const appData = {
      version: 1 as const,
      entries: [],
      categories: [
        {
          id: 'c1111111-1111-4111-8111-111111111111',
          name: 'Food',
          color: '#10b981',
          archived: false,
          updatedAt: 1729864200000,
          deleted: false,
        },
      ],
      lastModified: 1729864200000,
    };

    expect(AppDataSchema.safeParse(appData).success).toBe(true);
  });

  it('validates export backup payload', () => {
    const payload = {
      exportedAt: 1729864200000,
      app: 'kosh' as const,
      version: 1 as const,
      data: {
        version: 1 as const,
        entries: [],
        categories: [],
        lastModified: 1729864200000,
      },
    };

    expect(ExportPayloadSchema.safeParse(payload).success).toBe(true);
  });
});
