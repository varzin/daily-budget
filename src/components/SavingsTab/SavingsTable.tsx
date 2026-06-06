import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { computeBalances, savedIndicator } from '../../lib/math'
import type { SavedIndicator } from '../../lib/math'
import { fmt, live } from '../../lib/utils'
import styles from './SavingsTable.module.css'

const INDICATOR_TIERS: Array<{ tier: SavedIndicator; label: string }> = [
  { tier: 'blue',   label: '€500+' },
  { tier: 'green',  label: '€200+' },
  { tier: 'yellow', label: '€1+' },
  { tier: 'red',    label: '< €1' },
]

const indClassFor = (tier: SavedIndicator): string => {
  switch (tier) {
    case 'blue':   return styles.indBlue   ?? ''
    case 'green':  return styles.indGreen  ?? ''
    case 'yellow': return styles.indYellow ?? ''
    case 'red':    return styles.indRed    ?? ''
  }
}

function IndicatorCell({ tier }: { tier: SavedIndicator }) {
  return (
    <span className={styles.indicatorWrap} tabIndex={0}>
      <span className={`${styles.indicator} ${indClassFor(tier)}`} />
      <span className={styles.indicatorTooltip} role="tooltip">
        {INDICATOR_TIERS.map(t => (
          <span key={t.tier} className={styles.legendRow}>
            <span className={`${styles.indicator} ${indClassFor(t.tier)}`} />
            {t.label}
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
  const onDelete = (id: string) => {
    if (!confirm('Delete row?')) return
    useBudgetStore.getState().deleteSavingsRow(id)
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
                <IndicatorCell tier={tier} />
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
                  step="0.01"
                  value={row.saved}
                  onChange={e => onSavedChange(row.id, e.target.value)}
                />
              </td>
              <td className={styles.savingsBankCell}>€{fmt(balance)}</td>
              <td>
                <button
                  type="button"
                  className={styles.rowDel}
                  onClick={() => onDelete(row.id)}
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
