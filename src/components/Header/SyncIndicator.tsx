import { syncNow } from '../../sync/dropbox'
import { SYNC_STATUS_LABELS, relativeTime, useSyncStatus, useTimeTick } from '../../lib/useSyncStatus'
import styles from './SyncIndicator.module.css'

export default function SyncIndicator() {
  const status = useSyncStatus()
  // Periodically refresh the "X min ago" text in the title attribute.
  useTimeTick()

  if (!status.connected) return null

  const isSpinning = status.status === 'syncing' || status.status === 'connecting'
  const isError = status.status === 'error' || status.status === 'offline'

  const className = [
    styles.indicator,
    isSpinning ? styles.spinning : '',
    isError ? styles.error : '',
  ]
    .filter(Boolean)
    .join(' ')

  const rel = status.lastSyncAt ? relativeTime(status.lastSyncAt) : ''
  const title =
    SYNC_STATUS_LABELS[status.status] + (status.lastSyncAt ? ` · ${rel}` : '')

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void syncNow()
      }}
      title={title}
      aria-label={title}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          d="M21 12a9 9 0 1 1-3.5-7.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <polyline
          points="21,3 21,9 15,9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
