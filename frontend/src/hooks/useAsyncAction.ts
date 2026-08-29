import { useCallback } from 'react';
import { useToast } from '../components/ui/ToastProvider';
import { getErrorMessage } from '../lib/http';
import { logger } from '../lib/logger';

interface RunOptions {
  /** Shown as a toast on success. Omit for silent success. */
  successMessage?: string;
  /** Prefix for the error toast, e.g. 'Failed to create goal'. */
  errorMessage: string;
  /** Used for log correlation. */
  context?: Record<string, unknown>;
}

/**
 * Wraps an async action with uniform error handling: logs via the logger and
 * surfaces a toast. Replaces the ~8 copy-pasted try/catch blocks that each did
 * `console.error(...)` + `setError('Failed to …')`.
 *
 * Returns `true` on success, `false` on failure, so callers can decide whether
 * to close a modal or keep it open.
 */
export function useAsyncAction() {
  const toast = useToast();

  return useCallback(
    async <T>(action: () => Promise<T>, options: RunOptions): Promise<T | undefined> => {
      try {
        const result = await action();
        if (options.successMessage) toast.success(options.successMessage);
        return result;
      } catch (error) {
        logger.error(options.errorMessage, error, options.context);
        toast.error(`${options.errorMessage}: ${getErrorMessage(error)}`);
        return undefined;
      }
    },
    [toast]
  );
}
