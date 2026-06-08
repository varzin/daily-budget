import BufferCard from './BufferCard'
import ThemeCard from './ThemeCard'
import SyncCard from './SyncCard'
import StorageCard from './StorageCard'
import DataCard from './DataCard'
import styles from './SettingsTab.module.css'

/**
 * Settings tab. Blocks: Budget (green-zone cushion), Theme (appearance), Sync
 * (Dropbox), Storage (on-device durability) and Data (manual import/export).
 * Mirrors the markup of #tab-settings in the original index.html.
 */
export default function SettingsTab() {
  return (
    <section
      className={styles.section}
      id="tab-settings"
      role="tabpanel"
      aria-labelledby="tab-btn-settings"
      tabIndex={0}
    >
      <div className={styles.block}>
        <div className={styles.blockHead}>
          <h2>Budget</h2>
        </div>
        <BufferCard />
      </div>

      <div className={styles.block}>
        <div className={styles.blockHead}>
          <h2>Theme</h2>
        </div>
        <ThemeCard />
      </div>

      <div className={styles.block}>
        <div className={styles.blockHead}>
          <h2>Sync</h2>
        </div>
        <SyncCard />
      </div>

      <div className={styles.block}>
        <div className={styles.blockHead}>
          <h2>Storage</h2>
        </div>
        <StorageCard />
      </div>

      <div className={styles.block}>
        <div className={styles.blockHead}>
          <h2>Data</h2>
        </div>
        <DataCard />
      </div>
    </section>
  )
}
