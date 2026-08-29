import React from 'react';
import { logger } from '../../lib/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback; receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Label used in the log entry to locate the failing region. */
  boundaryName?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches render/lifecycle errors so one broken pane cannot blank the app. */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error('Unhandled UI error', error, {
      boundary: this.props.boundaryName ?? 'root',
      componentStack: info.componentStack,
    });
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;
    if (fallback) return fallback(error, this.reset);

    return (
      <div className="alert alert-danger" role="alert">
        <p className="font-semibold">Something went wrong.</p>
        <p className="mt-1 text-sm">{error.message}</p>
        <button type="button" onClick={this.reset} className="btn btn-secondary mt-3">
          Try again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
