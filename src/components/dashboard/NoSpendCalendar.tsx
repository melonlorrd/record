import React, { useState } from 'react';
import { Entry } from '../../domain/types';
import { calculateNoSpendCalendar } from '../../domain/analytics';
import { formatINR } from '../../domain/money';
import { getDefaultTimezone, getPartsInTz } from '../../domain/dates';

export interface NoSpendCalendarProps {
  entries: Entry[];
}

export const NoSpendCalendar: React.FC<NoSpendCalendarProps> = ({ entries }) => {
  const tz = getDefaultTimezone();
  const currentParts = getPartsInTz(Date.now(), tz);

  const [selectedYear, setSelectedYear] = useState(currentParts.year);
  const [selectedMonth, setSelectedMonth] = useState(currentParts.month); // 1-12

  const summary = calculateNoSpendCalendar(entries, selectedYear, selectedMonth, tz);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Compute starting day of week for 1st of month to align calendar columns
  const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0 = Sun
  const weekDayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div>
          <h3>No-Spend Days Calendar</h3>
          <span className="text-muted small-text">Track zero-expense habit streaks</span>
        </div>

        {/* Month selector navigation */}
        <div className="month-nav-controls">
          <button
            type="button"
            className="btn-icon"
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            ◀
          </button>
          <span className="current-month-display">{summary.monthLabel}</span>
          <button
            type="button"
            className="btn-icon"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Streak indicators */}
      <div className="streak-stats-row">
        <div className="streak-tile">
          <span className="streak-icon">🔥</span>
          <div className="streak-content">
            <span className="streak-number">{summary.currentStreak} Days</span>
            <span className="streak-label">Current No-Spend Streak</span>
          </div>
        </div>

        <div className="streak-tile">
          <span className="streak-icon">🏆</span>
          <div className="streak-content">
            <span className="streak-number">{summary.longestStreak} Days</span>
            <span className="streak-label">Best Streak This Month</span>
          </div>
        </div>

        <div className="streak-tile">
          <span className="streak-icon">🎯</span>
          <div className="streak-content">
            <span className="streak-number">{summary.noSpendDaysCount} / {summary.totalDays} Days</span>
            <span className="streak-label">Zero-Expense Days</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid-wrapper">
        <div className="calendar-week-headers">
          {weekDayHeaders.map((day) => (
            <div key={day} className="calendar-header-cell">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-cells-grid">
          {/* Empty spacer cells before 1st of month */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-cell empty" />
          ))}

          {/* Days */}
          {summary.days.map((day) => {
            let statusClass = 'day-spend';
            if (day.isInFuture) {
              statusClass = 'day-future';
            } else if (day.isNoSpend) {
              statusClass = 'day-no-spend';
            }

            return (
              <div
                key={day.dayNumber}
                className={`calendar-cell ${statusClass}`}
                title={
                  day.isInFuture
                    ? 'Upcoming day'
                    : day.isNoSpend
                    ? `Day ${day.dayNumber}: ₹0 spent! (No-spend day)`
                    : `Day ${day.dayNumber}: ${formatINR(day.spentCents)} spent`
                }
              >
                <span className="cell-day-number">{day.dayNumber}</span>
                {!day.isInFuture && (
                  <span className="cell-indicator">
                    {day.isNoSpend ? '✓' : formatINR(day.spentCents, { compactIfZeroPaise: true })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
