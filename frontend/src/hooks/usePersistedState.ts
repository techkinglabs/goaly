import { useCallback, useEffect, useState } from 'react';
import { logger } from '../lib/logger';

/**
 * `useState` mirrored into localStorage. Safe against private-mode/quota
 * errors and non-JSON payloads: falls back to `initialValue`.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((previous: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initialValue : (JSON.parse(stored) as T);
    } catch (error) {
      logger.warn('Unable to read persisted state', { key, error });
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      logger.warn('Unable to persist state', { key, error });
    }
  }, [key, state]);

  const setValue = useCallback((value: T | ((previous: T) => T)) => {
    setState(value);
  }, []);

  return [state, setValue];
}
