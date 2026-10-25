/**
 * Pure analytics calculations for Kosh.
 *
 * Go vs TypeScript note:
 * With `noUncheckedIndexedAccess: true`, accessing an array index `arr[i]` or object key `map[k]`
 * yields `T | undefined` (identical to Go's comma-ok idiom `val, ok := map[k]`).
 * We explicitly guard with `if (item !== undefined)` or provide sensible defaults.
 */

import { Entry, Category } from './types';
import { DateRange, getPartsInTz, toISODateInTz, toISOMonthInTz } from './dates';

/**
 * Filters out soft-deleted entries.
 */
export function getActiveEntries(entries: readonly Entry[]): Entry[] {
  return entries.filter((e) => !e.deleted);
}

/**
 * Filters entries within an inclusive [startMs, endMs] millisecond window.
 */
export function filterEntriesByDateRange(
  entries: readonly Entry[],
  startMs: number,
  endMs: number
): Entry[] {
  return entries.filter((e) => e.occurredAt >= startMs && e.occurredAt <= endMs);
}

export interface PeriodSummary {
  spentCents: number;
  incomeCents: number;
  netCents: number;
  prevSpentCents: number;
  prevIncomeCents: number;
  spentChangePercent: number | null; // e.g. +15.5 or -8.2, null if prevSpent is 0
  incomeChangePercent: number | null;
  avgDailySpendCents: number;
  entryCount: number;
  daysInPeriod: number;
}

/**
 * Computes core headline statistics for the selected period vs its prior comparison period.
 */
export function calculatePeriodSummary(
  activeEntries: readonly Entry[],
  currentPeriod: DateRange,
  prevPeriod: DateRange
): PeriodSummary {
  let spentCents = 0;
  let incomeCents = 0;
  let entryCount = 0;

  let prevSpentCents = 0;
  let prevIncomeCents = 0;

  for (const entry of activeEntries) {
    if (entry.occurredAt >= currentPeriod.startMs && entry.occurredAt <= currentPeriod.endMs) {
      entryCount++;
      if (entry.kind === 'expense') {
        spentCents += entry.amountCents;
      } else {
        incomeCents += entry.amountCents;
      }
    } else if (entry.occurredAt >= prevPeriod.startMs && entry.occurredAt <= prevPeriod.endMs) {
      if (entry.kind === 'expense') {
        prevSpentCents += entry.amountCents;
      } else {
        prevIncomeCents += entry.amountCents;
      }
    }
  }

  const durationMs = Math.max(1, currentPeriod.endMs - currentPeriod.startMs);
  const daysInPeriod = Math.max(1, Math.round(durationMs / 86400000));
  const avgDailySpendCents = Math.round(spentCents / daysInPeriod);

  let spentChangePercent: number | null = null;
  if (prevSpentCents > 0) {
    spentChangePercent = Math.round(((spentCents - prevSpentCents) / prevSpentCents) * 1000) / 10;
  }

  let incomeChangePercent: number | null = null;
  if (prevIncomeCents > 0) {
    incomeChangePercent = Math.round(((incomeCents - prevIncomeCents) / prevIncomeCents) * 1000) / 10;
  }

  return {
    spentCents,
    incomeCents,
    netCents: incomeCents - spentCents,
    prevSpentCents,
    prevIncomeCents,
    spentChangePercent,
    incomeChangePercent,
    avgDailySpendCents,
    entryCount,
    daysInPeriod,
  };
}

export interface MonthlyBarItem {
  monthKey: string;   // e.g. "2026-06"
  label: string;      // e.g. "Jun 2026"
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

/**
 * Calculates monthly income vs expense bars sorted chronologically.
 */
export function calculateMonthlyIncomeVsExpense(
  activeEntries: readonly Entry[]
): MonthlyBarItem[] {
  const monthMap = new Map<string, { incomeCents: number; expenseCents: number; sampleTz: string; sampleMs: number }>();

  for (const entry of activeEntries) {
    const monthKey = toISOMonthInTz(entry.occurredAt, entry.tz);
    const existing = monthMap.get(monthKey);

    if (existing) {
      if (entry.kind === 'income') {
        existing.incomeCents += entry.amountCents;
      } else {
        existing.expenseCents += entry.amountCents;
      }
    } else {
      monthMap.set(monthKey, {
        incomeCents: entry.kind === 'income' ? entry.amountCents : 0,
        expenseCents: entry.kind === 'expense' ? entry.amountCents : 0,
        sampleTz: entry.tz,
        sampleMs: entry.occurredAt,
      });
    }
  }

  const sortedKeys = Array.from(monthMap.keys()).sort();

  return sortedKeys.map((key) => {
    const val = monthMap.get(key)!;
    // Format label nicely: "Jun 2026"
    const p = getPartsInTz(val.sampleMs, val.sampleTz);
    const d = new Date(p.year, p.month - 1, 1);
    const label = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(d);

    return {
      monthKey: key,
      label,
      incomeCents: val.incomeCents,
      expenseCents: val.expenseCents,
      netCents: val.incomeCents - val.expenseCents,
    };
  });
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  color: string;
  totalCents: number;
  percentage: number;
  count: number;
}

/**
 * Calculates category breakdown for expenses within the given dataset.
 */
export function calculateCategoryBreakdown(
  activeEntries: readonly Entry[],
  categories: readonly Category[]
): CategoryBreakdownItem[] {
  const categoryMap = new Map<string, Category>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  const totals = new Map<string, { totalCents: number; count: number }>();
  let overallExpenseCents = 0;

  for (const entry of activeEntries) {
    if (entry.kind !== 'expense') continue;
    overallExpenseCents += entry.amountCents;

    const existing = totals.get(entry.categoryId);
    if (existing) {
      existing.totalCents += entry.amountCents;
      existing.count += 1;
    } else {
      totals.set(entry.categoryId, {
        totalCents: entry.amountCents,
        count: 1,
      });
    }
  }

  const result: CategoryBreakdownItem[] = [];

  for (const [catId, stat] of totals.entries()) {
    const cat = categoryMap.get(catId);
    const name = cat ? cat.name : 'Uncategorized';
    const color = cat ? cat.color : '#64748b';
    const percentage = overallExpenseCents > 0
      ? Math.round((stat.totalCents / overallExpenseCents) * 1000) / 10
      : 0;

    result.push({
      categoryId: catId,
      name,
      color,
      totalCents: stat.totalCents,
      percentage,
      count: stat.count,
    });
  }

  // Sort descending by total spent
  result.sort((a, b) => b.totalCents - a.totalCents);
  return result;
}

export interface BalancePoint {
  epochMs: number;
  occurredAt: number;
  tz: string;
  balanceCents: number;
  deltaCents: number;
  note: string;
}

/**
 * Calculates running cumulative balance chronologically across all transactions.
 */
export function calculateRunningBalance(
  activeEntries: readonly Entry[]
): BalancePoint[] {
  // Sort entries ascending by occurredAt
  const sorted = [...activeEntries].sort((a, b) => a.occurredAt - b.occurredAt);

  let runningCents = 0;
  const points: BalancePoint[] = [];

  for (const entry of sorted) {
    const delta = entry.kind === 'income' ? entry.amountCents : -entry.amountCents;
    runningCents += delta;

    points.push({
      epochMs: entry.occurredAt,
      occurredAt: entry.occurredAt,
      tz: entry.tz,
      balanceCents: runningCents,
      deltaCents: delta,
      note: entry.note,
    });
  }

  return points;
}

export interface HeatmapCell {
  weekday: number;  // 0 = Sun, 1 = Mon, ..., 6 = Sat
  hour: number;     // 0-23
  totalCents: number;
  count: number;
}

/**
 * Computes weekday (0-6) x hour (0-23) spend heatmap matrix.
 * CRITICAL REQUIREMENT: Evaluates weekday and hour using each entry's own `entry.tz`!
 */
export function calculateWeekdayHourHeatmap(
  activeEntries: readonly Entry[]
): HeatmapCell[] {
  // 7 weekdays * 24 hours = 168 cells
  const grid: HeatmapCell[][] = Array.from({ length: 7 }, (_, w) =>
    Array.from({ length: 24 }, (_, h) => ({
      weekday: w,
      hour: h,
      totalCents: 0,
      count: 0,
    }))
  );

  for (const entry of activeEntries) {
    if (entry.kind !== 'expense') continue;

    // Use entry's own stored timezone
    const parts = getPartsInTz(entry.occurredAt, entry.tz);
    const row = grid[parts.weekday];
    if (row !== undefined) {
      const cell = row[parts.hour];
      if (cell !== undefined) {
        cell.totalCents += entry.amountCents;
        cell.count += 1;
      }
    }
  }

  const flattened: HeatmapCell[] = [];
  for (const row of grid) {
    for (const cell of row) {
      flattened.push(cell);
    }
  }

  return flattened;
}

export interface HabitWeekItem {
  weekKey: string;      // e.g. "2026-W34" or "Week of Aug 17"
  startMs: number;
  needCents: number;
  wantCents: number;
  impulseCents: number;
  unassignedCents: number;
  totalCents: number;
  needSharePercent: number;
  wantSharePercent: number;
  impulseSharePercent: number;
}

/**
 * Computes weekly share of spend across Need, Want, and Impulse intents.
 */
export function calculateHabitShareByWeek(
  activeEntries: readonly Entry[],
  tz: string
): HabitWeekItem[] {
  const expenseEntries = activeEntries
    .filter((e) => e.kind === 'expense')
    .sort((a, b) => a.occurredAt - b.occurredAt);

  if (expenseEntries.length === 0) {
    return [];
  }

  // Group by Monday-aligned ISO week
  const weekMap = new Map<string, {
    startMs: number;
    needCents: number;
    wantCents: number;
    impulseCents: number;
    unassignedCents: number;
  }>();

  for (const entry of expenseEntries) {
    const parts = getPartsInTz(entry.occurredAt, entry.tz || tz);
    // Align to Monday of that week
    const date = new Date(parts.year, parts.month - 1, parts.day);
    const dayOfWeek = (date.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const monday = new Date(date);
    monday.setDate(date.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const weekKey = `${monday.getFullYear()}-W${String(Math.ceil((monday.getDate() + 6) / 7)).padStart(2, '0')}-${monday.getMonth() + 1}`;
    const existing = weekMap.get(weekKey);

    const needAdd = entry.intent === 'need' ? entry.amountCents : 0;
    const wantAdd = entry.intent === 'want' ? entry.amountCents : 0;
    const impulseAdd = entry.intent === 'impulse' ? entry.amountCents : 0;
    const unassignedAdd = !entry.intent ? entry.amountCents : 0;

    if (existing) {
      existing.needCents += needAdd;
      existing.wantCents += wantAdd;
      existing.impulseCents += impulseAdd;
      existing.unassignedCents += unassignedAdd;
    } else {
      weekMap.set(weekKey, {
        startMs: monday.getTime(),
        needCents: needAdd,
        wantCents: wantAdd,
        impulseCents: impulseAdd,
        unassignedCents: unassignedAdd,
      });
    }
  }

  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[1].startMs - b[1].startMs);

  return sortedWeeks.map(([, data]) => {
    const total = data.needCents + data.wantCents + data.impulseCents + data.unassignedCents;
    const needSharePercent = total > 0 ? Math.round((data.needCents / total) * 1000) / 10 : 0;
    const wantSharePercent = total > 0 ? Math.round((data.wantCents / total) * 1000) / 10 : 0;
    const impulseSharePercent = total > 0 ? Math.round((data.impulseCents / total) * 1000) / 10 : 0;

    const startDate = new Date(data.startMs);
    const weekLabel = new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(startDate);

    return {
      weekKey: `Week of ${weekLabel}`,
      startMs: data.startMs,
      needCents: data.needCents,
      wantCents: data.wantCents,
      impulseCents: data.impulseCents,
      unassignedCents: data.unassignedCents,
      totalCents: total,
      needSharePercent,
      wantSharePercent,
      impulseSharePercent,
    };
  });
}

export interface SmallPurchasesSummary {
  thresholdCents: number;
  count: number;
  totalCents: number;
  allExpenseCount: number;
  allExpenseTotalCents: number;
  countSharePercent: number;
  spendSharePercent: number;
  entries: Entry[];
}

/**
 * Tracks micro-transactions / small purchases under a user-configurable threshold (e.g. < ₹250).
 */
export function calculateSmallPurchases(
  activeEntries: readonly Entry[],
  thresholdCents: number
): SmallPurchasesSummary {
  const expenseEntries = activeEntries.filter((e) => e.kind === 'expense');

  let smallCount = 0;
  let smallTotalCents = 0;
  const smallEntries: Entry[] = [];

  let allTotalCents = 0;

  for (const entry of expenseEntries) {
    allTotalCents += entry.amountCents;
    if (entry.amountCents <= thresholdCents) {
      smallCount++;
      smallTotalCents += entry.amountCents;
      smallEntries.push(entry);
    }
  }

  const countSharePercent = expenseEntries.length > 0
    ? Math.round((smallCount / expenseEntries.length) * 1000) / 10
    : 0;

  const spendSharePercent = allTotalCents > 0
    ? Math.round((smallTotalCents / allTotalCents) * 1000) / 10
    : 0;

  return {
    thresholdCents,
    count: smallCount,
    totalCents: smallTotalCents,
    allExpenseCount: expenseEntries.length,
    allExpenseTotalCents: allTotalCents,
    countSharePercent,
    spendSharePercent,
    entries: smallEntries,
  };
}

export interface DaySpendStatus {
  dayNumber: number;
  isoDate: string;
  spentCents: number;
  isNoSpend: boolean;
  isInFuture: boolean;
}

export interface NoSpendCalendarSummary {
  year: number;
  month: number; // 1-12
  monthLabel: string;
  days: DaySpendStatus[];
  totalDays: number;
  noSpendDaysCount: number;
  spentDaysCount: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Computes calendar days and no-spend streaks for a given calendar month.
 */
export function calculateNoSpendCalendar(
  activeEntries: readonly Entry[],
  year: number,
  month: number, // 1-12
  tz: string,
  nowMs: number = Date.now()
): NoSpendCalendarSummary {
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayParts = getPartsInTz(nowMs, tz);
  const isCurrentMonth = todayParts.year === year && todayParts.month === month;

  // Map YYYY-MM-DD to spentCents
  const daySpendMap = new Map<string, number>();

  for (const entry of activeEntries) {
    if (entry.kind !== 'expense') continue;
    const parts = getPartsInTz(entry.occurredAt, entry.tz);
    if (parts.year === year && parts.month === month) {
      const iso = toISODateInTz(entry.occurredAt, entry.tz);
      const curr = daySpendMap.get(iso) ?? 0;
      daySpendMap.set(iso, curr + entry.amountCents);
    }
  }

  const days: DaySpendStatus[] = [];
  let noSpendCount = 0;
  let spentCount = 0;

  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const isoDate = `${year}-${mm}-${dd}`;

    const isInFuture = isCurrentMonth ? d > todayParts.day : false;
    const spentCents = daySpendMap.get(isoDate) ?? 0;
    const isNoSpend = !isInFuture && spentCents === 0;

    if (!isInFuture) {
      if (isNoSpend) {
        noSpendCount++;
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        spentCount++;
        runningStreak = 0;
      }
    }

    days.push({
      dayNumber: d,
      isoDate,
      spentCents,
      isNoSpend,
      isInFuture,
    });
  }

  // Calculate current active streak counting backwards from today (or last elapsed day)
  const elapsedDayCount = isCurrentMonth ? todayParts.day : daysInMonth;
  currentStreak = 0;
  for (let d = elapsedDayCount; d >= 1; d--) {
    const dayItem = days[d - 1];
    if (dayItem && dayItem.isNoSpend) {
      currentStreak++;
    } else {
      break;
    }
  }

  const monthDate = new Date(year, month - 1, 1);
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(monthDate);

  return {
    year,
    month,
    monthLabel,
    days,
    totalDays: isCurrentMonth ? todayParts.day : daysInMonth,
    noSpendDaysCount: noSpendCount,
    spentDaysCount: spentCount,
    currentStreak,
    longestStreak,
  };
}
