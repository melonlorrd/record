import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/storeContext';
import { Entry, EntryKind, Intent } from '../../domain/types';
import { parseINRToCents } from '../../domain/money';
import { Modal } from '../common/Modal';
import { NeedIcon, WantIcon, ImpulseIcon } from '../common/Icons';

export interface EditEntryModalProps {
  entry: Entry | null;
  onClose: () => void;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({ entry, onClose }) => {
  const { activeCategories, updateEntry, softDeleteEntry, showToast, currencySymbol } = useStore();

  const [kind, setKind] = useState<EntryKind>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [intent, setIntent] = useState<Intent | undefined>('need');
  const [note, setNote] = useState('');
  const [occurredAtInput, setOccurredAtInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      setKind(entry.kind);
      setAmountInput((entry.amountCents / 100).toFixed(2));
      setCategoryId(entry.categoryId);
      setIntent(entry.intent);
      setNote(entry.note);
      setError(null);

      const d = new Date(entry.occurredAt);
      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setOccurredAtInput(localIso);
    }
  }, [entry]);

  if (!entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseINRToCents(amountInput);
    if (cents === null || cents <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    let occurredAt = entry.occurredAt;
    if (occurredAtInput) {
      const parsed = new Date(occurredAtInput).getTime();
      if (!Number.isNaN(parsed)) {
        occurredAt = parsed;
      }
    }

    try {
      await updateEntry(entry.id, {
        kind,
        amountCents: cents,
        categoryId,
        intent: kind === 'expense' ? intent : undefined,
        note: note.trim(),
        occurredAt,
      });
      showToast({ message: 'Transaction updated' });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
    }
  };

  const handleDelete = async () => {
    await softDeleteEntry(entry.id);
    onClose();
  };

  return (
    <Modal isOpen={!!entry} onClose={onClose} title="Edit Transaction">
      <form onSubmit={handleSubmit} className="quick-add-form">
        <div className="segmented-control" role="radiogroup">
          <button
            type="button"
            className={`segmented-btn ${kind === 'expense' ? 'active-expense' : ''}`}
            onClick={() => setKind('expense')}
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

        <div className="amount-input-group">
          <span className="currency-prefix">{currencySymbol}</span>
          <input
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="amount-input"
            required
          />
        </div>

        {error && <div className="form-error-alert">{error}</div>}

        <div className="form-section">
          <label className="form-label">Category</label>
          <div className="category-chips-grid">
            {activeCategories.map((cat) => {
              const isSelected = cat.id === categoryId;
              return (
                <button
                  type="button"
                  key={cat.id}
                  className={`category-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => setCategoryId(cat.id)}
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

        {kind === 'expense' && (
          <div className="form-section">
            <label className="form-label">Habit Intent</label>
            <div className="segmented-control intent-control">
              <button
                type="button"
                className={`segmented-btn ${intent === 'need' ? 'active-need' : ''}`}
                onClick={() => setIntent('need')}
              >
                <NeedIcon size={14} /> <span>Need</span>
              </button>
              <button
                type="button"
                className={`segmented-btn ${intent === 'want' ? 'active-want' : ''}`}
                onClick={() => setIntent('want')}
              >
                <WantIcon size={14} /> <span>Want</span>
              </button>
              <button
                type="button"
                className={`segmented-btn ${intent === 'impulse' ? 'active-impulse' : ''}`}
                onClick={() => setIntent('impulse')}
              >
                <ImpulseIcon size={14} /> <span>Impulse</span>
              </button>
            </div>
          </div>
        )}

        <div className="form-section">
          <label className="form-label">Note / Description</label>
          <input
            type="text"
            className="text-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="form-section">
          <label className="form-label">Date & Time</label>
          <input
            type="datetime-local"
            className="datetime-input"
            value={occurredAtInput}
            onChange={(e) => setOccurredAtInput(e.target.value)}
          />
        </div>

        <div className="form-actions space-between">
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
          >
            Delete
          </button>
          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
