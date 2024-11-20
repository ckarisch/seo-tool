// ConfirmDialog.tsx
import React from 'react'
import { AlertCircle, X } from 'lucide-react'
import styles from './ConfirmDialog.module.scss'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string | React.ReactNode // Allow ReactNode for formatted content
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'destructive' | 'default'
  isConfirmLoading?: boolean // Add loading state for confirm button
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  isConfirmLoading = false
}: ConfirmDialogProps) {
  // Handle escape key press
  React.useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onCancel]);

  // Handle focus trap
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const confirmButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={styles.backdrop} 
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div 
        className={styles.dialog}
        onClick={e => e.stopPropagation()}
        ref={dialogRef}
      >
        <div className={styles.header}>
          {variant === 'destructive' && (
            <AlertCircle className={styles.icon} />
          )}
          <h3 className={styles.title} id="dialog-title">{title}</h3>
          <button 
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div 
            className={styles.description} 
            id="dialog-description"
          >
            {typeof description === 'string' ? (
              <p>{description}</p>
            ) : (
              description
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button 
            className={styles.cancelButton}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button 
            className={`${styles.confirmButton} ${variant === 'destructive' ? styles.destructive : ''}`}
            onClick={onConfirm}
            disabled={isConfirmLoading}
            ref={confirmButtonRef}
            type="button"
          >
            {isConfirmLoading ? 'Loading...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}