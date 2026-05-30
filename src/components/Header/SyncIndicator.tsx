import { useEffect, useState } from 'react'
import type { SyncInfo, SyncStatus } from '../../types'
import {
  syncNow,
  onSyncStatusChange,
  getSyncStatus,
} from '../../sync/dropbox'
import styles from './SyncIndicator.module.css'

/** STATUS_LABELS ported from js/app.js:118-125 */
const STATUS_LABELS: Record<SyncStatus, string> = {
  not_connected: 'Dropbox not connected',
  connecting: 'Connecting Dropbox…',
  syncing: 'Dropbox syncing…',
  synced: 'Dropbox synced',
  offline: 'Dropbox offline',
  error: 'Dropbox sync error',
}

/** relativeTime ported from js/app.js:127-139 */
export function relativeTime(ts: number | null): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

/**
 * Subscribe to sync status changes.
 * `onSyncStatusChange` in sync/dropbox.ts doesn't currently return an
 * unsubscribe function — Header lives for the app lifetime, so this leak
 * is acceptable. The local listener still receives every update.
 */
export function useSyncStatus(): SyncInfo {
  const [s, setS] = useState<SyncInfo>(getSyncStatus())
  useEffect(() => {
    onSyncStatusChange(setS)
  }, [])
  return s
}

export default function SyncIndicator() {
  const status = useSyncStatus()

  // Periodically refresh the "X min ago" text in the title attribute.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])

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
    STATUS_LABELS[status.status] + (status.lastSyncAt ? ` · ${rel}` : '')

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
