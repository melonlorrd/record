import React, { useRef, useState } from 'react';
import { useStore } from '../../store/storeContext';
import { syncEngine } from '../../storage/syncPlaceholder';

export const SettingsView: React.FC = () => {
  const {
    entries,
    categories,
    theme,
    toggleTheme,
    isPersistedStorage,
    exportJSON,
    importJSON,
    resetToSampleData,
    clearAllData,
    showToast,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const activeCount = entries.filter((e) => !e.deleted).length;
  const deletedCount = entries.filter((e) => e.deleted).length;

  const handleExport = () => {
    const jsonStr = exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kosh-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

  const syncStatus = syncEngine.getStatus();

  return (
    <div className="settings-view">
      <div className="section-header-row card">
        <div>
          <h2>Settings & Data Management</h2>
          <p className="text-muted">Backup, restore, and configure your offline-first data vault.</p>
        </div>
      </div>

      {/* Theme & Display */}
      <div className="settings-section card">
        <h3 className="section-subtitle">Appearance</h3>
        <div className="settings-row">
          <div>
            <div className="setting-title">Color Theme</div>
            <div className="setting-description text-muted">
              Toggle between Dark and Light mode. Currently: <b>{theme}</b>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
          </button>
        </div>
      </div>

      {/* Storage & Persistence Status */}
      <div className="settings-section card">
        <h3 className="section-subtitle">On-Device Storage Vault</h3>
        <div className="settings-row">
          <div>
            <div className="setting-title">IndexedDB Persistence</div>
            <div className="setting-description text-muted">
              {isPersistedStorage
                ? '✅ Persistent storage is active. Browser will not evict your data under disk pressure.'
                : '⚠️ Default storage quota active. Back up regularly or install to Home Screen.'}
            </div>
          </div>
          <span className="badge-pill">
            {isPersistedStorage ? 'Persistent' : 'Best-Effort'}
          </span>
        </div>

        <div className="stats-mini-summary">
          <span>Active Transactions: <b>{activeCount}</b></span>
          <span className="bullet-sep">•</span>
          <span>Soft-deleted: <b>{deletedCount}</b></span>
          <span className="bullet-sep">•</span>
          <span>Categories: <b>{categories.filter((c) => !c.deleted).length}</b></span>
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="settings-section card">
        <h3 className="section-subtitle">Backup & Restore (JSON)</h3>
        <p className="text-muted small-text">
          Export your entire financial history as a portable, Zod-validated JSON file, or restore from a previous backup.
        </p>

        {importStatus && <div className="form-error-alert">{importStatus}</div>}

        <div className="settings-actions-row">
          <button type="button" className="btn btn-primary" onClick={handleExport}>
            💾 Export JSON Backup
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
            📥 Import JSON Backup
          </button>
        </div>
      </div>

      {/* Sample Data & Reset */}
      <div className="settings-section card">
        <h3 className="section-subtitle">Sample Data & Reset</h3>
        <p className="text-muted small-text">
          Generate realistic, deterministic 4-month habit data (salaries, rents, office chai breaks, weekend outings, gadgets) for testing and exploration.
        </p>

        <div className="settings-actions-row">
          <button type="button" className="btn btn-secondary" onClick={resetToSampleData}>
            🔄 Reset to Sample Data (~4 Months)
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
            🗑️ Clear All Data
          </button>
        </div>
      </div>

      {/* Sync Interface (Marked for future) */}
      <div className="settings-section card sync-placeholder-card">
        <div className="sync-badge">PLANNED EXTENSION</div>
        <h3 className="section-subtitle">Multi-Device Cloud Sync</h3>
        <p className="text-muted small-text">
          Kosh is currently 100% offline and on-device. All records include client device IDs, UTC timestamps, and soft-delete flags, ready for zero-conflict CRDT sync with private self-hosted or cloud backends.
        </p>
        <div className="sync-status-box">
          <span>Engine Status: <b>Ready (No-op)</b></span>
          <span className="bullet-sep">•</span>
          <span>Pending sync items: <b>{syncStatus.pendingChangesCount}</b></span>
        </div>
      </div>
    </div>
  );
};
