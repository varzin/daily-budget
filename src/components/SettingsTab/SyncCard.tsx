import { useState } from 'react'
import type { SyncStatus } from '../../types'
import {
  connectDropbox,
  disconnectDropbox,
  syncNow,
} from '../../sync/dropbox'
import {
  SYNC_STATUS_LABELS,
  relativeTime,
  useSyncStatus,
  useTimeTick,
} from '../../lib/useSyncStatus'
import ConfirmModal from '../ui/ConfirmModal/ConfirmModal'
import styles from './SyncCard.module.css'

type Dialog = 'none' | 'connect' | 'disconnect'

function dotClass(status: SyncStatus): string {
  switch (status) {
    case 'connecting': return styles.dotConnecting ?? ''
    case 'syncing': return styles.dotSyncing ?? ''
    case 'synced': return styles.dotSynced ?? ''
    case 'offline': return styles.dotOffline ?? ''
    case 'error': return styles.dotError ?? ''
    case 'not_connected': return ''
  }
}

export default function SyncCard() {
  const status = useSyncStatus()
  // Periodically re-render so "X min ago" stays fresh.
  useTimeTick()
  const [dialog, setDialog] = useState<Dialog>('none')
  const closeDialog = () => setDialog('none')

  // Both confirmations share the themed dialog (no window.confirm).
  const dialogs = (
    <>
      <ConfirmModal
        open={dialog === 'connect'}
        onClose={closeDialog}
        title="Connect to Dropbox?"
        confirmLabel="Connect"
        onConfirm={() => void connectDropbox()}
      >
        <p>
          Your budget will be saved to a private{' '}
          <strong>Apps/daily-budget</strong> folder in your Dropbox.
        </p>
        <p>
          If both this device and your Dropbox already contain data, the newer
          version wins. Export a backup first if you want a safety copy.
        </p>
      </ConfirmModal>
      <ConfirmModal
        open={dialog === 'disconnect'}
        onClose={closeDialog}
        title="Disconnect from Dropbox?"
        confirmLabel="Disconnect"
        danger
        onConfirm={disconnectDropbox}
      >
        <p>
          Local data stays on this device. The file in Dropbox is not deleted.
        </p>
      </ConfirmModal>
    </>
  )

  if (!status.connected) {
    return (
      <div className={styles.card}>
        <div className={styles.disconnected}>
          <p className={styles.lead}>
            Keep your budget in sync across devices via Dropbox. Data goes to a
            private folder{' '}
            <span className="mono">Apps/daily-budget/</span> in your Dropbox —
            nothing else is accessible to the app.
          </p>
          <p className={styles.note}>
            Tip: export a backup before connecting if you have existing data on
            both this device and Dropbox — the newer one will overwrite the
            other.
          </p>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setDialog('connect')}
          >
            Connect Dropbox
          </button>
        </div>
        {dialogs}
      </div>
    )
  }

  const dotClassName = [styles.dot, dotClass(status.status)]
    .filter(Boolean)
    .join(' ')
  const showError =
    !!status.lastError &&
    (status.status === 'error' || status.status === 'offline')
  const accountLabel =
    status.account?.email || status.account?.name || '—'

  return (
    <div className={styles.card}>
      <div className={styles.statusRow}>
        <span className={dotClassName} />
        <span className={styles.statusText}>
          {SYNC_STATUS_LABELS[status.status]}
        </span>
        <span className={styles.statusTime}>
          {status.lastSyncAt ? `· ${relativeTime(status.lastSyncAt)}` : ''}
        </span>
      </div>
      <dl className={styles.meta}>
        <dt>Account</dt>
        <dd>{accountLabel}</dd>
        <dt>Folder</dt>
        <dd>
          <span className="mono">Apps/daily-budget/budget.json</span>
        </dd>
      </dl>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => {
            void syncNow()
          }}
        >
          Sync now
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnDanger}`}
          onClick={() => setDialog('disconnect')}
        >
          Disconnect
        </button>
      </div>
      {showError && (
        <p className={styles.syncError}>{status.lastError}</p>
      )}
      {dialogs}
    </div>
  )
}
