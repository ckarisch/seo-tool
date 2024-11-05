import React from 'react'
import { AlertCircle, X } from 'lucide-react'
import styles from './ConfirmDialog.module.scss'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default'
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div 
        className={styles.dialog} 
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          {variant === 'danger' && (
            <AlertCircle className={styles.icon} />
          )}
          <h3 className={styles.title}>{title}</h3>
          <button 
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>{description}</p>
        </div>

        <div className={styles.footer}>
          <button 
            className={styles.cancelButton}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button 
            className={`${styles.confirmButton} ${variant === 'danger' ? styles.danger : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}