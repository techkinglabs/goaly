import React from 'react';
import Modal from './Modal';
import { SpinnerIcon } from './icons';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible replacement for `window.confirm()`. */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    open={open}
    title={title}
    onClose={busy ? () => undefined : onCancel}
    size="sm"
    closeOnBackdropClick={!busy}
    footer={
      <>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={destructive ? 'btn btn-danger' : 'btn btn-primary'}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <SpinnerIcon className="h-4 w-4" />
              Working…
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      </>
    }
  >
    <p className="text-[var(--text-secondary)]">{message}</p>
  </Modal>
);

export default ConfirmModal;
