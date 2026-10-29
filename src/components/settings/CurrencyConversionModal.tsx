import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { getCurrencyInfo } from '../../domain/money';

interface CurrencyConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromCurrency: string;
  toCurrency: string;
  initialRate: number;
  provider?: string | undefined;
  lastUpdated?: string | undefined;
  transactionCount: number;
  holdingCount: number;
  onConfirm: (targetCurrency: string, rate: number) => Promise<void>;
}

export const CurrencyConversionModal: React.FC<CurrencyConversionModalProps> = ({
  isOpen,
  onClose,
  fromCurrency,
  toCurrency,
  initialRate,
  provider,
  lastUpdated,
  transactionCount,
  holdingCount,
  onConfirm,
}) => {
  const [rate, setRate] = useState<number>(initialRate);
  const [rateInput, setRateInput] = useState<string>(initialRate.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRate(initialRate);
    setRateInput(initialRate.toString());
    setError(null);
  }, [initialRate, isOpen]);

  const fromInfo = getCurrencyInfo(fromCurrency);
  const toInfo = getCurrencyInfo(toCurrency);

  const handleRateInputChange = (val: string) => {
    setRateInput(val);
    const parsed = parseFloat(val);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setRate(parsed);
      setError(null);
    } else {
      setError('Conversion rate must be a positive number.');
    }
  };

  const handleExecute = async () => {
    if (!rate || rate <= 0) {
      setError('Please provide a valid conversion rate.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(toCurrency, rate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Currency conversion failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview conversion calculation
  const sampleFromAmount = 1000;
  const sampleToAmount = (sampleFromAmount * rate).toFixed(2);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert Database Currency">
      <div className="currency-conversion-content">
        <p className="text-muted small-text" style={{ marginBottom: '16px' }}>
          You are changing your primary currency from <b>{fromInfo.name} ({fromInfo.symbol})</b> to{' '}
          <b>{toInfo.name} ({toInfo.symbol})</b>.
        </p>

        {/* Rate Display Box */}
        <div className="currency-rate-banner">
          <div className="rate-pair">
            <span className="currency-pill">{fromInfo.code} {fromInfo.symbol}</span>
            <span className="rate-arrow">➔</span>
            <span className="currency-pill active">{toInfo.code} {toInfo.symbol}</span>
          </div>

          <div className="rate-value-row">
            <span className="text-muted">Exchange Rate:</span>
            <span className="rate-highlight font-semibold">
              1 {fromInfo.code} = {rate} {toInfo.code}
            </span>
          </div>

          {provider && (
            <div className="rate-meta text-muted small-text">
              Source: {provider} {lastUpdated ? `• ${lastUpdated.slice(0, 10)}` : ''}
            </div>
          )}
        </div>

        {/* Editable Rate Field */}
        <div className="form-group" style={{ marginTop: '14px' }}>
          <label className="form-label" htmlFor="custom-rate-input">
            Applied Conversion Rate (1 {fromInfo.code} in {toInfo.code})
          </label>
          <input
            id="custom-rate-input"
            type="number"
            step="any"
            min="0.000001"
            className="form-input"
            value={rateInput}
            onChange={(e) => handleRateInputChange(e.target.value)}
          />
        </div>

        {/* Live Calculation Preview */}
        <div className="conversion-preview-box">
          <div className="preview-label text-muted small-text">Sample calculation:</div>
          <div className="preview-calc">
            <b>{fromInfo.symbol}{sampleFromAmount.toLocaleString()}</b> {fromInfo.code} converts to{' '}
            <b>{toInfo.symbol}{parseFloat(sampleToAmount).toLocaleString()}</b> {toInfo.code}
          </div>
        </div>

        {/* Impact Warning */}
        <div className="conversion-warning-box">
          <div className="warning-title font-semibold">⚠️ Database Update Notice</div>
          <ul className="warning-list text-muted small-text">
            <li>
              <b>{transactionCount} transactions</b> will be multiplied by {rate} and rounded to the nearest minor unit (cents/cents).
            </li>
            <li>
              <b>{holdingCount} portfolio holdings</b> (average buy price and current NAV/market price) will be recalculated.
            </li>
            <li>
              Your default vault currency will be switched to <b>{toInfo.code} ({toInfo.symbol})</b>.
            </li>
          </ul>
        </div>

        {error && <div className="form-error-alert" style={{ marginTop: '12px' }}>{error}</div>}

        <div className="modal-actions-row" style={{ marginTop: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExecute}
            disabled={isSubmitting || !rate || rate <= 0}
          >
            {isSubmitting ? 'Converting...' : `Convert All Data to ${toInfo.code}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
