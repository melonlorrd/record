import React, { useState } from 'react';
import { Entry, Category } from '../../domain/types';
import { calculateWorkdayRoutineInsight } from '../../domain/analytics';
import { formatINR } from '../../domain/money';
import { getDefaultTimezone, getPartsInTz } from '../../domain/dates';

export interface WorkdayRoutineProps {
  entries: Entry[];
  categories: Category[];
}

export const WorkdayRoutine: React.FC<WorkdayRoutineProps> = ({ entries, categories }) => {
  const tz = getDefaultTimezone();
  const currentParts = getPartsInTz(Date.now(), tz);

  // Default selected hour to 16 (4 PM) or current hour if during work hours
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    // If between 9 AM and 8 PM, default to current hour, otherwise 16 (4 PM)
    if (currentParts.hour >= 9 && currentParts.hour <= 20) {
      return currentParts.hour;
    }
    return 16; // 4:00 PM
  });

  const insight = calculateWorkdayRoutineInsight(
    entries,
    categories,
    selectedHour,
    tz,
    Date.now()
  );

  const quickRoutineHours = [
    { hour: 10, label: '10 AM', icon: '☕', note: 'Chai & Breakfast' },
    { hour: 13, label: '1 PM', icon: '🍱', note: 'Lunch Break' },
    { hour: 16, label: '4 PM', icon: '🫖', note: 'Afternoon Tea & Snack' },
    { hour: 19, label: '7 PM', icon: '🌆', note: 'Post-Work / Dinner' },
  ];

  return (
    <div className="card chart-card workday-routine-card">
      <div className="chart-header">
        <div>
          <div className="routine-title-row">
            <h3>Workday Routine & Habit Clock</h3>
            <span className="live-clock-pill">
              {insight.isCurrentlyWorkday ? '💼 Workday' : '🌴 Weekend'} • {currentParts.hour % 12 === 0 ? 12 : currentParts.hour % 12}:{String(currentParts.minute).padStart(2, '0')} {currentParts.hour >= 12 ? 'PM' : 'AM'}
            </span>
          </div>
          <span className="text-muted small-text">
            Analyze what you typically eat, drink, or spend during work hours (Mon–Fri)
          </span>
        </div>

        {/* Quick jump presets */}
        <div className="quick-hour-presets">
          {quickRoutineHours.map((qh) => (
            <button
              type="button"
              key={qh.hour}
              className={`pill-btn ${selectedHour === qh.hour ? 'active-pill' : ''}`}
              onClick={() => setSelectedHour(qh.hour)}
              title={qh.note}
            >
              <span>{qh.icon}</span> {qh.label}
            </button>
          ))}
        </div>
      </div>

      {/* 24-Hour Interactive Timeline Bar */}
      <div className="routine-timeline-container">
        <div className="timeline-header-label text-muted small-text">
          <span>Tap any hour to explore your workday routine:</span>
          <span className="selected-time-highlight">Selected: {insight.selectedTimeRangeLabel}</span>
        </div>

        <div className="timeline-hours-bar">
          {insight.hourlyProfiles.map((p) => {
            const isSelected = p.hour === selectedHour;
            const isCurrent = p.hour === insight.currentHour;
            const hasSpend = p.workdayCount > 0;

            return (
              <button
                type="button"
                key={p.hour}
                className={`hour-bar-segment ${isSelected ? 'selected-hour' : ''} ${isCurrent ? 'current-hour' : ''} ${p.isPeakRoutine ? 'peak-routine' : ''}`}
                onClick={() => setSelectedHour(p.hour)}
                title={`${p.timeRangeLabel}: ${p.workdayCount} workday transactions (${formatINR(p.workdayTotalCents, { compactIfZeroPaise: true })})`}
              >
                <span className="hour-bar-label">
                  {p.hour % 3 === 0 ? (p.hour === 0 ? '12a' : p.hour === 12 ? '12p' : `${p.hour % 12}${p.hour >= 12 ? 'p' : 'a'}`) : ''}
                </span>
                <div
                  className="hour-bar-fill"
                  style={{
                    height: `${Math.min(100, Math.max(15, p.workdayCount * 12))}%`,
                    backgroundColor: hasSpend ? (p.topCategoryColor || 'var(--brand-primary)') : 'transparent',
                    opacity: isSelected ? 1 : 0.65,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Routine Detail Card */}
      <div className="routine-detail-box">
        <div className="routine-banner">
          <div className="routine-banner-icon">
            {selectedHour >= 6 && selectedHour < 12 && '☕'}
            {selectedHour >= 12 && selectedHour < 15 && '🍱'}
            {selectedHour >= 15 && selectedHour < 18 && '🫖'}
            {selectedHour >= 18 && selectedHour < 22 && '🍲'}
            {(selectedHour >= 22 || selectedHour < 6) && '🌙'}
          </div>
          <div className="routine-banner-text">
            <h4 className="routine-banner-heading">
              {insight.selectedTimeRangeLabel} Habit Profile
            </h4>
            <p className="routine-banner-desc">{insight.routineSummary}</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="routine-metrics-grid">
          <div className="routine-metric-card">
            <span className="metric-label">Workday Occurrences</span>
            <span className="metric-value font-semibold">
              {insight.selectedHourWorkdayCount} times
            </span>
            <span className="metric-footer text-muted">
              {insight.frequencyPercentage}% of recorded workdays
            </span>
          </div>

          <div className="routine-metric-card">
            <span className="metric-label">Average Outflow</span>
            <span className="metric-value font-semibold expense-text">
              {formatINR(insight.selectedHourAvgCents, { compactIfZeroPaise: true })}
            </span>
            <span className="metric-footer text-muted">per workday break</span>
          </div>

          <div className="routine-metric-card">
            <span className="metric-label">Total Outflow at {insight.selectedHourLabel}</span>
            <span className="metric-value font-semibold">
              {formatINR(insight.selectedHourTotalCents, { compactIfZeroPaise: true })}
            </span>
            <span className="metric-footer text-muted">across all workdays</span>
          </div>
        </div>

        {/* Categories & Frequent Items */}
        <div className="routine-breakdown-columns">
          {/* Categories */}
          <div className="breakdown-col">
            <h5 className="col-heading">Categories at {insight.selectedHourLabel}</h5>
            {insight.topCategories.length === 0 ? (
              <p className="text-muted small-text">No category spending recorded at this hour.</p>
            ) : (
              <div className="cat-bars-list">
                {insight.topCategories.map((cat) => (
                  <div key={cat.categoryId} className="cat-bar-item">
                    <div className="cat-bar-info">
                      <span className="category-pill">
                        <span className="pill-dot" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                      <span className="cat-bar-amount font-medium">
                        {formatINR(cat.totalCents, { compactIfZeroPaise: true })} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Frequent Routine Items / Notes */}
          <div className="breakdown-col">
            <h5 className="col-heading">Common Orders & Breaks</h5>
            {insight.frequentItems.length === 0 ? (
              <p className="text-muted small-text">No frequent transactions recorded.</p>
            ) : (
              <div className="frequent-items-list">
                {insight.frequentItems.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="frequent-item-row">
                    <div className="frequent-item-left">
                      <span className="frequent-bullet">▸</span>
                      <span className="frequent-note">{item.note}</span>
                    </div>
                    <div className="frequent-item-right">
                      <span className="frequent-amount font-medium">
                        ~{formatINR(item.typicalAmountCents, { compactIfZeroPaise: true })}
                      </span>
                      <span className="frequent-count text-muted">({item.count}x)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
