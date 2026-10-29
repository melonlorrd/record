import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../../store/storeContext';
import { Entry, Category } from '../../domain/types';
import { formatINR } from '../../domain/money';
import { formatDayHeader, formatTimeLabel, toISODateInTz, toISOMonthInTz } from '../../domain/dates';
import { getActiveEntries } from '../../domain/analytics';
import { QuickAddModal } from './QuickAddModal';
import { EditEntryModal } from './EditEntryModal';
import {
  SearchIcon,
  PlusIcon,
  CloseIcon,
  NeedIcon,
  WantIcon,
  ImpulseIcon,
  EditIcon,
  TrashIcon,
  LedgerIcon,
  ChevronDownIcon,
} from '../common/Icons';

type QuickFilter = 'ALL' | 'EXPENSE' | 'INCOME' | 'NEED' | 'WANT' | 'IMPULSE';

export interface LedgerViewProps {
  isSearchActiveMobile?: boolean;
  onCloseMobileSearch?: () => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  isSearchActiveMobile = false,
  onCloseMobileSearch,
}) => {
  const { entries, categories, softDeleteEntry } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isSearchActiveMobile) {
      searchInputRef.current?.focus();
    }
  }, [isSearchActiveMobile]);

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

      // Quick intent / kind filter
      if (quickFilter === 'EXPENSE' && entry.kind !== 'expense') return false;
      if (quickFilter === 'INCOME' && entry.kind !== 'income') return false;
      if (quickFilter === 'NEED' && entry.intent !== 'need') return false;
      if (quickFilter === 'WANT' && entry.intent !== 'want') return false;
      if (quickFilter === 'IMPULSE' && entry.intent !== 'impulse') return false;

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
  }, [entries, selectedMonth, selectedCategoryId, quickFilter, searchQuery, categoryMap]);

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

  const quickFilterOptions: { key: QuickFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'EXPENSE', label: 'Expenses' },
    { key: 'INCOME', label: 'Income' },
    { key: 'NEED', label: 'Needs' },
    { key: 'WANT', label: 'Wants' },
    { key: 'IMPULSE', label: 'Impulses' },
  ];

  return (
    <div className="ledger-view">
      {/* Top Search, Add, and Filter Header */}
      <section className="ledger-top-section" aria-label="Ledger Controls">
        <div className="search-and-action-bar">
          {/* iOS 27 Pill Search Field (adaptive: integrated on mobile, always visible on desktop) */}
          <div className={`pill-search-container ${isSearchActiveMobile || searchQuery ? 'mobile-visible' : 'mobile-hidden'}`}>
            <span className="search-icon-adornment">
              <SearchIcon size={16} />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search note, category, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pill-search-input"
            />
            {(searchQuery || isSearchActiveMobile) && (
              <button
                type="button"
                className="search-clear-circle"
                onClick={() => {
                  setSearchQuery('');
                  onCloseMobileSearch?.();
                }}
                aria-label="Close search"
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>

          {/* Unified Controls Row: Add + Month + Category */}
          <div className="ledger-controls-row">
            {/* Inline Tinted Glass Add Capsule */}
            <button
              type="button"
              className="glass-add-capsule-btn"
              onClick={() => setIsQuickAddOpen(true)}
              aria-label="Add transaction"
            >
              <PlusIcon size={16} />
              <span>Add</span>
            </button>

            {/* Native pull-down style filter/sort triggers */}
            <div className="pull-down-triggers-row">
              <div className="pull-down-capsule">
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pull-down-select"
                  aria-label="Filter by Month"
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
                <ChevronDownIcon size={12} className="select-chevron" />
              </div>

              <div className="pull-down-capsule">
                <select
                  id="category-select"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="pull-down-select"
                  aria-label="Filter by Category"
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
                <ChevronDownIcon size={12} className="select-chevron" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Filter Capsule Segmented Row */}
        <div className="quick-filter-capsule-row" role="radiogroup" aria-label="Filter by category or intent">
          {quickFilterOptions.map((opt) => {
            const isActive = quickFilter === opt.key;
            return (
              <button
                type="button"
                key={opt.key}
                className={`quick-filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => setQuickFilter(opt.key)}
                aria-checked={isActive}
                role="radio"
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Inset-Grouped Ledger Entries List */}
      <div className="inset-grouped-container" role="feed" aria-label="Transaction history">
        {groupedByDay.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon-circle">
              <LedgerIcon size={32} />
            </div>
            <h3 className="empty-state-title">No transactions found</h3>
            <p className="empty-state-subtitle">Try adjusting your filters or record a new transaction.</p>
            <button
              type="button"
              className="glass-add-capsule-btn"
              onClick={() => setIsQuickAddOpen(true)}
            >
              <PlusIcon size={16} />
              <span>Record First Transaction</span>
            </button>
          </div>
        ) : (
          groupedByDay.map((group) => (
            <div key={group.dateKey} className="inset-date-section">
              {/* Date Header: Date left, daily total right */}
              <div className="inset-section-header">
                <span className="section-header-date">{group.headerLabel}</span>
                <span className="section-header-totals">
                  {group.dayTotalIncomeCents > 0 && (
                    <span className="day-total-income">
                      +{formatINR(group.dayTotalIncomeCents, { compactIfZeroPaise: true })}
                    </span>
                  )}
                  {group.dayTotalExpenseCents > 0 && (
                    <span className="day-total-expense">
                      -{formatINR(group.dayTotalExpenseCents, { compactIfZeroPaise: true })}
                    </span>
                  )}
                </span>
              </div>

              {/* Grouped Inset Card */}
              <div className="inset-group-card">
                {group.entries.map((entry, idx) => {
                  const cat = categoryMap.get(entry.categoryId);
                  const isIncome = entry.kind === 'income';

                  return (
                    <div
                      key={entry.id}
                      className={`inset-row ${idx === group.entries.length - 1 ? 'last-row' : ''}`}
                      onClick={() => setEditingEntry(entry)}
                      role="button"
                      tabIndex={0}
                    >
                      {/* Left: Category dot + Note & Category + Intent */}
                      <div className="inset-row-left">
                        <span
                          className="category-dot-specular"
                          style={{ backgroundColor: cat ? cat.color : '#94a3b8' }}
                          title={cat ? cat.name : 'Category'}
                        />
                        <div className="inset-row-text">
                          <div className="row-title-line">
                            <span className="row-primary-label">
                              {entry.note || (cat ? cat.name : 'Uncategorized')}
                            </span>
                            {entry.intent && (
                              <span className={`intent-capsule intent-${entry.intent}`}>
                                {entry.intent === 'need' && <NeedIcon size={11} />}
                                {entry.intent === 'want' && <WantIcon size={11} />}
                                {entry.intent === 'impulse' && <ImpulseIcon size={11} />}
                                <span className="intent-capsule-label">
                                  {entry.intent === 'need' && 'Need'}
                                  {entry.intent === 'want' && 'Want'}
                                  {entry.intent === 'impulse' && 'Impulse'}
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="row-subtitle-line">
                            <span className="category-subtitle">{cat ? cat.name : 'General'}</span>
                            <span className="dot-sep">•</span>
                            <span className="time-subtitle">{formatTimeLabel(entry.occurredAt, entry.tz)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Subtle Hover Action Icons */}
                      <div className="inset-row-right">
                        <span className={`row-amount tabular-nums ${isIncome ? 'amount-income' : 'amount-expense'}`}>
                          {isIncome ? '+' : '-'}{formatINR(entry.amountCents)}
                        </span>

                        <div className="row-hover-actions">
                          <button
                            type="button"
                            className="row-action-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEntry(entry);
                            }}
                            title="Edit transaction"
                            aria-label="Edit transaction"
                          >
                            <EditIcon size={14} />
                          </button>
                          <button
                            type="button"
                            className="row-action-icon-btn destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              void softDeleteEntry(entry.id);
                            }}
                            title="Delete transaction"
                            aria-label="Delete transaction"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        <PlusIcon size={24} />
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
