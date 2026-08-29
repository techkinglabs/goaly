import React from 'react';
import { MoonIcon, SunIcon } from '../ui/icons';

interface AppHeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ isDarkMode, onToggleDarkMode }) => (
  <header className="header">
    <div className="container-app flex items-center justify-between">
      <h1 className="text-2xl font-bold">Personal Progress Tracker</h1>
      <button
        type="button"
        onClick={onToggleDarkMode}
        className={`rounded-full p-2 transition-colors ${
          isDarkMode
            ? 'bg-blue-500/30 text-yellow-300 hover:bg-blue-500/50'
            : 'bg-white/15 text-white hover:bg-white/25'
        }`}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={isDarkMode}
      >
        {isDarkMode ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  </header>
);

export default React.memo(AppHeader);
