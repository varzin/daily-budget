import { Monitor, Sun, Moon } from 'lucide-react'
import Segmented, { type SegmentedOption } from '../ui/Segmented/Segmented'
import { useThemeStore, type ThemeMode } from '../../store/themeStore'
import styles from './ThemeCard.module.css'

const OPTIONS: SegmentedOption<ThemeMode>[] = [
  { value: 'system', label: 'System', icon: <Monitor /> },
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
]

/**
 * Appearance settings: a segmented control to pick System / Light / Dark.
 * The chosen mode is persisted device-locally (see themeStore) and applied to
 * the document by useApplyTheme.
 */
export default function ThemeCard() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  return (
    <div className={styles.card}>
      <p className={styles.lead}>Choose how the app looks on this device.</p>
      <Segmented
        ariaLabel="Theme"
        value={mode}
        onChange={setMode}
        options={OPTIONS}
      />
    </div>
  )
}
