import { useRef, type ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import styles from './DataCard.module.css'

/**
 * Manual export / import card.
 * - "Export JSON" calls exportData() which triggers a download.
 * - "Import JSON" opens a hidden file picker, then hands the file to
 *   importData(file). Errors surface via window.alert (matching the
 *   coarse UX of the original prototype's `importData` flow).
 */
export default function DataCard() {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    useBudgetStore.getState().exportData()
  }

  const handleImportClick = () => {
    fileRef.current?.click()
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Always reset the input so picking the same file twice re-fires onChange.
    e.target.value = ''
    if (!file) return
    try {
      await useBudgetStore.getState().importData(file)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      window.alert(`Import failed: ${msg}`)
    }
  }

  return (
    <div className={styles.card}>
      <p className={styles.lead}>
        Manual backup — independent of cloud sync. Useful as a safety copy
        before importing or connecting.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={handleExport}>
          Export JSON
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={handleImportClick}
        >
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className={styles.hiddenInput}
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
