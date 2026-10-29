import React, { useRef, useState } from 'react';
import { useStore } from '../../store/storeContext';
import { syncEngine } from '../../storage/syncPlaceholder';
import { SUPPORTED_CURRENCIES } from '../../domain/money';
import { fetchLiveExchangeRate } from '../../services/currencyApi';
import { CurrencyConversionModal } from './CurrencyConversionModal';
import {
  SunIcon,
  MoonIcon,
  AutoIcon,
  ExportIcon,
  ImportIcon,
  ResetIcon,
  TrashIcon,
} from '../common/Icons';

export const SettingsView: React.FC = () => {
  const {
    entries,
    categories,
    holdings,
    currency,
    currencySymbol,
    themeMode,
    setThemeMode,
    glassLevel,
    setGlassLevel,
    convertAllDataCurrency,
    isPersistedStorage,
    exportJSON,
    importJSON,
    resetToSampleData,
    clearAllData,
    showToast,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [pendingConversion, setPendingConversion] = useState<{
    targetCurrency: string;
    rate: number;
    provider?: string | undefined;
    lastUpdated?: string | undefined;
  } | null>(null);

  const activeCount = entries.filter((e) => !e.deleted).length;
  const deletedCount = entries.filter((e) => e.deleted).length;

  const handleExport = () => {
    const jsonStr = exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `record-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast({ message: 'Backup file exported successfully' });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importJSON(text);
      if (!res.success) {
        setImportStatus(`Import Error: ${res.message}`);
      } else {
        setImportStatus(null);
      }
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCurrencySelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const target = e.target.value;
    if (target === currency) return;

    try {
      setIsFetchingRate(true);
      const res = await fetchLiveExchangeRate(currency, target);
      setPendingConversion({
        targetCurrency: target,
        rate: res.rate,
        provider: res.provider,
        lastUpdated: res.lastUpdated,
      });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Failed to fetch live exchange rate',
      });
    } finally {
      setIsFetchingRate(false);
    }
  };

  const syncStatus = syncEngine.getStatus();

  return (
    <div className="settings-view">
      <div className="section-header-row card">
        <div>
          <h2>Settings</h2>
          <p className="text-muted">Configure appearance, materials, currency, and on-device data vault.</p>
        </div>
      </div>

      {/* Appearance & Materials */}
      <div className="settings-section card">
        <h3 className="section-subtitle">Appearance & Materials</h3>

        {/* Color Scheme Segmented Control */}
        <div className="settings-row">
          <div>
            <div className="setting-title">Appearance</div>
            <div className="setting-description text-muted">
              Choose Light, Dark (OLED near-black), or follow System preference.
            </div>
          </div>
          <div className="segmented-control" role="radiogroup" aria-label="Color Scheme">
            <button
              type="button"
              className={`segmented-btn ${themeMode === 'light' ? 'active-income' : ''}`}
              onClick={() => setThemeMode('light')}
            >
              <SunIcon size={14} /> <span>Light</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${themeMode === 'dark' ? 'active-income' : ''}`}
              onClick={() => setThemeMode('dark')}
            >
              <MoonIcon size={14} /> <span>Dark</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${themeMode === 'auto' ? 'active-income' : ''}`}
              onClick={() => setThemeMode('auto')}
            >
              <AutoIcon size={14} /> <span>Auto</span>
            </button>
          </div>
        </div>

        {/* Glass Intensity Slider */}
        <div className="settings-row glass-slider-row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="setting-title-row">
              <span className="setting-title">Glass Intensity</span>
              <span className="glass-level-badge">{Math.round(glassLevel * 100)}%</span>
            </div>
            <div className="setting-description text-muted">
              Scales material blur, transparency, and specular highlights from ultra-clear to frosted tint.
            </div>
          </div>

          <div className="glass-slider-controls">
            <span className="slider-edge-label">Clear</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={glassLevel}
              onChange={(e) => setGlassLevel(parseFloat(e.target.value))}
              className="apple-range-slider"
              aria-label="Glass Intensity Slider"
            />
            <span className="slider-edge-label">Tinted</span>
          </div>
        </div>
      </div>

      {/* Preferences & Currency */}
      <div className="settings-section card">
        <h3 className="section-subtitle">Preferences & Currency</h3>
        <div className="settings-row">
          <div>
            <div className="setting-title">Base Vault Currency</div>
            <div className="setting-description text-muted">
              Current: <b>{currency} ({currencySymbol})</b>. Switching currencies fetches live market rates and recalculates all entries & holdings.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isFetchingRate && (
              <span className="small-text text-muted" style={{ animation: 'pulse 1s infinite' }}>
                Fetching...
              </span>
            )}
            <select
              className="form-select currency-selector-dropdown"
              value={currency}
              onChange={handleCurrencySelectChange}
              disabled={isFetchingRate}
              aria-label="Select Base Currency"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol}) — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* On-Device Storage & Sync */}
      <div className="settings-section card">
        <h3 className="section-subtitle">On-Device Storage & Sync</h3>
        <div className="settings-row">
          <div>
            <div className="setting-title">IndexedDB Persistence</div>
            <div className="setting-description text-muted">
              {isPersistedStorage
                ? 'Persistent storage active. Browser will not evict your vault under disk pressure.'
                : 'Default storage quota active. Back up regularly or install to Home Screen.'}
            </div>
          </div>
          <span className="pwa-status-capsule">
            <span className="status-dot-active" />
            {isPersistedStorage ? 'Persistent' : 'Standard'}
          </span>
        </div>

        <div className="stats-mini-summary">
          <span>Active Transactions: <b>{activeCount}</b></span>
          <span className="bullet-sep">•</span>
          <span>Soft-deleted: <b>{deletedCount}</b></span>
          <span className="bullet-sep">•</span>
          <span>Categories: <b>{categories.filter((c) => !c.deleted).length}</b></span>
          <span className="bullet-sep">•</span>
          <span>Holdings: <b>{(holdings || []).filter((h) => !h.deleted).length}</b></span>
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="settings-section card">
        <h3 className="section-subtitle">Backup & Restore (JSON)</h3>
        <p className="text-muted small-text">
          Export your entire financial history as a portable, Zod-validated JSON file, or restore from a backup.
        </p>

        {importStatus && <div className="form-error-alert">{importStatus}</div>}

        <div className="settings-actions-row">
          <button type="button" className="btn btn-primary" onClick={handleExport}>
            <ExportIcon size={16} />
            <span>Export JSON Backup</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImportIcon size={16} />
            <span>Import JSON Backup</span>
          </button>
        </div>
      </div>

      {/* Sample Data & Reset */}
      <div className="settings-section card">
        <h3 className="section-subtitle">Data Maintenance</h3>
        <p className="text-muted small-text">
          Generate realistic 4-month sample ledger data (salaries, rents, office chai, routines) for testing or reset your vault.
        </p>

        <div className="settings-actions-row">
          <button type="button" className="btn btn-secondary" onClick={resetToSampleData}>
            <ResetIcon size={16} />
            <span>Reset to Sample Data</span>
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete all entries and categories? This cannot be undone unless you have a JSON backup.')) {
                void clearAllData();
              }
            }}
          >
            <TrashIcon size={16} />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>

      {/* Sync Status Info */}
      <div className="settings-section card sync-placeholder-card">
        <div className="sync-badge">PLANNED EXTENSION</div>
        <h3 className="section-subtitle">Multi-Device Cloud Sync</h3>
        <p className="text-muted small-text">
          Record is currently 100% offline and on-device. All records include client device IDs, UTC timestamps, and soft-delete flags, ready for zero-conflict CRDT sync with private self-hosted or cloud backends.
        </p>
        <div className="sync-status-box">
          <span>Engine Status: <b>Ready (No-op)</b></span>
          <span className="bullet-sep">•</span>
          <span>Pending sync items: <b>{syncStatus.pendingChangesCount}</b></span>
        </div>
      </div>

      {pendingConversion && (
        <CurrencyConversionModal
          isOpen={!!pendingConversion}
          onClose={() => setPendingConversion(null)}
          fromCurrency={currency}
          toCurrency={pendingConversion.targetCurrency}
          initialRate={pendingConversion.rate}
          provider={pendingConversion.provider}
          lastUpdated={pendingConversion.lastUpdated}
          transactionCount={entries.filter((e) => !e.deleted).length}
          holdingCount={(holdings || []).filter((h) => !h.deleted).length}
          onConfirm={async (targetCurrency, rate) => {
            await convertAllDataCurrency(targetCurrency, rate);
            setPendingConversion(null);
          }}
        />
      )}
    </div>
  );
};
