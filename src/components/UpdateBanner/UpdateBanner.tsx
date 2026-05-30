import { useEffect, useState } from 'react'
import styles from './UpdateBanner.module.css'

/**
 * Listens for the `pwa:need-refresh` custom event dispatched by main.tsx
 * from registerSW's onNeedRefresh callback. When fired, shows a small
 * banner with "Reload" and "Dismiss" buttons.
 *
 * Reload calls the global updateSW function stashed on window by main.tsx.
 */
type UpdateSW = (reloadPage?: boolean) => Promise<void> | void

export default function UpdateBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onNeedRefresh = () => setVisible(true)
    window.addEventListener('pwa:need-refresh', onNeedRefresh)
    return () => window.removeEventListener('pwa:need-refresh', onNeedRefresh)
  }, [])

  if (!visible) return null

  const handleReload = () => {
    const update = (window as unknown as { __pwaUpdateSW?: UpdateSW })
      .__pwaUpdateSW
    if (update) {
      void update(true)
    } else {
      // Fallback if the SW register call hasn't stashed its updater yet.
      window.location.reload()
    }
  }

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span>New version available</span>
      <button
        type="button"
        className={styles.reload}
        onClick={handleReload}
      >
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
