import type { ReactNode } from 'react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import styles from './ConfirmModal.module.css'

interface ConfirmModalProps {
  open: boolean
  title: ReactNode
  /** The question / explanation body. Plain strings get the default styling. */
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** Destructive action — renders the confirm button in the danger style. */
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Themed replacement for window.confirm() (CLAUDE.md §"Замена нативных
 * диалогов"): consistent mobile look, focus trap and screen-reader semantics
 * via the shared Modal. Confirming also closes the dialog.
 */
export default function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={styles.body}>{children}</div>
    </Modal>
  )
}
