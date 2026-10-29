import React, { useState } from 'react';
import { StoreProvider, useStore } from './store/storeContext';
import { TabBar, TabKey } from './components/navigation/TabBar';
import { LedgerView } from './components/ledger/LedgerView';
import { PortfolioView } from './components/portfolio/PortfolioView';
import { DashboardView } from './components/dashboard/DashboardView';
import { CategoriesView } from './components/categories/CategoriesView';
import { SettingsView } from './components/settings/SettingsView';
import { Toast } from './components/common/Toast';
import { ReloadPrompt } from './components/navigation/ReloadPrompt';
import {
  LedgerIcon,
  PortfolioIcon,
  DashboardIcon,
  CategoriesIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
} from './components/common/Icons';
import './App.css';

const navItems: { key: TabKey; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { key: 'ledger', label: 'Ledger', Icon: LedgerIcon },
  { key: 'portfolio', label: 'Portfolio', Icon: PortfolioIcon },
  { key: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { key: 'categories', label: 'Categories', Icon: CategoriesIcon },
  { key: 'settings', label: 'Settings', Icon: SettingsIcon },
];

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('ledger');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const { isLoaded, theme, toggleTheme } = useStore();

  if (!isLoaded) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <h2>Loading Record...</h2>
        <p className="text-muted">Opening on-device vault</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Desktop Sidebar (>= 1100px) */}
      <aside className="desktop-sidebar" aria-label="Desktop Sidebar Navigation">
        <div className="sidebar-header">
          <div className="brand-group">
            <span className="brand-logo">R</span>
            <div>
              <h1 className="brand-title">Record</h1>
              <span className="pwa-status-capsule">
                <span className="status-dot-active" />
                On-Device
              </span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            const Icon = item.Icon;
            return (
              <button
                type="button"
                key={item.key}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.key);
                  if (item.key !== 'ledger') setIsSearchActive(false);
                }}
              >
                <span className="nav-item-icon"><Icon size={18} /></span>
                <span className="nav-item-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="theme-circle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="app-layout">
        {/* Top Frosted Toolbar pinned across top (< 1100px or unified header) */}
        <header className="top-navbar">
          <div className="top-navbar-content">
            <div className="brand-group mobile-only">
              <span className="brand-logo">R</span>
              <div>
                <h1 className="brand-title">Record</h1>
                <span className="pwa-status-capsule">
                  <span className="status-dot-active" />
                  On-Device
                </span>
              </div>
            </div>

            {/* Mid-screen floating glass capsule tabs (700px - 1099px) */}
            <div className="tablet-nav-capsule">
              {navItems.map((item) => {
                const isActive = activeTab === item.key;
                const Icon = item.Icon;
                return (
                  <button
                    type="button"
                    key={item.key}
                    className={`capsule-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(item.key);
                      if (item.key !== 'ledger') setIsSearchActive(false);
                    }}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="top-actions">
              <button
                type="button"
                className="theme-circle-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                aria-label="Toggle color theme"
              >
                {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
              </button>
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className="main-content">
          {activeTab === 'ledger' && (
            <LedgerView
              isSearchActiveMobile={isSearchActive}
              onCloseMobileSearch={() => setIsSearchActive(false)}
            />
          )}
          {activeTab === 'portfolio' && <PortfolioView />}
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'categories' && <CategoriesView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* Mobile Bottom Tab Bar (< 700px) */}
        <TabBar
          currentTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'ledger') setIsSearchActive(false);
          }}
          isSearchActive={isSearchActive && activeTab === 'ledger'}
          onToggleSearch={() => {
            if (activeTab !== 'ledger') {
              setActiveTab('ledger');
              setIsSearchActive(true);
            } else {
              setIsSearchActive((prev) => !prev);
            }
          }}
        />

        {/* Global Toast & PWA Update Prompt */}
        <Toast />
        <ReloadPrompt />
      </div>
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
