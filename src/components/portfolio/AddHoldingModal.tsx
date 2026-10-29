import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/storeContext';
import { AssetClass, PortfolioHolding } from '../../domain/types';
import { formatINR, parseINRToCents } from '../../domain/money';
import { Modal } from '../common/Modal';

export interface AddHoldingModalProps {
  isOpen: boolean;
  editingHolding: PortfolioHolding | null;
  onClose: () => void;
}

export const AddHoldingModal: React.FC<AddHoldingModalProps> = ({
  isOpen,
  editingHolding,
  onClose,
}) => {
  const { addHolding, updateHolding, softDeleteHolding, showToast, currencySymbol } = useStore();

  const [assetClass, setAssetClass] = useState<AssetClass>('mutual_fund');
  const [name, setName] = useState('');
  const [symbolOrFolio, setSymbolOrFolio] = useState('');
  const [unitsInput, setUnitsInput] = useState('');
  const [buyPriceInput, setBuyPriceInput] = useState('');
  const [currentPriceInput, setCurrentPriceInput] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingHolding) {
        setAssetClass(editingHolding.assetClass);
        setName(editingHolding.name);
        setSymbolOrFolio(editingHolding.symbolOrFolio);
        setUnitsInput(String(editingHolding.units));
        setBuyPriceInput((editingHolding.buyAvgPriceCents / 100).toFixed(2));
        setCurrentPriceInput((editingHolding.currentNavOrPriceCents / 100).toFixed(2));
        setNotes(editingHolding.notes);
      } else {
        setAssetClass('mutual_fund');
        setName('');
        setSymbolOrFolio('');
        setUnitsInput('');
        setBuyPriceInput('');
        setCurrentPriceInput('');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, editingHolding]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide an asset or fund name');
      return;
    }

    const units = parseFloat(unitsInput);
    if (Number.isNaN(units) || units <= 0) {
      setError('Please provide valid units (e.g. 10 or 150.25)');
      return;
    }

    const buyPriceCents = parseINRToCents(buyPriceInput);
    if (buyPriceCents === null || buyPriceCents <= 0) {
      setError('Please provide a valid average buy price (e.g. 150.00)');
      return;
    }

    const currentPriceCents = parseINRToCents(currentPriceInput || buyPriceInput);
    if (currentPriceCents === null || currentPriceCents <= 0) {
      setError('Please provide a valid current price or NAV');
      return;
    }

    try {
      if (editingHolding) {
        await updateHolding(editingHolding.id, {
          assetClass,
          name: name.trim(),
          symbolOrFolio: symbolOrFolio.trim(),
          units,
          buyAvgPriceCents: buyPriceCents,
          currentNavOrPriceCents: currentPriceCents,
          notes: notes.trim(),
        });
        showToast({ message: `Updated "${name.trim()}"` });
      } else {
        await addHolding({
          assetClass,
          name: name.trim(),
          symbolOrFolio: symbolOrFolio.trim(),
          units,
          buyAvgPriceCents: buyPriceCents,
          currentNavOrPriceCents: currentPriceCents,
          notes: notes.trim(),
        });
        showToast({ message: `Added "${name.trim()}" to portfolio` });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save holding');
    }
  };

  const handleDelete = async () => {
    if (!editingHolding) return;
    await softDeleteHolding(editingHolding.id);
    showToast({ message: `Removed "${editingHolding.name}"` });
    onClose();
  };

  // Preview computations
  const parsedUnits = parseFloat(unitsInput) || 0;
  const parsedBuyCents = parseINRToCents(buyPriceInput) || 0;
  const parsedCurCents = parseINRToCents(currentPriceInput) || parsedBuyCents;
  const previewInvested = Math.round(parsedUnits * parsedBuyCents);
  const previewCurrent = Math.round(parsedUnits * parsedCurCents);
  const previewGain = previewCurrent - previewInvested;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingHolding ? 'Edit Portfolio Holding' : 'Add Investment Holding'}
    >
      <form onSubmit={handleSubmit} className="quick-add-form">
        {/* Asset Class Selector */}
        <div className="form-section">
          <label className="form-label">Asset Class</label>
          <div className="segmented-control" role="radiogroup">
            <button
              type="button"
              className={`segmented-btn ${assetClass === 'mutual_fund' ? 'active-expense' : ''}`}
              onClick={() => setAssetClass('mutual_fund')}
            >
              📊 Mutual Fund
            </button>
            <button
              type="button"
              className={`segmented-btn ${assetClass === 'equity' ? 'active-income' : ''}`}
              onClick={() => setAssetClass('equity')}
            >
              📈 Equity / Stock
            </button>
            <button
              type="button"
              className={`segmented-btn ${assetClass === 'gold' ? 'active-want' : ''}`}
              onClick={() => setAssetClass('gold')}
            >
              🥇 Physical Gold
            </button>
          </div>
        </div>

        {error && <div className="form-error-alert">{error}</div>}

        {/* Name Input */}
        <div className="form-section">
          <label className="form-label">Holding / Fund Name</label>
          <input
            type="text"
            className="text-input"
            placeholder={
              assetClass === 'mutual_fund'
                ? 'e.g. Parag Parikh Flexi Cap Fund'
                : assetClass === 'equity'
                ? 'e.g. HDFC Bank Ltd'
                : 'e.g. 24K Minted Gold Coins (999 Purity)'
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Symbol / Folio */}
        <div className="form-section">
          <label className="form-label">Ticker Symbol or Folio (Optional)</label>
          <input
            type="text"
            className="text-input"
            placeholder={
              assetClass === 'equity'
                ? 'e.g. HDFCBANK'
                : assetClass === 'mutual_fund'
                ? 'e.g. PPFCF-DIR'
                : 'e.g. PHYSICAL_GOLD_24K'
            }
            value={symbolOrFolio}
            onChange={(e) => setSymbolOrFolio(e.target.value)}
          />
        </div>

        {/* Units & Pricing Grid */}
        <div className="filter-dropdowns-row">
          <div className="form-section">
            <label className="form-label">
              Units / Quantity {assetClass === 'gold' ? '(Grams)' : ''}
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="text-input"
              placeholder="e.g. 10.5"
              value={unitsInput}
              onChange={(e) => setUnitsInput(e.target.value)}
              required
            />
          </div>

          <div className="form-section">
            <label className="form-label">Average Buy Price ({currencySymbol})</label>
            <input
              type="text"
              inputMode="decimal"
              className="text-input"
              placeholder="e.g. 1500.00"
              value={buyPriceInput}
              onChange={(e) => setBuyPriceInput(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Current NAV / Market Price */}
        <div className="form-section">
          <label className="form-label">Current NAV / Market Price ({currencySymbol})</label>
          <input
            type="text"
            inputMode="decimal"
            className="text-input"
            placeholder="e.g. 1680.00 (defaults to buy price if empty)"
            value={currentPriceInput}
            onChange={(e) => setCurrentPriceInput(e.target.value)}
          />
        </div>

        {/* Live Computation Preview Box */}
        {previewInvested > 0 && (
          <div className="portfolio-preview-box">
            <div className="preview-stat">
              <span className="text-muted small-text">Invested:</span>
              <span className="font-semibold">{formatINR(previewInvested)}</span>
            </div>
            <div className="preview-stat">
              <span className="text-muted small-text">Current Value:</span>
              <span className="font-semibold">{formatINR(previewCurrent)}</span>
            </div>
            <div className="preview-stat">
              <span className="text-muted small-text">Unrealized P&L:</span>
              <span className={`font-semibold ${previewGain >= 0 ? 'income-text' : 'expense-text'}`}>
                {previewGain >= 0 ? '+' : ''}{formatINR(previewGain)}
              </span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="form-section">
          <label className="form-label">Notes</label>
          <input
            type="text"
            className="text-input"
            placeholder="e.g. SIP through Zerodha Coin, long-term horizon"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="form-actions space-between">
          {editingHolding ? (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Delete Holding
            </button>
          ) : <div />}

          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingHolding ? 'Save Changes' : 'Add to Portfolio'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
