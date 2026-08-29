import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

/** Full-pane loading indicator. */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading…',
  className = '',
}) => (
  <div className={`py-8 text-center ${className}`} role="status" aria-live="polite">
    <div className="inline-block h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-600" />
    <p className="mt-2 text-[var(--text-muted)]">{message}</p>
  </div>
);

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/** Inline, dismissible error banner. */
export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, onDismiss }) => (
  <div className="alert alert-danger" role="alert">
    <p>{message}</p>
    <div className="mt-2 flex gap-3 text-sm">
      {onRetry ? (
        <button type="button" onClick={onRetry} className="underline">
          Retry
        </button>
      ) : null}
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="underline">
          Dismiss
        </button>
      ) : null}
    </div>
  </div>
);
