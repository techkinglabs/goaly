import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  notify: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 5000;

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'bg-[var(--success-bg)] text-[var(--success-text)]',
  error: 'bg-[var(--danger-bg)] text-[var(--danger-text)]',
  info: 'bg-[var(--info-bg)] text-[var(--info-text)]',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DEFAULT_DURATION)
      );
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (message: string) => notify(message, 'success'),
      error: (message: string) => notify(message, 'error'),
      info: (message: string) => notify(message, 'info'),
      dismiss,
    }),
    [notify, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
          role="region"
          aria-label="Notifications"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role={toast.variant === 'error' ? 'alert' : 'status'}
              aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
              className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-4 py-3 shadow-lg ${VARIANT_CLASSES[toast.variant]}`}
            >
              <p className="text-sm">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="opacity-70 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a <ToastProvider>');
  return context;
}
