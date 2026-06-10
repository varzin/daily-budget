import { useState } from 'react'
import { ShieldAlert, Info } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { connectDropbox } from '../../sync/dropbox'
import { useSyncStatus } from '../../lib/useSyncStatus'
import { hasMeaningfulData, shouldShowBackupNudge } from '../../lib/backupNudge'
import Modal from '../ui/Modal/Modal'
import styles from './BackupNudge.module.css'

/**
 * Persistent "Protect your data" indicator (CLAUDE.md §"Надёжность хранения",
 * layer 2). Sits in the header opposite the SyncIndicator: while data lives
 * only on this device (has data, no Dropbox sync) a compact chip is shown —
 * not a one-time dismissable nudge, since the risk is ongoing. Tapping it opens
 * a modal explaining the risk with a Connect Dropbox action (and a one-time
 * JSON backup as a stopgap). It disappears once sync is connected.
 */
export default function BackupNudge() {
  const connected = useSyncStatus().connected
  const bank = useBudgetStore((s) => s.bank)
  const categories = useBudgetStore((s) => s.categories)
  const savings = useBudgetStore((s) => s.savings)
  const [open, setOpen] = useState(false)

  const hasData = hasMeaningfulData({ bank, categories, savings })
  if (!shouldShowBackupNudge({ connected, hasData })) return null

  const handleDownload = () => {
    useBudgetStore.getState().exportData()
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className={styles.chip}
        onClick={() => setOpen(true)}
        aria-label="Protect your data — learn how"
        title="Protect your data"
      >
        <ShieldAlert size={15} strokeWidth={2} aria-hidden="true" />
        <span className={styles.label}>Protect your data</span>
        <Info size={14} strokeWidth={2} aria-hidden="true" className={styles.info} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Protect your data"
        footer={
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => void connectDropbox()}
            >
              Connect Dropbox
            </button>
            <button type="button" className={styles.btn} onClick={handleDownload}>
              Download backup
            </button>
          </div>
        }
      >
        <div className={styles.modalBody}>
          <p>
            Your budget is saved only in this browser, on this device. It can be lost if
            you clear browser data, don't open the app for a while (Safari wipes unused
            sites after about 7 days), or switch phones.
          </p>
          <p>
            <strong>Connect Dropbox</strong> to keep a copy off this device and sync
            across devices — it's the only thing that survives a data wipe. You can also
            download a one-time JSON backup as a stopgap.
          </p>
        </div>
      </Modal>
    </>
  )
}
