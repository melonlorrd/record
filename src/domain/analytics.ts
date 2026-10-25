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

export interface WorkdayRoutineHourProfile {
  hour: number;           // 0-23
  hourLabel: string;      // e.g. "4 PM"
  timeRangeLabel: string; // e.g. "4:00 PM – 5:00 PM"
  workdayCount: number;
  workdayTotalCents: number;
  workdayAvgCents: number;
  weekendCount: number;
  weekendTotalCents: number;
  topCategoryName: string | null;
  topCategoryColor: string | null;
  isPeakRoutine: boolean;
}

export interface WorkdayRoutineCategoryItem {
  categoryId: string;
  name: string;
  color: string;
  count: number;
  totalCents: number;
  percentage: number;
}

export interface WorkdayRoutineFrequentItem {
  note: string;
  count: number;
  typicalAmountCents: number;
}

export interface WorkdayRoutineInsight {
  currentHour: number;
  isCurrentlyWorkday: boolean;
  selectedHour: number;
  selectedHourLabel: string;
  selectedTimeRangeLabel: string;
  totalWorkdaysRecorded: number;
  selectedHourWorkdayCount: number;
  selectedHourTotalCents: number;
  selectedHourAvgCents: number;
  frequencyPercentage: number;
  topCategories: WorkdayRoutineCategoryItem[];
  frequentItems: WorkdayRoutineFrequentItem[];
  routineSummary: string;
  hourlyProfiles: WorkdayRoutineHourProfile[];
}

/**
 * Analyzes workday (Monday-Friday) time-of-day spending patterns and habits.
 * Helps answer: "It is 4 PM on a weekday at work: what is my routine eating or spending pattern?"
 */
export function calculateWorkdayRoutineInsight(
  activeEntries: readonly Entry[],
  categories: readonly Category[],
  selectedHour?: number,
  tz: string = 'Asia/Kolkata',
  nowMs: number = Date.now()
): WorkdayRoutineInsight {
  const nowParts = getPartsInTz(nowMs, tz);
  const currentHour = nowParts.hour;
  const isCurrentlyWorkday = nowParts.weekday >= 1 && nowParts.weekday <= 5;
  const targetHour = selectedHour !== undefined ? selectedHour : currentHour;

  const categoryMap = new Map<string, Category>();
  for (const c of categories) {
    categoryMap.set(c.id, c);
  }

  // Track distinct workdays in dataset
  const workdayDatesSet = new Set<string>();

  // 24-hour profiles
  const hourWorkdayTotals = Array.from({ length: 24 }, () => ({
    count: 0,
    totalCents: 0,
    categoryCounts: new Map<string, { count: number; totalCents: number }>(),
  }));

  const hourWeekendTotals = Array.from({ length: 24 }, () => ({
    count: 0,
    totalCents: 0,
  }));

  // Selected hour specific data
  const selectedCatTotals = new Map<string, { count: number; totalCents: number }>();
  const selectedNoteTotals = new Map<string, { count: number; totalCents: number }>();

  for (const entry of activeEntries) {
    if (entry.kind !== 'expense') continue;
    const parts = getPartsInTz(entry.occurredAt, entry.tz || tz);
    const isWorkday = parts.weekday >= 1 && parts.weekday <= 5;
    const isoDate = toISODateInTz(entry.occurredAt, entry.tz || tz);

    if (isWorkday) {
      workdayDatesSet.add(isoDate);
      const wProfile = hourWorkdayTotals[parts.hour];
      if (wProfile) {
        wProfile.count += 1;
        wProfile.totalCents += entry.amountCents;
        const catStat = wProfile.categoryCounts.get(entry.categoryId) ?? { count: 0, totalCents: 0 };
        catStat.count += 1;
        catStat.totalCents += entry.amountCents;
        wProfile.categoryCounts.set(entry.categoryId, catStat);
      }

      if (parts.hour === targetHour) {
        // Accumulate for selected hour
        const catStat = selectedCatTotals.get(entry.categoryId) ?? { count: 0, totalCents: 0 };
        catStat.count += 1;
        catStat.totalCents += entry.amountCents;
        selectedCatTotals.set(entry.categoryId, catStat);

        const cleanNote = entry.note.trim() || 'General Expense';
        const noteStat = selectedNoteTotals.get(cleanNote) ?? { count: 0, totalCents: 0 };
        noteStat.count += 1;
        noteStat.totalCents += entry.amountCents;
        selectedNoteTotals.set(cleanNote, noteStat);
      }
    } else {
      const weProfile = hourWeekendTotals[parts.hour];
      if (weProfile) {
        weProfile.count += 1;
        weProfile.totalCents += entry.amountCents;
      }
    }
  }

  const formatHourLabel = (h: number): string => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH} ${period}`;
  };

  const formatRangeLabel = (h: number): string => {
    const startStr = formatHourLabel(h);
    const endStr = formatHourLabel((h + 1) % 24);
    return `${startStr} – ${endStr}`;
  };

  // Find peak workday routine hours (top 3 hours with most frequency)
  const sortedWorkdayHours = [...hourWorkdayTotals.map((h, idx) => ({ idx, count: h.count }))]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((x) => x.idx);

  const hourlyProfiles: WorkdayRoutineHourProfile[] = hourWorkdayTotals.map((w, h) => {
    const we = hourWeekendTotals[h] ?? { count: 0, totalCents: 0 };

    // Find top category for this hour
    let topCatName: string | null = null;
    let topCatColor: string | null = null;
    let maxCatCount = 0;

    for (const [catId, stat] of w.categoryCounts.entries()) {
      if (stat.count > maxCatCount) {
        maxCatCount = stat.count;
        const cat = categoryMap.get(catId);
        if (cat) {
          topCatName = cat.name;
          topCatColor = cat.color;
        }
      }
    }

    return {
      hour: h,
      hourLabel: formatHourLabel(h),
      timeRangeLabel: formatRangeLabel(h),
      workdayCount: w.count,
      workdayTotalCents: w.totalCents,
      workdayAvgCents: w.count > 0 ? Math.round(w.totalCents / w.count) : 0,
      weekendCount: we.count,
      weekendTotalCents: we.totalCents,
      topCategoryName: topCatName,
      topCategoryColor: topCatColor,
      isPeakRoutine: sortedWorkdayHours.includes(h) && w.count >= 3,
    };
  });

  const selectedTargetProfile = hourWorkdayTotals[targetHour] ?? { count: 0, totalCents: 0 };
  const totalWorkdays = Math.max(1, workdayDatesSet.size);
  const frequencyPct = Math.round((selectedTargetProfile.count / totalWorkdays) * 100);

  // Top categories for selected hour
  const topCategories: WorkdayRoutineCategoryItem[] = [];
  for (const [catId, stat] of selectedCatTotals.entries()) {
    const cat = categoryMap.get(catId);
    const name = cat ? cat.name : 'Uncategorized';
    const color = cat ? cat.color : '#8b949e';
    const percentage = selectedTargetProfile.totalCents > 0
      ? Math.round((stat.totalCents / selectedTargetProfile.totalCents) * 1000) / 10
      : 0;

    topCategories.push({
      categoryId: catId,
      name,
      color,
      count: stat.count,
      totalCents: stat.totalCents,
      percentage,
    });
  }
  topCategories.sort((a, b) => b.totalCents - a.totalCents);

  // Frequent items for selected hour
  const frequentItems: WorkdayRoutineFrequentItem[] = [];
  for (const [note, stat] of selectedNoteTotals.entries()) {
    frequentItems.push({
      note,
      count: stat.count,
      typicalAmountCents: Math.round(stat.totalCents / stat.count),
    });
  }
  frequentItems.sort((a, b) => b.count - a.count);

  // Generate natural language routine summary
  const targetLabel = formatHourLabel(targetHour);
  let routineSummary = '';
  if (selectedTargetProfile.count > 0) {
    const topCat = topCategories[0];
    const topItem = frequentItems[0];
    const avgRupees = (selectedTargetProfile.totalCents / selectedTargetProfile.count / 100).toFixed(0);

    if (topCat && topCat.percentage > 50) {
      routineSummary = `At ${targetLabel} on workdays, your primary routine is "${topCat.name}" (${topCat.percentage}% of spending at this hour). You've spent on this ${selectedTargetProfile.count} times averaging ~₹${avgRupees}/occurrence.`;
    } else if (topItem) {
      routineSummary = `At ${targetLabel} on workdays, you frequently spend on "${topItem.note}" (recorded ${topItem.count} times, typically ~₹${(topItem.typicalAmountCents / 100).toFixed(0)}).`;
    } else {
      routineSummary = `At ${targetLabel} on workdays, you have recorded ${selectedTargetProfile.count} transactions totaling ₹${(selectedTargetProfile.totalCents / 100).toFixed(0)}.`;
    }
  } else {
    routineSummary = `At ${targetLabel} on workdays, you usually have no recorded spending (typically working or not eating/ordering out during this hour).`;
  }

  return {
    currentHour,
    isCurrentlyWorkday,
    selectedHour: targetHour,
    selectedHourLabel: targetLabel,
    selectedTimeRangeLabel: formatRangeLabel(targetHour),
    totalWorkdaysRecorded: totalWorkdays,
    selectedHourWorkdayCount: selectedTargetProfile.count,
    selectedHourTotalCents: selectedTargetProfile.totalCents,
    selectedHourAvgCents: selectedTargetProfile.count > 0 ? Math.round(selectedTargetProfile.totalCents / selectedTargetProfile.count) : 0,
    frequencyPercentage: Math.min(100, frequencyPct),
    topCategories,
    frequentItems,
    routineSummary,
    hourlyProfiles,
  };
}
