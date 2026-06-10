import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { currentMonthKey } from '../../lib/utils'
import { useMoney } from '../../lib/useMoney'
import { computeFinalize } from '../../lib/math'
import SavingsTable from './SavingsTable'
import SavingsChart from './SavingsChart'
import styles from './SavingsTab.module.css'

type View = 'table' | 'chart'

export default function SavingsTab() {
  const [view, setView] = useState<View>('table')
  const bank = useBudgetStore(s => s.bank)
  const categories = useBudgetStore(s => s.categories)
  const savings = useBudgetStore(s => s.savings)
  const money = useMoney()

  const handleAddRow = () => {
    useBudgetStore.getState().addSavingsRow()
  }

  const handleFinalize = () => {
    // The same formula finalizeMonth applies — shown here as a preview.
    const { oblig, prevPool, saved } = computeFinalize(bank, categories, savings)
    const month = currentMonthKey()

    const existingIdx = savings.findIndex(r => r.month === month && !r.deletedAt)
    const existingNote = existingIdx >= 0
      ? `\n⚠ An entry for ${month} already exists — its "Saved this month" will be overwritten.\n`
      : ''

    const message =
      `Finalize ${month}?\n` +
      existingNote +
      `\nThis will add a new row to the Savings table with:\n\n` +
      `  • Saved this month = current balance − fixed expenses − prior savings\n` +
      `      ${money.symbol}${money.fmt(bank)} − ${money.symbol}${money.fmt(oblig)} − ${money.symbol}${money.fmt(prevPool)} = ${money.symbol}${money.fmt(saved)}\n\n` +
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
        <div className={styles.chartToggle} role="tablist" aria-label="View">
          <button
            type="button"
            className={view === 'table' ? styles.active : ''}
            onClick={() => setView('table')}
            aria-label="Table view"
            aria-pressed={view === 'table'}
            title="Table"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v18" />
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
          </button>
          <button
            type="button"
            className={view === 'chart' ? styles.active : ''}
            onClick={() => setView('chart')}
            aria-label="Chart view"
            aria-pressed={view === 'chart'}
            title="Chart"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </button>
        </div>
      </div>

      {view === 'table' ? <SavingsTable /> : <SavingsChart />}

      <div className={`${styles.savingsActions} ${styles.savingsActionsBottom}`}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleFinalize}
        >
          Finalize month
        </button>
        <button type="button" className={styles.btn} onClick={handleAddRow}>
          <Plus size={14} strokeWidth={2.5} />
          <span>Row</span>
        </button>
      </div>
    </section>
  )
}
