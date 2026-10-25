import React, { useState } from 'react';
import { StoreProvider, useStore } from './store/storeContext';
import { TabBar, TabKey } from './components/navigation/TabBar';
import { LedgerView } from './components/ledger/LedgerView';
import { DashboardView } from './components/dashboard/DashboardView';
import { CategoriesView } from './components/categories/CategoriesView';
import { SettingsView } from './components/settings/SettingsView';
import { Toast } from './components/common/Toast';
import { ReloadPrompt } from './components/navigation/ReloadPrompt';
import './App.css';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('ledger');
  const { isLoaded, theme, toggleTheme } = useStore();

  if (!isLoaded) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <h2>Loading Kosh...</h2>
        <p className="text-muted">Opening on-device vault</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Top Application Bar */}
      <header className="top-navbar">
        <div className="top-navbar-content">
          <div className="brand-group">
            <span className="brand-logo">₹</span>
            <div>
              <h1 className="brand-title">Kosh</h1>
              <span className="brand-badge">Offline PWA</span>
            </div>
          </div>

          <div className="top-actions">
            {/* Desktop Navigation Links */}
            <div className="desktop-nav-links">
              <button
                type="button"
                className={`desktop-nav-btn ${activeTab === 'ledger' ? 'active' : ''}`}
                onClick={() => setActiveTab('ledger')}
              >
                📝 Ledger
              </button>
              <button
                type="button"
                className={`desktop-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                📊 Dashboard
              </button>
              <button
                type="button"
                className={`desktop-nav-btn ${activeTab === 'categories' ? 'active' : ''}`}
                onClick={() => setActiveTab('categories')}
              >
                🏷️ Categories
              </button>
              <button
                type="button"
                className={`desktop-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                ⚙️ Settings
              </button>
            </div>

            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="main-content">
        {activeTab === 'ledger' && <LedgerView />}
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'categories' && <CategoriesView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <TabBar currentTab={activeTab} onSelectTab={setActiveTab} />

      {/* Global Toast & PWA Update Prompt */}
      <Toast />
      <ReloadPrompt />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
};

export default App;
