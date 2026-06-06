import { useEffect, useState } from 'react'
import {
  getPersistStatus,
  getStorageEstimate,
  type PersistStatus,
} from '../../lib/storagePersistence'
import styles from './StorageCard.module.css'

const STATUS_LABEL: Record<PersistStatus, string> = {
  persisted: 'Protected — exempt from automatic cleanup',
  'best-effort': 'Best-effort — the browser may clear it under pressure or inactivity',
  unsupported: 'Not reportable on this browser',
}

function dotClass(status: PersistStatus): string {
  switch (status) {
    case 'persisted': return styles.dotOk ?? ''
    case 'best-effort': return styles.dotWarn ?? ''
    case 'unsupported': return ''
  }
}

function formatBytes(n: number): string {
  if (n <= 0) return '0 KB'
  const mb = n / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

export default function StorageCard() {
  const [status, setStatus] = useState<PersistStatus>('unsupported')
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null)

  useEffect(() => {
    let active = true
    void getPersistStatus().then((s) => active && setStatus(s))
    void getStorageEstimate().then((e) => active && setEstimate(e))
    return () => {
      active = false
    }
  }, [])

  const dotClassName = [styles.dot, dotClass(status)].filter(Boolean).join(' ')

  return (
    <div className={styles.card}>
      <div className={styles.statusRow}>
        <span className={dotClassName} />
        <span className={styles.statusText}>{STATUS_LABEL[status]}</span>
      </div>
      {estimate && estimate.quota > 0 && (
        <p className={styles.note}>
          Using {formatBytes(estimate.usage)} of {formatBytes(estimate.quota)} available.
        </p>
      )}
      <p className={styles.note}>
        On-device storage can still be wiped by clearing browser data or switching
        devices — keep Dropbox sync on, or export a backup, for a copy that survives.
      </p>
    </div>
  )
}
