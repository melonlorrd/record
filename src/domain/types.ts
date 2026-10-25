import { z } from 'zod';

/**
 * Go vs TypeScript note:
 * In Go, you define a `type Entry struct { ... }` and write validation methods or struct tags.
 * In TypeScript, we define a runtime Zod schema first, and infer the static TypeScript type
 * directly with `z.infer<typeof Schema>`. This guarantees runtime validation and compile-time
 * types are always 100% in sync without code duplication.
 */

// EntryKind: Tagged enum ('expense' | 'income')
export const EntryKindSchema = z.enum(['expense', 'income']);
export type EntryKind = z.infer<typeof EntryKindSchema>;

// Intent: Behavioral spend categorization.
// In Go, this would be an enum or typed string with an empty string as unassigned.
// In TS, this is an optional union: 'need' | 'want' | 'impulse'.
export const IntentSchema = z.enum(['need', 'want', 'impulse']);
export type Intent = z.infer<typeof IntentSchema>;

// Entry: A single financial transaction.
// All monetary values are integer cents (e.g. ₹10.50 -> 1050 cents).
// NEVER use floating point numbers for currency arithmetic.
export const EntrySchema = z.object({
  id: z.string().uuid(),
  kind: EntryKindSchema,
  amountCents: z.number().int().positive(), // INR integer cents (positive; kind indicates flow)
  categoryId: z.string(),
  occurredAt: z.number().int(), // Epoch ms (like Go's time.Time.UnixMilli())
  tz: z.string().min(1),        // IANA timezone identifier, e.g. "Asia/Kolkata"
  intent: IntentSchema.optional(),
  tags: z.array(z.string()),
  note: z.string(),
  createdAt: z.number().int(),  // Epoch ms, immutable creation timestamp
  updatedAt: z.number().int(),  // Epoch ms, tracks last modification
  deviceId: z.string().min(1),  // Client identifier for future multi-device sync
  deleted: z.boolean(),        // Soft-delete flag for safe sync and undo actions
});
export type Entry = z.infer<typeof EntrySchema>;

// Category: Classification for transactions.
export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().min(1),     // CSS color or hex (e.g. "#10b981")
  archived: z.boolean(),
  updatedAt: z.number().int(),
  deleted: z.boolean(),
});
export type Category = z.infer<typeof CategorySchema>;

// AssetClass: Categorization for portfolio investments
export const AssetClassSchema = z.enum(['mutual_fund', 'equity', 'gold']);
export type AssetClass = z.infer<typeof AssetClassSchema>;

// PortfolioHolding: Mutual Fund, Equity, or Gold position
export const PortfolioHoldingSchema = z.object({
  id: z.string().uuid(),
  assetClass: AssetClassSchema,
  name: z.string().min(1),             // e.g. "Parag Parikh Flexi Cap Fund", "HDFC Bank", "Sovereign Gold Bond"
  symbolOrFolio: z.string(),          // e.g. "PPFCF-G", "HDFCBANK", "SGB2030"
  sector: z.string().optional(),       // e.g. "Defence Electronics", "Automobiles", "Metals & Mining"
  units: z.number().positive(),       // Decimal units (e.g. 245.521 units, 15 shares, 10.5 grams)
  buyAvgPriceCents: z.number().int().positive(),   // Purchase price per unit in integer cents
  currentNavOrPriceCents: z.number().int().positive(), // Current market price/NAV in integer cents
  notes: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deleted: z.boolean(),
});
export type PortfolioHolding = z.infer<typeof PortfolioHoldingSchema>;

// AppData: Whole on-device state record persisted to IndexedDB.
export const AppDataSchema = z.object({
  version: z.literal(1),
  entries: z.array(EntrySchema),
  categories: z.array(CategorySchema),
  holdings: z.array(PortfolioHoldingSchema).default([]),
  lastModified: z.number().int(),
});
export type AppData = z.infer<typeof AppDataSchema>;

// ExportPayload: Schema for JSON backup export / import.
export const ExportPayloadSchema = z.object({
  exportedAt: z.number().int(),
  app: z.enum(['record', 'kosh']),
  version: z.literal(1),
  data: AppDataSchema,
});
export type ExportPayload = z.infer<typeof ExportPayloadSchema>;

export interface CreateHoldingInput {
  assetClass: AssetClass;
  name: string;
  symbolOrFolio?: string;
  units: number;
  buyAvgPriceCents: number;
  currentNavOrPriceCents: number;
  notes?: string;
}

export interface UpdateHoldingInput {
  assetClass?: AssetClass;
  name?: string;
  symbolOrFolio?: string;
  units?: number;
  buyAvgPriceCents?: number;
  currentNavOrPriceCents?: number;
  notes?: string;
}

// Input payload for creating a new entry (UI helper type)
export interface CreateEntryInput {
  kind: EntryKind;
  amountCents: number;
  categoryId: string;
  occurredAt: number;
  tz: string;
  intent?: Intent;
  tags?: string[];
  note?: string;
}

// Input payload for updating an existing entry
export interface UpdateEntryInput {
  kind?: EntryKind;
  amountCents?: number;
  categoryId?: string;
  occurredAt?: number;
  tz?: string;
  intent?: Intent | undefined;
  tags?: string[];
  note?: string;
}
