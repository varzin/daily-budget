import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { PWA_NEED_REFRESH_EVENT, applyPwaUpdate } from '../../lib/pwa'
import IconButton from '../ui/IconButton/IconButton'
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
      <IconButton size="sm" label="Dismiss" onClick={() => setVisible(false)}>
        <X strokeWidth={2} aria-hidden="true" />
      </IconButton>
    </div>
  )
}
