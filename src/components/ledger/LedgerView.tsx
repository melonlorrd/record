import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/storeContext';
import { Entry, Category } from '../../domain/types';
import { formatINR } from '../../domain/money';
import { formatDayHeader, formatTimeLabel, toISODateInTz, toISOMonthInTz } from '../../domain/dates';
import { getActiveEntries } from '../../domain/analytics';
import { QuickAddModal } from './QuickAddModal';
import { EditEntryModal } from './EditEntryModal';

export const LedgerView: React.FC = () => {
  const { entries, categories, softDeleteEntry } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Map category ID to Category object
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const cat of categories) {
      map.set(cat.id, cat);
    }
    return map;
  }, [categories]);

  // Extract distinct months for the month filter dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const e of entries) {
      if (!e.deleted) {
        months.add(toISOMonthInTz(e.occurredAt, e.tz));
      }
    }
    return Array.from(months).sort().reverse();
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    const active = getActiveEntries(entries);

    return active.filter((entry) => {
      // Month filter
      if (selectedMonth !== 'ALL') {
        const m = toISOMonthInTz(entry.occurredAt, entry.tz);
        if (m !== selectedMonth) return false;
      }

      // Category filter
      if (selectedCategoryId !== 'ALL' && entry.categoryId !== selectedCategoryId) {
        return false;
      }

      // Search query (note, category name, tags)
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const noteMatch = entry.note.toLowerCase().includes(q);
        const cat = categoryMap.get(entry.categoryId);
        const catMatch = cat ? cat.name.toLowerCase().includes(q) : false;
        const tagMatch = entry.tags.some((t) => t.toLowerCase().includes(q));
        if (!noteMatch && !catMatch && !tagMatch) return false;
      }

      return true;
    }).sort((a, b) => b.occurredAt - a.occurredAt); // Newest first
  }, [entries, selectedMonth, selectedCategoryId, searchQuery, categoryMap]);

  // Group filtered entries by calendar day (ISO date)
  const groupedByDay = useMemo(() => {
    const groups: {
      dateKey: string;
      headerLabel: string;
      dayTotalExpenseCents: number;
      dayTotalIncomeCents: number;
      entries: Entry[];
    }[] = [];

    const groupMap = new Map<string, {
      dateKey: string;
      headerLabel: string;
      dayTotalExpenseCents: number;
      dayTotalIncomeCents: number;
      entries: Entry[];
    }>();

    for (const entry of filteredEntries) {
      const dateKey = toISODateInTz(entry.occurredAt, entry.tz);
      let group = groupMap.get(dateKey);

      if (!group) {
        group = {
          dateKey,
          headerLabel: formatDayHeader(entry.occurredAt, entry.tz),
          dayTotalExpenseCents: 0,
          dayTotalIncomeCents: 0,
          entries: [],
        };
        groupMap.set(dateKey, group);
        groups.push(group);
      }

      group.entries.push(entry);
      if (entry.kind === 'expense') {
        group.dayTotalExpenseCents += entry.amountCents;
      } else {
        group.dayTotalIncomeCents += entry.amountCents;
      }
    }

    return groups;
  }, [filteredEntries]);

  return (
    <div className="ledger-view">
      {/* Header and Filter Controls */}
      <div className="ledger-controls card">
        <div className="search-and-add-row">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search note, category, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-add-transaction"
            onClick={() => setIsQuickAddOpen(true)}
          >
            + Add
          </button>
        </div>

        <div className="filter-dropdowns-row">
          <div className="filter-select-group">
            <label className="filter-label" htmlFor="month-select">Month</label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="select-input"
            >
              <option value="ALL">All Months</option>
              {availableMonths.map((m) => {
                const [year, month] = m.split('-');
                const d = new Date(parseInt(year!, 10), parseInt(month!, 10) - 1, 1);
                const label = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(d);
                return (
                  <option key={m} value={m}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="filter-select-group">
            <label className="filter-label" htmlFor="category-select">Category</label>
            <select
              id="category-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="select-input"
            >
              <option value="ALL">All Categories</option>
              {categories
                .filter((c) => !c.deleted)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.archived ? '(Archived)' : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Entries List */}
      <div className="ledger-list">
        {groupedByDay.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">💸</div>
            <h3>No transactions found</h3>
            <p>Try adjusting your search filters or record a new transaction.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsQuickAddOpen(true)}
            >
              Add First Transaction
            </button>
          </div>
        ) : (
          groupedByDay.map((group) => (
            <div key={group.dateKey} className="day-group">
              <div className="day-group-header">
                <span className="day-group-title">{group.headerLabel}</span>
                <span className="day-group-totals">
                  {group.dayTotalIncomeCents > 0 && (
                    <span className="day-income-tag">
                      +{formatINR(group.dayTotalIncomeCents, { compactIfZeroPaise: true })}
                    </span>
                  )}
                  {group.dayTotalExpenseCents > 0 && (
                    <span className="day-expense-tag">
                      -{formatINR(group.dayTotalExpenseCents, { compactIfZeroPaise: true })}
                    </span>
                  )}
                </span>
              </div>

              {/* Responsive Container: Cards on Mobile, Table on Wide screens */}
              <div className="transactions-container">
                {/* Mobile Cards */}
                <div className="mobile-cards-list">
                  {group.entries.map((entry) => {
                    const cat = categoryMap.get(entry.categoryId);
                    const isIncome = entry.kind === 'income';

                    return (
                      <div
                        key={entry.id}
                        className="entry-card card"
                        onClick={() => setEditingEntry(entry)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="entry-card-left">
                          <span
                            className="entry-color-dot"
                            style={{ backgroundColor: cat ? cat.color : '#94a3b8' }}
                          />
                          <div className="entry-details">
                            <div className="entry-title-row">
                              <span className="entry-note">
                                {entry.note || (cat ? cat.name : 'Uncategorized')}
                              </span>
                              {entry.intent && (
                                <span className={`intent-badge intent-${entry.intent}`}>
                                  {entry.intent === 'need' && '🌱 Need'}
                                  {entry.intent === 'want' && '☕ Want'}
                                  {entry.intent === 'impulse' && '⚡ Impulse'}
                                </span>
                              )}
                            </div>
                            <div className="entry-subtitle-row">
                              <span className="entry-category-name">{cat ? cat.name : 'General'}</span>
                              <span className="entry-dot-separator">•</span>
                              <span className="entry-time">{formatTimeLabel(entry.occurredAt, entry.tz)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="entry-card-right">
                          <span className={`entry-amount ${isIncome ? 'amount-income' : 'amount-expense'}`}>
                            {isIncome ? '+' : '-'}{formatINR(entry.amountCents)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Wide Screen Table */}
                <div className="desktop-table-wrapper">
                  <table className="desktop-table">
                    <colgroup>
                      <col style={{ width: '95px' }} />
                      <col style={{ width: '200px' }} />
                      <col />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '135px' }} />
                      <col style={{ width: '110px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Category</th>
                        <th>Note</th>
                        <th>Intent</th>
                        <th className="text-right">Amount (₹)</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.entries.map((entry) => {
                        const cat = categoryMap.get(entry.categoryId);
                        const isIncome = entry.kind === 'income';

                        return (
                          <tr key={entry.id}>
                            <td className="text-muted">{formatTimeLabel(entry.occurredAt, entry.tz)}</td>
                            <td>
                              <span className="category-pill">
                                <span
                                  className="pill-dot"
                                  style={{ backgroundColor: cat ? cat.color : '#94a3b8' }}
                                />
                                {cat ? cat.name : 'Uncategorized'}
                              </span>
                            </td>
                            <td className="font-medium table-cell-note">{entry.note || '—'}</td>
                            <td>
                              {entry.intent ? (
                                <span className={`intent-badge intent-${entry.intent}`}>
                                  {entry.intent === 'need' && '🌱 Need'}
                                  {entry.intent === 'want' && '☕ Want'}
                                  {entry.intent === 'impulse' && '⚡ Impulse'}
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className={`text-right font-semibold ${isIncome ? 'amount-income' : 'amount-expense'}`}>
                              {isIncome ? '+' : '-'}{formatINR(entry.amountCents)}
                            </td>
                            <td className="text-right">
                              <div className="table-actions-cell">
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => setEditingEntry(entry)}
                                  title="Edit transaction"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => void softDeleteEntry(entry.id)}
                                  title="Delete transaction"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button for Mobile Add */}
      <button
        type="button"
        className="fab-add-btn"
        onClick={() => setIsQuickAddOpen(true)}
        aria-label="Add transaction"
      >
        +
      </button>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />

      {/* Edit Entry Modal */}
      <EditEntryModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
      />
    </div>
  );
};
