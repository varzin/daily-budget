import { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { fmt, currentMonthKey } from '../../lib/utils'
import { obligatoryTotal, currentSavingsTotal } from '../../lib/math'
import SavingsTable from './SavingsTable'
import SavingsChart from './SavingsChart'
import styles from './SavingsTab.module.css'

type View = 'table' | 'chart'

export default function SavingsTab() {
  const [view, setView] = useState<View>('table')
  const bank = useBudgetStore(s => s.bank)
  const categories = useBudgetStore(s => s.categories)
  const savings = useBudgetStore(s => s.savings)

  const handleAddRow = () => {
    useBudgetStore.getState().addSavingsRow()
  }

  const handleFinalize = () => {
    const oblig = obligatoryTotal(categories)
    const prevPool = currentSavingsTotal(savings)
    const saved = Math.round((bank - oblig - prevPool) * 100) / 100
    const month = currentMonthKey()

    const existingIdx = savings.findIndex(r => r.month === month)
    const existingNote = existingIdx >= 0
      ? `\n⚠ An entry for ${month} already exists — its "Saved this month" will be overwritten.\n`
      : ''

    const message =
      `Finalize ${month}?\n` +
      existingNote +
      `\nThis will add a new row to the Savings table with:\n\n` +
      `  • Saved this month = current balance − fixed expenses − prior savings\n` +
      `      €${fmt(bank)} − €${fmt(oblig)} − €${fmt(prevPool)} = €${fmt(saved)}\n\n` +
      `  • Balance at end is auto-derived as previous row's balance + this value.\n\n` +
      `Tip: update "Current balance" on the Dashboard first if you've made any payments since.`

    if (!confirm(message)) return
    useBudgetStore.getState().finalizeMonth(bank)
  }

  return (
    <section
      className={styles.section}
      role="tabpanel"
      aria-label="Savings"
      tabIndex={0}
    >
      <div className={styles.sectionHead}>
        <h2>Savings</h2>
      </div>

      <div className={styles.chartToggle}>
        <button
          type="button"
          className={view === 'table' ? styles.active : ''}
          onClick={() => setView('table')}
        >
          Table
        </button>
        <button
          type="button"
          className={view === 'chart' ? styles.active : ''}
          onClick={() => setView('chart')}
        >
          Chart
        </button>
      </div>

      {view === 'table' ? <SavingsTable /> : <SavingsChart />}

      <div className={`${styles.savingsActions} ${styles.savingsActionsBottom}`}>
        <button type="button" className={styles.btn} onClick={handleAddRow}>+ Row</button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleFinalize}
        >
          Finalize month
        </button>
      </div>
    </section>
  )
}
