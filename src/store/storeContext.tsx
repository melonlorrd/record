/**
 * Application State Store for Kosh.
 *
 * Architecture rules:
 * - Pure React context + state; no heavy state libraries (no Redux, no Zustand).
 * - Keep dataset in memory as plain arrays.
 * - Every change saves the entire record in one write to IndexedDB.
 * - UI components ONLY call domain functions and this store; no database or mutation logic in components.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  AppData,
  Category,
  CreateEntryInput,
  CreateHoldingInput,
  Entry,
  ExportPayload,
  ExportPayloadSchema,
  PortfolioHolding,
  UpdateEntryInput,
  UpdateHoldingInput,
} from '../domain/types';
import {
  clearAppDataFromStorage,
  createInitialEmptyData,
  loadAppDataFromStorage,
  requestStoragePersistence,
  saveAppDataToStorage,
} from '../storage/db';
import { generateSampleData } from '../domain/seed';
import { getDefaultTimezone } from '../domain/dates';
import { getCurrencySymbol, setActiveCurrency } from '../domain/money';

function getOrCreateDeviceId(): string {
  const KEY = 'kosh_device_id';
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now().toString(36)}`;
    localStorage.setItem(KEY, newId);
    return newId;
  } catch {
    return 'local-device';
  }
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ToastState {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

export interface StoreContextValue {
  isLoaded: boolean;
  isPersistedStorage: boolean;
  data: AppData;
  entries: Entry[];
  categories: Category[];
  activeCategories: Category[];
  holdings: PortfolioHolding[];
  currency: string;
  currencySymbol: string;
  theme: 'dark' | 'light';
  toast: ToastState | null;
  toggleTheme: () => void;
  convertAllDataCurrency: (targetCurrency: string, exchangeRate: number) => Promise<void>;
  showToast: (toast: Omit<ToastState, 'id'>) => void;
  hideToast: () => void;
  addEntry: (input: CreateEntryInput) => Promise<string>;
  updateEntry: (id: string, input: UpdateEntryInput) => Promise<void>;
  softDeleteEntry: (id: string) => Promise<void>;
  restoreEntry: (id: string) => Promise<void>;
  addCategory: (name: string, color: string) => Promise<string>;
  updateCategory: (id: string, updates: { name?: string; color?: string; archived?: boolean }) => Promise<void>;
  softDeleteCategory: (id: string) => Promise<void>;
  addHolding: (input: CreateHoldingInput) => Promise<string>;
  updateHolding: (id: string, input: UpdateHoldingInput) => Promise<void>;
  softDeleteHolding: (id: string) => Promise<void>;
  resetToSampleData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  importJSON: (jsonString: string) => Promise<{ success: boolean; message: string }>;
  exportJSON: () => string;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(createInitialEmptyData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPersistedStorage, setIsPersistedStorage] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('kosh_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch {
      // fallback
    }
    return 'dark';
  });

  // Apply theme and clear glass attributes to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-glass', 'clear');
    try {
      localStorage.setItem('kosh_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback((t: Omit<ToastState, 'id'>) => {
    const id = generateUUID();
    setToast({ ...t, id });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, toast.durationMs ?? 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const currency = data.currency || 'INR';
  const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency]);

  useEffect(() => {
    setActiveCurrency(currency);
  }, [currency]);

  // Load from storage on mount
  useEffect(() => {
    async function init() {
      const persisted = await requestStoragePersistence();
      setIsPersistedStorage(persisted);

      const loaded = await loadAppDataFromStorage();
      if (loaded.validationError) {
        showToast({
          message: `Storage warning: corrupted data detected. Preserved previous backup.`,
        });
      }

      // If fresh install, prompt or seed sample data for immediate demo usability
      if (loaded.isFreshInstall) {
        const seed = generateSampleData(Date.now(), getDefaultTimezone(), 42);
        await saveAppDataToStorage(seed);
        setData(seed);
        setActiveCurrency(seed.currency || 'INR');
      } else {
        setData(loaded.data);
        setActiveCurrency(loaded.data.currency || 'INR');
      }

      setIsLoaded(true);
    }
    void init();
  }, [showToast]);

  // Internal helper to update state and write once to IndexedDB
  const commitData = useCallback(async (nextData: AppData) => {
    setData(nextData);
    await saveAppDataToStorage(nextData);
  }, []);

  // Entries
  const addEntry = useCallback(async (input: CreateEntryInput): Promise<string> => {
    const id = generateUUID();
    const now = Date.now();
    const deviceId = getOrCreateDeviceId();

    const newEntry: Entry = {
      id,
      kind: input.kind,
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      occurredAt: input.occurredAt,
      tz: input.tz,
      ...(input.intent !== undefined ? { intent: input.intent } : {}),
      tags: input.tags ?? [],
      note: input.note ?? '',
      createdAt: now,
      updatedAt: now,
      deviceId,
      deleted: false,
    };

    const nextData: AppData = {
      ...data,
      entries: [...data.entries, newEntry],
      lastModified: now,
    };

    await commitData(nextData);
    return id;
  }, [data, commitData]);

  const updateEntry = useCallback(async (id: string, input: UpdateEntryInput): Promise<void> => {
    const now = Date.now();
    const nextEntries = data.entries.map((entry) => {
      if (entry.id !== id) return entry;

      return {
        ...entry,
        kind: input.kind ?? entry.kind,
        amountCents: input.amountCents ?? entry.amountCents,
        categoryId: input.categoryId ?? entry.categoryId,
        occurredAt: input.occurredAt ?? entry.occurredAt,
        tz: input.tz ?? entry.tz,
        ...(input.intent !== undefined
          ? (input.intent ? { intent: input.intent } : {})
          : (entry.intent ? { intent: entry.intent } : {})),
        tags: input.tags ?? entry.tags,
        note: input.note ?? entry.note,
        updatedAt: now,
      };
    });

    const nextData: AppData = {
      ...data,
      entries: nextEntries,
      lastModified: now,
    };

    await commitData(nextData);
  }, [data, commitData]);

  const softDeleteEntry = useCallback(async (id: string): Promise<void> => {
    const now = Date.now();
    let deletedEntryNote = '';

    const nextEntries = data.entries.map((entry) => {
      if (entry.id === id) {
        deletedEntryNote = entry.note || (entry.kind === 'expense' ? 'Expense' : 'Income');
        return { ...entry, deleted: true, updatedAt: now };
      }
      return entry;
    });

    const nextData: AppData = {
      ...data,
      entries: nextEntries,
      lastModified: now,
    };

    await commitData(nextData);

    // Show undo toast
    showToast({
      message: `Deleted "${deletedEntryNote}"`,
      actionLabel: 'Undo',
      onAction: () => {
        void restoreEntry(id);
      },
      durationMs: 6000,
    });
  }, [data, commitData, showToast]);

  const restoreEntry = useCallback(async (id: string): Promise<void> => {
    const now = Date.now();
    const nextEntries = data.entries.map((entry) => {
      if (entry.id === id) {
        return { ...entry, deleted: false, updatedAt: now };
      }
      return entry;
    });

    const nextData: AppData = {
      ...data,
      entries: nextEntries,
      lastModified: now,
    };

    await commitData(nextData);
    showToast({ message: 'Entry restored' });
  }, [data, commitData, showToast]);

  // Categories
  const addCategory = useCallback(async (name: string, color: string): Promise<string> => {
    const id = generateUUID();
    const now = Date.now();

    const newCategory: Category = {
      id,
      name: name.trim(),
      color,
      archived: false,
      updatedAt: now,
      deleted: false,
    };

    const nextData: AppData = {
      ...data,
      categories: [...data.categories, newCategory],
      lastModified: now,
    };

    await commitData(nextData);
    return id;
  }, [data, commitData]);

  const updateCategory = useCallback(async (
    id: string,
    updates: { name?: string; color?: string; archived?: boolean }
  ): Promise<void> => {
    const now = Date.now();
    const nextCats = data.categories.map((cat) => {
      if (cat.id !== id) return cat;
      return {
        ...cat,
        ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
        ...(updates.color !== undefined ? { color: updates.color } : {}),
        ...(updates.archived !== undefined ? { archived: updates.archived } : {}),
        updatedAt: now,
      };
    });

    const nextData: AppData = {
      ...data,
      categories: nextCats,
      lastModified: now,
    };

    await commitData(nextData);
  }, [data, commitData]);

  const softDeleteCategory = useCallback(async (id: string): Promise<void> => {
    const now = Date.now();
    const nextCats = data.categories.map((cat) => {
      if (cat.id === id) {
        return { ...cat, deleted: true, updatedAt: now };
      }
      return cat;
    });

    const nextData: AppData = {
      ...data,
      categories: nextCats,
      lastModified: now,
    };

    await commitData(nextData);
  }, [data, commitData]);

  // Holdings (Mutual Funds, Equity, Gold)
  const addHolding = useCallback(async (input: CreateHoldingInput): Promise<string> => {
    const id = generateUUID();
    const now = Date.now();

    const newHolding: PortfolioHolding = {
      id,
      assetClass: input.assetClass,
      name: input.name.trim(),
      symbolOrFolio: input.symbolOrFolio?.trim() ?? '',
      units: input.units,
      buyAvgPriceCents: input.buyAvgPriceCents,
      currentNavOrPriceCents: input.currentNavOrPriceCents,
      notes: input.notes?.trim() ?? '',
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    const nextData: AppData = {
      ...data,
      holdings: [...(data.holdings || []), newHolding],
      lastModified: now,
    };

    await commitData(nextData);
    return id;
  }, [data, commitData]);

  const updateHolding = useCallback(async (
    id: string,
    updates: UpdateHoldingInput
  ): Promise<void> => {
    const now = Date.now();
    const nextHoldings = (data.holdings || []).map((h) => {
      if (h.id !== id) return h;
      return {
        ...h,
        assetClass: updates.assetClass ?? h.assetClass,
        name: updates.name !== undefined ? updates.name.trim() : h.name,
        symbolOrFolio: updates.symbolOrFolio !== undefined ? updates.symbolOrFolio.trim() : h.symbolOrFolio,
        units: updates.units ?? h.units,
        buyAvgPriceCents: updates.buyAvgPriceCents ?? h.buyAvgPriceCents,
        currentNavOrPriceCents: updates.currentNavOrPriceCents ?? h.currentNavOrPriceCents,
        notes: updates.notes !== undefined ? updates.notes.trim() : h.notes,
        updatedAt: now,
      };
    });

    const nextData: AppData = {
      ...data,
      holdings: nextHoldings,
      lastModified: now,
    };

    await commitData(nextData);
  }, [data, commitData]);

  const softDeleteHolding = useCallback(async (id: string): Promise<void> => {
    const now = Date.now();
    const nextHoldings = (data.holdings || []).map((h) => {
      if (h.id === id) {
        return { ...h, deleted: true, updatedAt: now };
      }
      return h;
    });

    const nextData: AppData = {
      ...data,
      holdings: nextHoldings,
      lastModified: now,
    };

    await commitData(nextData);
  }, [data, commitData]);

  // Reset to Sample Data
  const resetToSampleData = useCallback(async (): Promise<void> => {
    const seed = generateSampleData(Date.now(), getDefaultTimezone(), 42);
    await commitData(seed);
    showToast({ message: 'Reset to ~4 months of realistic sample data.' });
  }, [commitData, showToast]);

  // Clear all data
  const clearAllData = useCallback(async (): Promise<void> => {
    await clearAppDataFromStorage();
    const empty = createInitialEmptyData();
    await commitData(empty);
    showToast({ message: 'All transactions, portfolio holdings, and categories cleared.' });
  }, [commitData, showToast]);

  // Export JSON
  const exportJSON = useCallback((): string => {
    const payload: ExportPayload = {
      exportedAt: Date.now(),
      app: 'record',
      version: 1,
      data,
    };
    return JSON.stringify(payload, null, 2);
  }, [data]);

  // Import JSON with strict Zod validation
  const importJSON = useCallback(async (jsonString: string): Promise<{ success: boolean; message: string }> => {
    try {
      const parsedUnknown: unknown = JSON.parse(jsonString);
      const parseResult = ExportPayloadSchema.safeParse(parsedUnknown);

      if (!parseResult.success) {
        return {
          success: false,
          message: `Validation failed: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
        };
      }

      const imported = parseResult.data.data;
      await commitData(imported);
      showToast({
        message: `Successfully imported ${imported.entries.length} entries & ${imported.categories.length} categories.`,
      });

      return {
        success: true,
        message: 'Import successful',
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Invalid JSON file',
      };
    }
  }, [commitData, showToast]);

  const activeCategories = useMemo(() => {
    return data.categories.filter((c) => !c.deleted && !c.archived);
  }, [data.categories]);

  // Convert all data in database to target currency using exchange rate
  const convertAllDataCurrency = useCallback(
    async (targetCurrency: string, exchangeRate: number): Promise<void> => {
      const target = targetCurrency.toUpperCase().trim();
      const now = Date.now();

      const convertedEntries = data.entries.map((e) => ({
        ...e,
        amountCents: Math.max(1, Math.round(e.amountCents * exchangeRate)),
        updatedAt: now,
      }));

      const convertedHoldings = (data.holdings || []).map((h) => ({
        ...h,
        buyAvgPriceCents: Math.max(1, Math.round(h.buyAvgPriceCents * exchangeRate)),
        currentNavOrPriceCents: Math.max(1, Math.round(h.currentNavOrPriceCents * exchangeRate)),
        updatedAt: now,
      }));

      const nextData: AppData = {
        ...data,
        currency: target,
        entries: convertedEntries,
        holdings: convertedHoldings,
        lastModified: now,
      };

      setActiveCurrency(target);
      await commitData(nextData);

      showToast({
        message: `Converted all transactions & holdings to ${target} (${getCurrencySymbol(target)}) at rate ${exchangeRate.toFixed(4)}.`,
      });
    },
    [data, commitData, showToast]
  );

  const value: StoreContextValue = {
    isLoaded,
    isPersistedStorage,
    data,
    entries: data.entries,
    categories: data.categories,
    activeCategories,
    holdings: data.holdings || [],
    currency,
    currencySymbol,
    theme,
    toast,
    toggleTheme,
    convertAllDataCurrency,
    showToast,
    hideToast,
    addEntry,
    updateEntry,
    softDeleteEntry,
    restoreEntry,
    addCategory,
    updateCategory,
    softDeleteCategory,
    addHolding,
    updateHolding,
    softDeleteHolding,
    resetToSampleData,
    clearAllData,
    importJSON,
    exportJSON,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
