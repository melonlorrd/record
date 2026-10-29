import React, { useState } from 'react';
import { Entry } from '../../domain/types';
import { calculateSmallPurchases } from '../../domain/analytics';
import { formatINR } from '../../domain/money';
import { formatDateLabel } from '../../domain/dates';

export interface SmallPurchasesProps {
  entries: Entry[];
}

export const SmallPurchases: React.FC<SmallPurchasesProps> = ({ entries }) => {
  // Configurable threshold in cents (defaults to ₹250.00 = 25000 cents)
  const [thresholdCents, setThresholdCents] = useState(25000);

  const summary = calculateSmallPurchases(entries, thresholdCents);

  const presetThresholds = [
    { label: formatINR(10000, { compactIfZeroPaise: true }), cents: 10000 },
    { label: formatINR(25000, { compactIfZeroPaise: true }), cents: 25000 },
    { label: formatINR(50000, { compactIfZeroPaise: true }), cents: 50000 },
    { label: formatINR(100000, { compactIfZeroPaise: true }), cents: 100000 },
  ];

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div>
          <h3>Micro-Purchase Tracker</h3>
          <span className="text-muted small-text">
            Monitor frequent small expenses that quietly add up
          </span>
        </div>

        {/* Configurable threshold selector */}
        <div className="threshold-pill-group">
          <span className="threshold-label">Threshold:</span>
          {presetThresholds.map((preset) => (
            <button
              type="button"
              key={preset.cents}
              className={`pill-btn ${thresholdCents === preset.cents ? 'active-pill' : ''}`}
              onClick={() => setThresholdCents(preset.cents)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="small-purchase-stats">
        <div className="sub-stat-tile">
          <span className="sub-stat-label">Transactions &le; {formatINR(thresholdCents, { compactIfZeroPaise: true })}</span>
          <span className="sub-stat-value">{summary.count} items</span>
          <span className="sub-stat-footer text-muted">{summary.countSharePercent}% of all purchases</span>
        </div>

        <div className="sub-stat-tile">
          <span className="sub-stat-label">Total Outflow</span>
          <span className="sub-stat-value expense-text">{formatINR(summary.totalCents)}</span>
          <span className="sub-stat-footer text-muted">{summary.spendSharePercent}% of total expenses</span>
        </div>
      </div>

      {/* Recent micro-purchases list */}
      {summary.entries.length > 0 && (
        <div className="small-purchases-list">
          <h4 className="list-heading">Recent Micro-Transactions</h4>
          <div className="micro-items-grid">
            {summary.entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="micro-item-pill">
                <span className="micro-item-note">{entry.note || 'Expense'}</span>
                <span className="micro-item-amount">{formatINR(entry.amountCents)}</span>
                <span className="micro-item-date text-muted">
                  {formatDateLabel(entry.occurredAt, entry.tz)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
