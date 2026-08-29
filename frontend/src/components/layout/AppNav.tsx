import React from 'react';

export const TABS = [
  { id: 'goals', label: 'Goals' },
  { id: 'entries', label: 'Daily Entries' },
  { id: 'charts', label: 'Charts' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

interface AppNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const AppNav: React.FC<AppNavProps> = ({ activeTab, onTabChange }) => (
  <nav className="nav" aria-label="Main">
    <div className="container-app">
      <div className="flex space-x-8" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  </nav>
);

export default React.memo(AppNav);
