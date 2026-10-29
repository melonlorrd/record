/**
 * IndexedDB storage layer using idb-keyval.
 *
 * Requirements:
 * - Persist whole dataset as ONE record in IndexedDB via idb-keyval.
 * - Keep in memory as plain arrays. Every change saves the full record in one write.
 * - Validate with Zod on load and FAIL SAFELY (never overwrite stored data if validation fails).
 * - Request navigator.storage.persist().
 */

import { get, set, del } from 'idb-keyval';
import { AppData, AppDataSchema } from '../domain/types';
import { SEED_CATEGORIES } from '../domain/seed';

const STORAGE_KEY = 'record_tracker_data_v1';
const LEGACY_STORAGE_KEY = 'kosh_money_tracker_data_v1';

export interface LoadResult {
  data: AppData;
  validationError?: string;
  isFreshInstall: boolean;
}

export function createInitialEmptyData(): AppData {
  return {
    version: 1,
    entries: [],
    categories: [...SEED_CATEGORIES],
    holdings: [],
    currency: 'INR',
    lastModified: Date.now(),
  };
}

/**
 * Loads the dataset from IndexedDB with strict Zod validation.
 * Never overwrites damaged data if parsing fails.
 */
export async function loadAppDataFromStorage(): Promise<LoadResult> {
  try {
    let raw: unknown = await get(STORAGE_KEY);

    // If new key not found, check legacy key
    if (raw === undefined || raw === null) {
      const legacyRaw: unknown = await get(LEGACY_STORAGE_KEY);
      if (legacyRaw !== undefined && legacyRaw !== null) {
        raw = legacyRaw;
      }
    }

    if (raw === undefined || raw === null) {
      // Fresh install: initialize with default categories
      const initial = createInitialEmptyData();
      await set(STORAGE_KEY, initial);
      return { data: initial, isFreshInstall: true };
    }

    const parseResult = AppDataSchema.safeParse(raw);

    if (!parseResult.success) {
      console.error('AppData Zod validation failed on stored data:', parseResult.error);
      return {
        data: createInitialEmptyData(),
        validationError: parseResult.error.message,
        isFreshInstall: false,
      };
    }

    return {
      data: parseResult.data,
      isFreshInstall: false,
    };
  } catch (err) {
    console.error('Failed to read from IndexedDB:', err);
    return {
      data: createInitialEmptyData(),
      validationError: err instanceof Error ? err.message : String(err),
      isFreshInstall: false,
    };
  }
}

/**
 * Persists the entire dataset to IndexedDB in one write.
 * Validates with Zod before writing.
 */
export async function saveAppDataToStorage(data: AppData): Promise<void> {
  // Validate schema before persisting
  const validated = AppDataSchema.parse(data);
  await set(STORAGE_KEY, validated);
}

/**
 * Clears the storage record (used by Reset / Clear all).
 */
export async function clearAppDataFromStorage(): Promise<void> {
  await del(STORAGE_KEY);
}

/**
 * Requests browser persistent storage (eviction protection).
 */
export async function requestStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch (e) {
      console.warn('Persistent storage request failed:', e);
      return false;
    }
  }
  return false;
}
