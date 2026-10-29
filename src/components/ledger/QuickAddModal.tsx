import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/storeContext';
import { EntryKind, Intent } from '../../domain/types';
import { parseINRToCents } from '../../domain/money';
import { getDefaultTimezone } from '../../domain/dates';
import { Modal } from '../common/Modal';

export interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose }) => {
  const { activeCategories, addEntry, showToast, currencySymbol } = useStore();

  const [kind, setKind] = useState<EntryKind>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [intent, setIntent] = useState<Intent | undefined>('need');
  const [note, setNote] = useState('');
  const [showDateTimeAdvanced, setShowDateTimeAdvanced] = useState(false);
  const [occurredAtInput, setOccurredAtInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const amountRef = useRef<HTMLInputElement | null>(null);

  // Initialize defaults on open
  useEffect(() => {
    if (isOpen) {
      setAmountInput('');
      setNote('');
      setError(null);
      setShowDateTimeAdvanced(false);

      const now = new Date();
      // Format to YYYY-MM-DDTHH:mm for datetime-local input
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setOccurredAtInput(localIso);

      // Default category
      if (activeCategories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(activeCategories[0]!.id);
      }

      // Autofocus amount input for <5s entry
      setTimeout(() => {
        amountRef.current?.focus();
      }, 50);
    }
  }, [isOpen, activeCategories, selectedCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cents = parseINRToCents(amountInput);
    if (cents === null || cents <= 0) {
      setError('Please enter a valid amount (e.g. 250 or 250.50)');
      amountRef.current?.focus();
      return;
    }

    if (!selectedCategoryId) {
      setError('Please select a category');
      return;
    }

    let occurredAt = Date.now();
    if (showDateTimeAdvanced && occurredAtInput) {
      const parsedDate = new Date(occurredAtInput).getTime();
      if (!Number.isNaN(parsedDate)) {
        occurredAt = parsedDate;
      }
    }

    try {
      await addEntry({
        kind,
        amountCents: cents,
        categoryId: selectedCategoryId,
        occurredAt,
        tz: getDefaultTimezone(),
        ...(kind === 'expense' && intent !== undefined ? { intent } : {}),
        note: note.trim(),
        tags: [],
      });

      showToast({ message: 'Entry added successfully' });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Add Transaction">
      <form onSubmit={handleSubmit} className="quick-add-form">
        {/* Kind Toggle (Expense vs Income) */}
        <div className="segmented-control" role="radiogroup" aria-label="Transaction Type">
          <button
            type="button"
            className={`segmented-btn ${kind === 'expense' ? 'active-expense' : ''}`}
            onClick={() => {
              setKind('expense');
              if (!intent) setIntent('need');
            }}
          >
            Expense
          </button>
          <button
            type="button"
            className={`segmented-btn ${kind === 'income' ? 'active-income' : ''}`}
            onClick={() => {
              setKind('income');
              setIntent(undefined);
            }}
          >
            Income
          </button>
        </div>

        {/* Amount Input (First & Primary focus) */}
        <div className="amount-input-group">
          <span className="currency-prefix">{currencySymbol}</span>
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="amount-input"
            autoComplete="off"
            required
          />
        </div>

        {error && <div className="form-error-alert">{error}</div>}

        {/* Category Chips Selection */}
        <div className="form-section">
          <label className="form-label">Category</label>
          <div className="category-chips-grid">
            {activeCategories.map((cat) => {
              const isSelected = cat.id === selectedCategoryId;
              return (
                <button
                  type="button"
                  key={cat.id}
                  className={`category-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  style={{
                    borderColor: isSelected ? cat.color : undefined,
                    backgroundColor: isSelected ? `${cat.color}20` : undefined,
                  }}
                >
                  <span className="chip-dot" style={{ backgroundColor: cat.color }} />
                  <span className="chip-text">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Intent Toggle (Only for Expenses) */}
        {kind === 'expense' && (
          <div className="form-section">
            <label className="form-label">Habit Intent</label>
            <div className="segmented-control intent-control">
              <button
                type="button"
                className={`segmented-btn ${intent === 'need' ? 'active-need' : ''}`}
                onClick={() => setIntent('need')}
              >
                🌱 Need
              </button>
              <button
                type="button"
                className={`segmented-btn ${intent === 'want' ? 'active-want' : ''}`}
                onClick={() => setIntent('want')}
              >
                ☕ Want
              </button>
              <button
                type="button"
                className={`segmented-btn ${intent === 'impulse' ? 'active-impulse' : ''}`}
                onClick={() => setIntent('impulse')}
              >
                ⚡ Impulse
              </button>
            </div>
          </div>
        )}

        {/* Note input */}
        <div className="form-section">
          <label className="form-label">Note / Merchant</label>
          <input
            type="text"
            className="text-input"
            placeholder="e.g. Chai, Groceries, Dinner"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Optional Date/Time override */}
        <div className="form-section">
          <button
            type="button"
            className="btn-link"
            onClick={() => setShowDateTimeAdvanced((prev) => !prev)}
          >
            {showDateTimeAdvanced ? '▼ Hide custom date & time' : '▶ Date defaults to now (tap to edit)'}
          </button>
          {showDateTimeAdvanced && (
            <div className="datetime-input-wrapper">
              <input
                type="datetime-local"
                className="datetime-input"
                value={occurredAtInput}
                onChange={(e) => setOccurredAtInput(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-save">
            Save Transaction ({currencySymbol})
          </button>
        </div>
      </form>
    </Modal>
  );
};
