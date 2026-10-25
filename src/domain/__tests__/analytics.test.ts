import { describe, it, expect } from 'vitest';
import {
  getActiveEntries,
  calculatePeriodSummary,
  calculateMonthlyIncomeVsExpense,
  calculateCategoryBreakdown,
  calculateRunningBalance,
  calculateWeekdayHourHeatmap,
  calculateHabitShareByWeek,
  calculateSmallPurchases,
  calculateNoSpendCalendar,
} from '../analytics';
import { Entry, Category } from '../types';

describe('Analytics Domain Logic', () => {
  const catFood: Category = {
    id: 'c1111111-1111-4111-8111-111111111111',
    name: 'Food',
    color: '#10b981',
    archived: false,
    updatedAt: 1720000000000,
    deleted: false,
  };

  const catSalary: Category = {
    id: 'c2222222-2222-4222-8222-222222222222',
    name: 'Salary',
    color: '#14b8a6',
    archived: false,
    updatedAt: 1720000000000,
    deleted: false,
  };

  const sampleEntries: Entry[] = [
    {
      id: 'e1',
      kind: 'income',
      amountCents: 10000000, // ₹1,00,000
      categoryId: catSalary.id,
      occurredAt: 1727740800000, // 2024-10-01 00:00 UTC (05:30 IST)
      tz: 'Asia/Kolkata',
      tags: ['salary'],
      note: 'Oct Salary',
      createdAt: 1727740800000,
      updatedAt: 1727740800000,
      deviceId: 'dev1',
      deleted: false,
    },
    {
      id: 'e2',
      kind: 'expense',
      amountCents: 15000, // ₹150 (small purchase)
      categoryId: catFood.id,
      occurredAt: 1727845200000, // 2024-10-02 05:00 UTC (10:30 IST)
      tz: 'Asia/Kolkata',
      intent: 'need',
      tags: ['chai'],
      note: 'Morning chai',
      createdAt: 1727845200000,
      updatedAt: 1727845200000,
      deviceId: 'dev1',
      deleted: false,
    },
    {
      id: 'e3',
      kind: 'expense',
      amountCents: 450000, // ₹4,500
      categoryId: catFood.id,
      occurredAt: 1728043200000, // 2024-10-04 12:00 UTC (17:30 IST)
      tz: 'Asia/Kolkata',
      intent: 'impulse',
      tags: ['dinner'],
      note: 'Team dinner',
      createdAt: 1728043200000,
      updatedAt: 1728043200000,
      deviceId: 'dev1',
      deleted: false,
    },
    {
      id: 'e4',
      kind: 'expense',
      amountCents: 200000,
      categoryId: catFood.id,
      occurredAt: 1728043200000,
      tz: 'Asia/Kolkata',
      tags: ['deleted'],
      note: 'Mistake entry',
      createdAt: 1728043200000,
      updatedAt: 1728043200000,
      deviceId: 'dev1',
      deleted: true, // soft deleted
    },
  ];

  it('filters out soft-deleted entries', () => {
    const active = getActiveEntries(sampleEntries);
    expect(active.length).toBe(3);
    expect(active.some((e) => e.deleted)).toBe(false);
  });

  it('computes period summary with income, expense, and daily average', () => {
    const active = getActiveEntries(sampleEntries);
    const current = {
      label: 'Current',
      startMs: 1727740000000,
      endMs: 1728100000000,
    };
    const prev = {
      label: 'Previous',
      startMs: 1727380000000,
      endMs: 1727740000000,
    };

    const summary = calculatePeriodSummary(active, current, prev);
    expect(summary.incomeCents).toBe(10000000);
    expect(summary.spentCents).toBe(15000 + 450000); // 465000
    expect(summary.netCents).toBe(10000000 - 465000);
    expect(summary.entryCount).toBe(3);
  });

  it('calculates monthly income vs expense bars', () => {
    const active = getActiveEntries(sampleEntries);
    const bars = calculateMonthlyIncomeVsExpense(active);
    expect(bars.length).toBe(1);
    expect(bars[0]?.incomeCents).toBe(10000000);
    expect(bars[0]?.expenseCents).toBe(465000);
  });

  it('calculates category breakdown percentages', () => {
    const active = getActiveEntries(sampleEntries);
    const breakdown = calculateCategoryBreakdown(active, [catFood, catSalary]);
    expect(breakdown.length).toBe(1); // Only expense category
    expect(breakdown[0]?.categoryId).toBe(catFood.id);
    expect(breakdown[0]?.totalCents).toBe(465000);
    expect(breakdown[0]?.percentage).toBe(100);
  });

  it('calculates running balance correctly', () => {
    const active = getActiveEntries(sampleEntries);
    const points = calculateRunningBalance(active);
    expect(points.length).toBe(3);
    // 1st entry: +10000000 -> 10000000
    expect(points[0]?.balanceCents).toBe(10000000);
    // 2nd entry: -15000 -> 9985000
    expect(points[1]?.balanceCents).toBe(9985000);
    // 3rd entry: -450000 -> 9535000
    expect(points[2]?.balanceCents).toBe(9535000);
  });

  it('calculates heatmap matrix with timezone sensitivity', () => {
    // 2024-10-02 05:00 UTC is:
    // in UTC: Wednesday, hour 5
    // in Asia/Kolkata (+05:30): Wednesday, hour 10 (10:30)
    // in America/New_York (-04:00): Wednesday, hour 1 (01:00)
    const entryUTC: Entry = {
      id: 't1',
      kind: 'expense',
      amountCents: 5000,
      categoryId: catFood.id,
      occurredAt: 1727845200000, // 2024-10-02T05:00:00Z
      tz: 'UTC',
      tags: [],
      note: 'UTC entry',
      createdAt: 1727845200000,
      updatedAt: 1727845200000,
      deviceId: 'dev1',
      deleted: false,
    };

    const entryIST: Entry = {
      id: 't2',
      kind: 'expense',
      amountCents: 8000,
      categoryId: catFood.id,
      occurredAt: 1727845200000, // exact same epoch timestamp!
      tz: 'Asia/Kolkata',
      tags: [],
      note: 'IST entry',
      createdAt: 1727845200000,
      updatedAt: 1727845200000,
      deviceId: 'dev1',
      deleted: false,
    };

    const heatmap = calculateWeekdayHourHeatmap([entryUTC, entryIST]);
    // For entryUTC: weekday 3 (Wed), hour 5
    const cellUtc = heatmap.find((c) => c.weekday === 3 && c.hour === 5);
    expect(cellUtc?.totalCents).toBe(5000);

    // For entryIST: weekday 3 (Wed), hour 10
    const cellIst = heatmap.find((c) => c.weekday === 3 && c.hour === 10);
    expect(cellIst?.totalCents).toBe(8000);
  });

  it('calculates small purchases summary under threshold', () => {
    const active = getActiveEntries(sampleEntries);
    const small = calculateSmallPurchases(active, 25000); // <= ₹250
    expect(small.count).toBe(1);
    expect(small.totalCents).toBe(15000);
    expect(small.entries[0]?.id).toBe('e2');
  });

  it('calculates weekly habit share by intent', () => {
    const active = getActiveEntries(sampleEntries);
    const weeks = calculateHabitShareByWeek(active, 'Asia/Kolkata');
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks[0]?.totalCents).toBeGreaterThan(0);
  });

  it('calculates no-spend calendar and streak counts', () => {
    const active = getActiveEntries(sampleEntries);
    // Year 2024, Month 10 (October 2024), tz: Asia/Kolkata
    // Mock nowMs to end of October 2024
    const mockNow = new Date(2024, 9, 31, 23, 59, 59).getTime();
    const calendar = calculateNoSpendCalendar(active, 2024, 10, 'Asia/Kolkata', mockNow);

    expect(calendar.totalDays).toBe(31);
    // Days 2 and 4 had expenses. The other 29 days had 0 spend.
    expect(calendar.spentDaysCount).toBe(2);
    expect(calendar.noSpendDaysCount).toBe(29);
    // Current streak backwards from Oct 31 to Oct 5 is 27 days
    expect(calendar.currentStreak).toBe(27);
  });
});
