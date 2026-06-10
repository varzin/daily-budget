import { X } from 'lucide-react'
import { useToastStore, actToast, dismissToast } from '../../../store/toastStore'
import styles from './Toasts.module.css'

/**
 * Toast viewport — fixed above the bottom nav, screen-reader friendly
 * (`role="status"` announces each toast politely). Mounted once in App.
 */
export default function Toasts() {
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null

  return (
    <div className={styles.viewport} aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={[styles.toast, t.tone === 'error' && styles.error]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.message}>{t.message}</span>
          {t.actionLabel && t.onAction && (
            <button
              type="button"
              className={styles.action}
              onClick={() => actToast(t.id)}
            >
              {t.actionLabel}
            </button>
          )}
          <button
            type="button"
            className={styles.close}
            aria-label="Dismiss notification"
            onClick={() => dismissToast(t.id)}
          >
            <X size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
