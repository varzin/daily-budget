import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { showToast } from '../../store/toastStore'
import { computeBalances, savedIndicator, savedThresholds } from '../../lib/math'
import type { SavedIndicator, SavedThresholds } from '../../lib/math'
import { live } from '../../lib/utils'
import { useMoney } from '../../lib/useMoney'
import { money as moneyFor, type Money } from '../../lib/currency'
import { useDisplayBudget, useThresholdScale } from '../../lib/useDisplayBudget'
import type { SavingsRow } from '../../types'
import styles from './SavingsTable.module.css'

// Tier boundaries are absolute amounts, calibrated in EUR and scaled into the
// display currency (see savedThresholds / thresholdScale).
const INDICATOR_TIERS: SavedIndicator[] = ['blue', 'green', 'yellow', 'red']

const tierLabel = (tier: SavedIndicator, th: SavedThresholds, money: Money): string => {
  const amt = (n: number) => `${money.symbol}${money.fmtAmount(n)}`
  switch (tier) {
    case 'blue':   return `${amt(th.blue)}+`
    case 'green':  return `${amt(th.green)}+`
    case 'yellow': return `${amt(th.yellow)}+`
    case 'red':    return `< ${amt(th.yellow)}`
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

/** Signed amount with its currency symbol: "€526", "−€90", "$211.02". */
function signedMoney(n: number, m: Money): string {
  return `${n < 0 ? '−' : ''}${m.symbol}${m.fmtAmount(Math.abs(n))}`
}

/** "2026-08" → "August 2026" / "Aug 2026" in the device locale. */
function monthLabel(month: string, style: 'long' | 'short'): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return 'Set month'
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: style, year: 'numeric' })
}

function IndicatorCell({
  tier,
  thresholds,
  money,
}: {
  tier: SavedIndicator
  thresholds: SavedThresholds
  money: Money
}) {
  return (
    <span className={styles.indicatorWrap} tabIndex={0} onClick={e => e.stopPropagation()}>
      <span className={`${styles.indicator} ${indClassFor(tier)}`} />
      <span className={styles.indicatorTooltip} role="tooltip">
        {INDICATOR_TIERS.map(t => (
          <span key={t} className={styles.legendRow}>
            <span className={`${styles.indicator} ${indClassFor(t)}`} />
            {tierLabel(t, thresholds, money)}
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * The savings history. A row reads like a category row: tapping it opens
 * `onEdit` (month, amount and its currency in one modal); the month cell holds
 * the row's focusable button.
 */
export default function SavingsTable({ onEdit }: { onEdit: (row: SavingsRow) => void }) {
  const allSavings = useBudgetStore(s => s.savings)
  const savings = useMemo(() => live(allSavings), [allSavings])
  // "Balance at end" and the tiers read the rows converted into the display
  // currency; "Saved this month" stays in each row's own one.
  const display = useDisplayBudget()
  const displaySavings = useMemo(() => live(display.savings), [display.savings])
  const balances = useMemo(() => computeBalances(displaySavings), [displaySavings])
  const scale = useThresholdScale()
  const thresholds = useMemo(() => savedThresholds(scale), [scale])
  const money = useMoney()

  if (savings.length === 0) {
    return (
      <div className={styles.savingsEmpty}>
        No entries yet. Add a row manually or click “Finalize month”.
      </div>
    )
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
    <div className={styles.scroll}>
      <table className={styles.savingsTable}>
        <thead>
          <tr>
            <th><span className={styles.srOnly}>Tier</span></th>
            <th>Month</th>
            <th>
              <span className={styles.long}>Saved this month</span>
              <span className={styles.short} aria-hidden="true">Saved</span>
            </th>
            <th className={styles.balanceHead}>
              <span className={styles.long}>Balance at end</span>
              <span className={styles.short} aria-hidden="true">Balance</span>
            </th>
            <th><span className={styles.srOnly}>Delete</span></th>
          </tr>
        </thead>
        <tbody>
          {savings.map((row, i) => {
            const tier = savedIndicator(displaySavings[i]?.saved ?? row.saved, thresholds)
            const balance = balances[i] ?? 0
            return (
              <tr key={row.id} className={styles.row} onClick={() => onEdit(row)}>
                <td>
                  <IndicatorCell tier={tier} thresholds={thresholds} money={money} />
                </td>
                <td>
                  <button
                    type="button"
                    className={styles.monthBtn}
                    aria-label={`Edit ${monthLabel(row.month, 'long')}`}
                    onClick={e => {
                      e.stopPropagation()
                      onEdit(row)
                    }}
                  >
                    <span className={styles.long}>{monthLabel(row.month, 'long')}</span>
                    <span className={styles.short} aria-hidden="true">{monthLabel(row.month, 'short')}</span>
                  </button>
                </td>
                <td className={styles.savedCell} title={row.currency}>
                  {signedMoney(row.saved, moneyFor(row.currency))}
                </td>
                <td className={styles.savingsBankCell}>{money.symbol}{money.fmt(balance)}</td>
                <td className={styles.delCell}>
                  <button
                    type="button"
                    className={styles.rowDel}
                    onClick={e => {
                      e.stopPropagation()
                      onDelete(row.id, row.month)
                    }}
                    aria-label="Delete row"
                  >
                    <X size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
