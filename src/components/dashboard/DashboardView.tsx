import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/storeContext';
import {
  calculateCategoryBreakdown,
  calculateHabitShareByWeek,
  calculateMonthlyIncomeVsExpense,
  calculatePeriodSummary,
  calculateRunningBalance,
  calculateWeekdayHourHeatmap,
  filterEntriesByDateRange,
  getActiveEntries,
} from '../../domain/analytics';
import {
  getDateRangePreset,
  getDefaultTimezone,
  getPreviousPeriodRange,
  PresetRangeKey,
} from '../../domain/dates';
import { StatTiles } from './StatTiles';
import { MonthlyBars } from './MonthlyBars';
import { CategoryDonut } from './CategoryDonut';
import { BalanceLine } from './BalanceLine';
import { WeekdayHourHeatmap } from './WeekdayHourHeatmap';
import { HabitShare } from './HabitShare';
import { SmallPurchases } from './SmallPurchases';
import { NoSpendCalendar } from './NoSpendCalendar';

export const DashboardView: React.FC = () => {
  const { entries, categories } = useStore();
  const [preset, setPreset] = useState<PresetRangeKey>('thisMonth');

  const tz = getDefaultTimezone();

  // Compute selected date range and comparison previous range
  const { currentRange, prevRange } = useMemo(() => {
    const current = getDateRangePreset(preset, Date.now(), tz);
    const prev = getPreviousPeriodRange(current);
    return { currentRange: current, prevRange: prev };
  }, [preset, tz]);

  // Active entries (non-deleted)
  const activeEntries = useMemo(() => getActiveEntries(entries), [entries]);

  // Entries within selected date range
  const periodEntries = useMemo(() => {
    return filterEntriesByDateRange(activeEntries, currentRange.startMs, currentRange.endMs);
  }, [activeEntries, currentRange]);

  // Domain analytics outputs
  const summary = useMemo(() => {
    return calculatePeriodSummary(activeEntries, currentRange, prevRange);
  }, [activeEntries, currentRange, prevRange]);

  const monthlyBars = useMemo(() => {
    return calculateMonthlyIncomeVsExpense(activeEntries);
  }, [activeEntries]);

  const categoryBreakdown = useMemo(() => {
    return calculateCategoryBreakdown(periodEntries, categories);
  }, [periodEntries, categories]);

  const runningBalance = useMemo(() => {
    return calculateRunningBalance(activeEntries);
  }, [activeEntries]);

  const heatmapCells = useMemo(() => {
    return calculateWeekdayHourHeatmap(periodEntries);
  }, [periodEntries]);

  const habitWeeks = useMemo(() => {
    return calculateHabitShareByWeek(periodEntries, tz);
  }, [periodEntries, tz]);

  return (
    <div className="dashboard-view">
      {/* Date Range Selector Header */}
      <div className="dashboard-header card">
        <div className="dashboard-header-text">
          <h2>Financial Insights</h2>
          <p className="text-muted">Habits, cash flow, and spending patterns</p>
        </div>

        <div className="preset-selector-group" role="radiogroup" aria-label="Date Range">
          <button
            type="button"
            className={`preset-btn ${preset === 'thisMonth' ? 'active' : ''}`}
            onClick={() => setPreset('thisMonth')}
          >
            This Month
          </button>
          <button
            type="button"
            className={`preset-btn ${preset === 'last3Months' ? 'active' : ''}`}
            onClick={() => setPreset('last3Months')}
          >
            3 Months
          </button>
          <button
            type="button"
            className={`preset-btn ${preset === 'ytd' ? 'active' : ''}`}
            onClick={() => setPreset('ytd')}
          >
            Year to Date
          </button>
          <button
            type="button"
            className={`preset-btn ${preset === 'all' ? 'active' : ''}`}
            onClick={() => setPreset('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* 1. Stat Tiles: spent, income, vs prev period, avg per day */}
      <StatTiles summary={summary} />

      {/* 2. Monthly Bars & Category Donut */}
      <div className="charts-two-col">
        <MonthlyBars monthlyData={monthlyBars} />
        <CategoryDonut breakdown={categoryBreakdown} />
      </div>

      {/* 3. Running Balance Line */}
      <BalanceLine balancePoints={runningBalance} />

      {/* 4. Habit Share & Small Purchases */}
      <div className="charts-two-col">
        <HabitShare weeks={habitWeeks} />
        <SmallPurchases entries={periodEntries} />
      </div>

      {/* 5. Weekday x Hour Heatmap */}
      <WeekdayHourHeatmap cells={heatmapCells} />

      {/* 6. No-Spend Days Calendar */}
      <NoSpendCalendar entries={activeEntries} />
    </div>
  );
};
