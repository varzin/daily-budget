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
import styles from './SyncCard.module.css'

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

  const handleConnect = () => {
    const proceed = window.confirm(
      'Connect to Dropbox?\n\n' +
        'Your budget will be saved to a private "Apps/daily-budget" folder in your Dropbox. ' +
        'If both this device and your Dropbox already contain data, the newer version wins. ' +
        'Export a backup first if you want a safety copy.',
    )
    if (proceed) {
      void connectDropbox()
    }
  }

  const handleDisconnect = () => {
    if (
      window.confirm(
        'Disconnect from Dropbox? Local data stays on this device. The file in Dropbox is not deleted.',
      )
    ) {
      disconnectDropbox()
    }
  }

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
            onClick={handleConnect}
          >
            Connect Dropbox
          </button>
        </div>
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
          onClick={handleDisconnect}
        >
          Disconnect
        </button>
      </div>
      {showError && (
        <p className={styles.syncError}>{status.lastError}</p>
      )}
    </div>
  )
}
