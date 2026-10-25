import React from 'react';

export type TabKey = 'ledger' | 'dashboard' | 'categories' | 'settings';

export interface TabBarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'ledger', label: 'Ledger', icon: '📝' },
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'categories', label: 'Categories', icon: '🏷️' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="tab-bar-container" aria-label="Main Navigation">
      <div className="tab-bar-inner">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.key)}
              aria-selected={isActive}
              role="tab"
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
