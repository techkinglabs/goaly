import React, { useCallback, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock, useEscapeKey } from '../../hooks/useEscapeKey';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { CloseIcon } from './icons';

export type ModalSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  /** Set false to require an explicit action (e.g. destructive confirms). */
  closeOnBackdropClick?: boolean;
  describedById?: string;
}

/**
 * Accessible dialog: rendered in a portal, focus-trapped, Escape to close,
 * click-outside to close, `aria-modal` + labelled by its heading.
 */
const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  describedById,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEscapeKey(open, onClose);
  useFocusTrap(panelRef, open);
  useBodyScrollLock(open);

  const handleBackdropMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Only close when the press starts on the backdrop itself, so a drag
      // that ends outside the panel does not dismiss the dialog.
      if (closeOnBackdropClick && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById}
        tabIndex={-1}
        className={`w-full ${SIZE_CLASSES[size]} max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-lg`}
      >
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 id={titleId} className="text-lg font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Close dialog"
            >
              <CloseIcon />
            </button>
          </div>

          {children}

          {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
