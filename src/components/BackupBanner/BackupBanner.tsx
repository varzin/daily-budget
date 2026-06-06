import { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { connectDropbox } from '../../sync/dropbox'
import { useSyncStatus } from '../Header/SyncIndicator'
import { hasMeaningfulData, shouldNudgeBackup } from '../../lib/backupNudge'
import styles from './BackupBanner.module.css'

/**
 * Soft, one-time nudge to keep a copy off this device (CLAUDE.md §"Надёжность
 * хранения", layer 2). Persistent storage still dies on "clear data" or a new
 * phone, so we prompt users who have data but no Dropbox sync to connect it or
 * download a JSON backup — once, until they act or dismiss.
 */
const DISMISS_KEY = 'budget_backup_nudge_dismissed_v1'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export default function BackupBanner() {
  const connected = useSyncStatus().connected
  const bank = useBudgetStore((s) => s.bank)
  const categories = useBudgetStore((s) => s.categories)
  const savings = useBudgetStore((s) => s.savings)
  const [dismissed, setDismissed] = useState(readDismissed)

  const hasData = hasMeaningfulData({ bank, categories, savings })
  if (!shouldNudgeBackup({ connected, hasData, dismissed })) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore — worst case we nudge again next session
    }
    setDismissed(true)
  }

  const handleDownload = () => {
    useBudgetStore.getState().exportData()
    dismiss() // they now have an off-device copy
  }

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.text}>
        Your budget lives only on this device — keep a copy somewhere safe.
      </span>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => void connectDropbox()}>
          Connect Dropbox
        </button>
        <button type="button" className={styles.secondary} onClick={handleDownload}>
          Download backup
        </button>
      </div>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
