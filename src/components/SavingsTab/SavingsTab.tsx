import { useState } from 'react'
import { Plus, Table2, ChartLine } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { useUiPrefsStore, type SavingsView } from '../../store/uiPrefsStore'
import { currentMonthKey } from '../../lib/utils'
import { useMoney } from '../../lib/useMoney'
import { useDisplayBudget } from '../../lib/useDisplayBudget'
import { computeFinalizeIn } from '../../lib/convert'
import Button from '../ui/Button/Button'
import ConfirmModal from '../ui/ConfirmModal/ConfirmModal'
import Segmented, { type SegmentedOption } from '../ui/Segmented/Segmented'
import Toggle from '../ui/Toggle/Toggle'
import SavingsTable from './SavingsTable'
import SavingsChart from './SavingsChart'
import styles from './SavingsTab.module.css'

const VIEW_OPTIONS: SegmentedOption<SavingsView>[] = [
  { value: 'table', label: 'Table view', icon: <Table2 strokeWidth={2} /> },
  { value: 'chart', label: 'Chart view', icon: <ChartLine strokeWidth={2} /> },
]

export default function SavingsTab() {
  const view = useUiPrefsStore(s => s.savingsView)
  const setView = useUiPrefsStore(s => s.setSavingsView)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  // The reset-spent choice is a synced preference (follows the user across
  // devices), pre-filled here and editable in the dialog.
  const resetSpent = useBudgetStore(s => s.resetSpentOnFinalize)
  const setResetSpent = useBudgetStore(s => s.setResetSpentOnFinalize)
  const savings = useBudgetStore(s => s.savings)
  const rates = useBudgetStore(s => s.rates)
  // Finalize works in the display currency on the total of all accounts.
  const display = useDisplayBudget()
  const bank = display.bank
  const money = useMoney()

  const handleAddRow = () => {
    useBudgetStore.getState().addSavingsRow()
  }

  // The same formula finalizeMonth applies — shown in the dialog as a preview.
  const month = currentMonthKey()
  const { prevPool, saved } = computeFinalizeIn(bank, display.currency, savings, rates, month)
  const monthExists = savings.some(r => r.month === month && !r.deletedAt)

  return (
    <section
      className={styles.section}
      id="tab-savings"
      role="tabpanel"
      aria-labelledby="tab-btn-savings"
      tabIndex={0}
    >
      <div className={styles.sectionHead}>
        <h2>Savings</h2>
        <Segmented
          iconOnly
          ariaLabel="View"
          value={view}
          onChange={setView}
          options={VIEW_OPTIONS}
        />
      </div>

      {view === 'table' ? <SavingsTable /> : <SavingsChart />}

      <div className={`${styles.savingsActions} ${styles.savingsActionsBottom}`}>
        <Button variant="primary" onClick={() => setFinalizeOpen(true)}>
          Finalize month
        </Button>
        <Button onClick={handleAddRow}>
          <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
          <span>Add row</span>
        </Button>
      </div>

      <ConfirmModal
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        title={`Finalize ${month}?`}
        confirmLabel="Finalize"
        onConfirm={() =>
          useBudgetStore.getState().finalizeMonth(bank, { resetSpent })
        }
      >
        {monthExists && (
          <p className={styles.finalizeWarning}>
            ⚠ An entry for {month} already exists — its “Saved this month” will
            be overwritten.
          </p>
        )}
        <p>
          This records what this month left over as savings:{' '}
          <strong>current balance − prior savings</strong>.
        </p>
        <p className={styles.finalizeFormula}>
          {money.symbol}{money.fmt(bank)} − {money.symbol}{money.fmt(prevPool)} ={' '}
          <strong>{money.symbol}{money.fmt(saved)}</strong>
        </p>
        <p>
          “Balance at end” is derived automatically as the previous row's
          balance plus this value. Tip: update <em>Current balance</em> on the
          Dashboard first if you've made any payments since.
        </p>
        <div className={styles.resetOption}>
          <Toggle
            checked={resetSpent}
            onChange={setResetSpent}
            label="Reset spent for fixed expenses"
            description="Clears the Spent value of every fixed-expense category, so the new month starts fresh. Budgets are kept."
          />
        </div>
      </ConfirmModal>
    </section>
  )
}
