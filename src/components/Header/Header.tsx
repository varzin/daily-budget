import SyncIndicator from './SyncIndicator'
import styles from './Header.module.css'

/**
 * Top bar: brand "Daily budget" with colored dots + SyncIndicator on the right.
 * Original markup (index.html):
 *   <header class="top">
 *     <div class="brand">
 *       <span class="dot">daily</span>budget<span class="dot">.</span>
 *       <button class="sync-indicator">…</button>
 *     </div>
 *   </header>
 */
export default function Header() {
  return (
    <header className={styles.top}>
      <div className={styles.brand}>
        <span className="dot">daily</span>budget<span className="dot">.</span>
        <SyncIndicator />
      </div>
    </header>
  )
}
