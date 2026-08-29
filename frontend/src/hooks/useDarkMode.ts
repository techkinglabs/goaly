import { useCallback, useEffect } from 'react';
import { usePersistedState } from './usePersistedState';

const STORAGE_KEY = 'goaly:dark-mode';

/**
 * Dark-mode state, persisted to localStorage and synced to the
 * `<html class="dark">` toggle that Tailwind + the CSS variables rely on.
 * Defaults to the OS preference on first visit.
 */
export function useDarkMode(): { isDarkMode: boolean; toggleDarkMode: () => void } {
  const prefersDark =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true;

  const [isDarkMode, setIsDarkMode] = usePersistedState<boolean>(STORAGE_KEY, prefersDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((previous) => !previous);
  }, [setIsDarkMode]);

  return { isDarkMode, toggleDarkMode };
}
