import SyncIndicator from './SyncIndicator'
import BackupNudge from './BackupNudge'
import styles from './Header.module.css'

/**
 * Top bar: brand "Daily budget" with colored dots + SyncIndicator inline, and
 * a persistent "Protect your data" chip on the right while data is unprotected.
 */
export default function Header() {
  return (
    <header className={styles.top}>
      <div className={styles.brand}>
        <span className="dot">daily</span>budget<span className="dot">.</span>
        <SyncIndicator />
      </div>
      <BackupNudge />
    </header>
  )
}
