import React from 'react';
import {
  LedgerIcon,
  PortfolioIcon,
  DashboardIcon,
  SettingsIcon,
  SearchIcon,
} from '../common/Icons';

export type TabKey = 'ledger' | 'portfolio' | 'dashboard' | 'categories' | 'settings';

export interface TabBarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  isSearchActive?: boolean;
  onToggleSearch?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  currentTab,
  onSelectTab,
  isSearchActive = false,
  onToggleSearch,
}) => {
  return (
    <nav className="tab-bar-container" aria-label="Main Navigation">
      <div className="tab-bar-inner">
        <button
          type="button"
          className={`tab-btn ${currentTab === 'ledger' && !isSearchActive ? 'active' : ''}`}
          onClick={() => onSelectTab('ledger')}
          aria-selected={currentTab === 'ledger' && !isSearchActive}
          role="tab"
        >
          <span className="tab-icon"><LedgerIcon size={20} /></span>
          <span className="tab-label">Ledger</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${isSearchActive ? 'active' : ''}`}
          onClick={() => {
            if (currentTab !== 'ledger') {
              onSelectTab('ledger');
            }
            onToggleSearch?.();
          }}
          aria-selected={isSearchActive}
          role="tab"
        >
          <span className="tab-icon"><SearchIcon size={20} /></span>
          <span className="tab-label">Search</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${currentTab === 'portfolio' && !isSearchActive ? 'active' : ''}`}
          onClick={() => onSelectTab('portfolio')}
          aria-selected={currentTab === 'portfolio' && !isSearchActive}
          role="tab"
        >
          <span className="tab-icon"><PortfolioIcon size={20} /></span>
          <span className="tab-label">Portfolio</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${currentTab === 'dashboard' && !isSearchActive ? 'active' : ''}`}
          onClick={() => onSelectTab('dashboard')}
          aria-selected={currentTab === 'dashboard' && !isSearchActive}
          role="tab"
        >
          <span className="tab-icon"><DashboardIcon size={20} /></span>
          <span className="tab-label">Dashboard</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${currentTab === 'settings' && !isSearchActive ? 'active' : ''}`}
          onClick={() => onSelectTab('settings')}
          aria-selected={currentTab === 'settings' && !isSearchActive}
          role="tab"
        >
          <span className="tab-icon"><SettingsIcon size={20} /></span>
          <span className="tab-label">Settings</span>
        </button>
      </div>
    </nav>
  );
};

