import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { showToast } from '../../store/toastStore'
import { computeBalances, savedIndicator } from '../../lib/math'
import type { SavedIndicator } from '../../lib/math'
import { live } from '../../lib/utils'
import { useMoney } from '../../lib/useMoney'
import styles from './SavingsTable.module.css'

// Tier boundaries are absolute amounts in the user's currency (see savedIndicator).
const INDICATOR_TIERS: SavedIndicator[] = ['blue', 'green', 'yellow', 'red']

const tierLabel = (tier: SavedIndicator, symbol: string): string => {
  switch (tier) {
    case 'blue':   return `${symbol}500+`
    case 'green':  return `${symbol}200+`
    case 'yellow': return `${symbol}1+`
    case 'red':    return `< ${symbol}1`
  }
}

const indClassFor = (tier: SavedIndicator): string => {
  switch (tier) {
    case 'blue':   return styles.indBlue   ?? ''
    case 'green':  return styles.indGreen  ?? ''
    case 'yellow': return styles.indYellow ?? ''
    case 'red':    return styles.indRed    ?? ''
  }
}

function IndicatorCell({ tier, symbol }: { tier: SavedIndicator; symbol: string }) {
  return (
    <span className={styles.indicatorWrap} tabIndex={0}>
      <span className={`${styles.indicator} ${indClassFor(tier)}`} />
      <span className={styles.indicatorTooltip} role="tooltip">
        {INDICATOR_TIERS.map(t => (
          <span key={t} className={styles.legendRow}>
            <span className={`${styles.indicator} ${indClassFor(t)}`} />
            {tierLabel(t, symbol)}
          </span>
        ))}
      </span>
    </span>
  )
}

export default function SavingsTable() {
  const allSavings = useBudgetStore(s => s.savings)
  const savings = useMemo(() => live(allSavings), [allSavings])
  const balances = useMemo(() => computeBalances(savings), [savings])
  const money = useMoney()

  if (savings.length === 0) {
    return (
      <table className={styles.savingsTable}>
        <thead>
          <tr>
            <th></th>
            <th>Month</th>
            <th>Saved this month</th>
            <th>Balance at end</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5} className={styles.savingsEmpty}>
              No entries yet. Add a row manually or click "Finalize month".
            </td>
          </tr>
        </tbody>
      </table>
    )
  }

  const onMonthChange = (id: string, value: string) => {
    useBudgetStore.getState().updateSavingsRow(id, { month: value })
  }
  const onSavedChange = (id: string, value: string) => {
    useBudgetStore.getState().updateSavingsRow(id, { saved: parseFloat(value) || 0 })
  }
  // Delete immediately with an Undo toast instead of a blocking confirm —
  // the delete is a tombstone, so undo simply restores the row.
  const onDelete = (id: string, month: string) => {
    useBudgetStore.getState().deleteSavingsRow(id)
    showToast({
      message: month ? `Deleted ${month}` : 'Row deleted',
      actionLabel: 'Undo',
      onAction: () => useBudgetStore.getState().restoreSavingsRow(id),
    })
  }

  return (
    <table className={styles.savingsTable}>
      <thead>
        <tr>
          <th></th>
          <th>Month</th>
          <th>Saved this month</th>
          <th>Balance at end</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {savings.map((row, i) => {
          const tier = savedIndicator(row.saved)
          const balance = balances[i] ?? 0
          return (
            <tr key={row.id}>
              <td>
                <IndicatorCell tier={tier} symbol={money.symbol} />
              </td>
              <td>
                <input
                  className={styles.savingsInput}
                  type="month"
                  value={row.month}
                  onChange={e => onMonthChange(row.id, e.target.value)}
                />
              </td>
              <td>
                <input
                  className={styles.savingsInput}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={row.saved}
                  onChange={e => onSavedChange(row.id, e.target.value)}
                />
              </td>
              <td className={styles.savingsBankCell}>{money.symbol}{money.fmt(balance)}</td>
              <td>
                <button
                  type="button"
                  className={styles.rowDel}
                  onClick={() => onDelete(row.id, row.month)}
                  aria-label="Delete row"
                >
                  <X size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
