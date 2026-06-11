import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { currentMonthKey } from '../../lib/utils'
import { useMoney } from '../../lib/useMoney'
import { computeFinalize } from '../../lib/math'
import ConfirmModal from '../ui/ConfirmModal/ConfirmModal'
import SavingsTable from './SavingsTable'
import SavingsChart from './SavingsChart'
import styles from './SavingsTab.module.css'

type View = 'table' | 'chart'

export default function SavingsTab() {
  const [view, setView] = useState<View>('table')
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const bank = useBudgetStore(s => s.bank)
  const categories = useBudgetStore(s => s.categories)
  const savings = useBudgetStore(s => s.savings)
  const money = useMoney()

  const handleAddRow = () => {
    useBudgetStore.getState().addSavingsRow()
  }

  // The same formula finalizeMonth applies — shown in the dialog as a preview.
  const { oblig, prevPool, saved } = computeFinalize(bank, categories, savings)
  const month = currentMonthKey()
  const monthExists = savings.some(r => r.month === month && !r.deletedAt)

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
          onClick={() => setFinalizeOpen(true)}
        >
          Finalize month
        </button>
        <button type="button" className={styles.btn} onClick={handleAddRow}>
          <Plus size={14} strokeWidth={2.5} />
          <span>Row</span>
        </button>
      </div>

      <ConfirmModal
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        title={`Finalize ${month}?`}
        confirmLabel="Finalize"
        onConfirm={() => useBudgetStore.getState().finalizeMonth(bank)}
      >
        {monthExists && (
          <p className={styles.finalizeWarning}>
            ⚠ An entry for {month} already exists — its “Saved this month” will
            be overwritten.
          </p>
        )}
        <p>
          This records what this month left over as savings:{' '}
          <strong>current balance − fixed expenses − prior savings</strong>.
        </p>
        <p className={styles.finalizeFormula}>
          {money.symbol}{money.fmt(bank)} − {money.symbol}{money.fmt(oblig)} −{' '}
          {money.symbol}{money.fmt(prevPool)} ={' '}
          <strong>{money.symbol}{money.fmt(saved)}</strong>
        </p>
        <p>
          “Balance at end” is derived automatically as the previous row's
          balance plus this value. Tip: update <em>Current balance</em> on the
          Dashboard first if you've made any payments since.
        </p>
      </ConfirmModal>
    </section>
  )
}
