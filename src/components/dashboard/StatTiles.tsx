import React from 'react';
import { PeriodSummary } from '../../domain/analytics';
import { formatINR } from '../../domain/money';

export interface StatTilesProps {
  summary: PeriodSummary;
}

export const StatTiles: React.FC<StatTilesProps> = ({ summary }) => {
  const isNetPositive = summary.netCents >= 0;

  return (
    <div className="stat-tiles-grid">
      {/* Spent Tile */}
      <div className="stat-tile card">
        <div className="stat-tile-header">
          <span className="stat-title">Total Spent</span>
          <span className="stat-icon">💸</span>
        </div>
        <div className="stat-value expense-text">
          {formatINR(summary.spentCents, { compactIfZeroPaise: true })}
        </div>
        <div className="stat-footer">
          {summary.spentChangePercent !== null ? (
            <span
              className={`trend-pill ${
                summary.spentChangePercent > 0 ? 'trend-up-bad' : 'trend-down-good'
              }`}
            >
              {summary.spentChangePercent > 0 ? '↑' : '↓'} {Math.abs(summary.spentChangePercent)}%
            </span>
          ) : (
            <span className="text-muted">No prev data</span>
          )}
          <span className="stat-footer-text">vs previous period</span>
        </div>
      </div>

      {/* Income Tile */}
      <div className="stat-tile card">
        <div className="stat-tile-header">
          <span className="stat-title">Total Income</span>
          <span className="stat-icon">💰</span>
        </div>
        <div className="stat-value income-text">
          {formatINR(summary.incomeCents, { compactIfZeroPaise: true })}
        </div>
        <div className="stat-footer">
          {summary.incomeChangePercent !== null ? (
            <span
              className={`trend-pill ${
                summary.incomeChangePercent >= 0 ? 'trend-up-good' : 'trend-down-bad'
              }`}
            >
              {summary.incomeChangePercent >= 0 ? '↑' : '↓'} {Math.abs(summary.incomeChangePercent)}%
            </span>
          ) : (
            <span className="text-muted">No prev data</span>
          )}
          <span className="stat-footer-text">vs previous period</span>
        </div>
      </div>

      {/* Net Balance Tile */}
      <div className="stat-tile card">
        <div className="stat-tile-header">
          <span className="stat-title">Net Savings</span>
          <span className="stat-icon">{isNetPositive ? '📈' : '📉'}</span>
        </div>
        <div className={`stat-value ${isNetPositive ? 'income-text' : 'expense-text'}`}>
          {formatINR(summary.netCents, { compactIfZeroPaise: true })}
        </div>
        <div className="stat-footer">
          <span className="stat-footer-text">
            {isNetPositive ? 'Savings Surplus' : 'Deficit this period'}
          </span>
        </div>
      </div>

      {/* Daily Average Spend */}
      <div className="stat-tile card">
        <div className="stat-tile-header">
          <span className="stat-title">Avg Daily Spend</span>
          <span className="stat-icon">📅</span>
        </div>
        <div className="stat-value">
          {formatINR(summary.avgDailySpendCents, { compactIfZeroPaise: true })}
        </div>
        <div className="stat-footer">
          <span className="stat-footer-text">
            Across {summary.daysInPeriod} days ({summary.entryCount} transactions)
          </span>
        </div>
      </div>
    </div>
  );
};
