import { useEffect, useState } from 'react'
import { PWA_NEED_REFRESH_EVENT, applyPwaUpdate } from '../../lib/pwa'
import styles from './UpdateBanner.module.css'

/**
 * Listens for the PWA "need refresh" event dispatched by main.tsx from
 * registerSW's onNeedRefresh callback. When fired, shows a small banner
 * with "Reload" and "Dismiss" buttons.
 */
export default function UpdateBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onNeedRefresh = () => setVisible(true)
    window.addEventListener(PWA_NEED_REFRESH_EVENT, onNeedRefresh)
    return () => window.removeEventListener(PWA_NEED_REFRESH_EVENT, onNeedRefresh)
  }, [])

  if (!visible) return null

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span>New version available</span>
      <button type="button" className={styles.reload} onClick={applyPwaUpdate}>
        Reload
      </button>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
