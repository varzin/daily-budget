import { useEffect, useMemo, useState } from 'react'
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

/**
 * Parse a signed-decimal draft. Returns null for in-progress states that aren't
 * yet a number ("-", ".", "-.") so the store isn't clobbered mid-typing; an
 * empty field commits 0.
 */
function parseSigned(raw: string): number | null {
  const s = raw.trim()
  if (s === '') return 0
  if (s === '-' || s === '.' || s === '-.') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Money input for the savings table that accepts negative amounts (an overspend
 * month is a valid, now-possible value). A controlled `type="number"` can't hold
 * a leading "-" — the browser reports it as empty — so we keep a local string
 * draft while editing and commit parseable values to the store. Uses the full
 * keyboard on mobile because the decimal keypad has no minus key (same tradeoff
 * as MathField, see CLAUDE.md a11y notes).
 */
function SavedInput({
  value,
  onCommit,
  className,
}: {
  value: number
  onCommit: (n: number) => void
  className?: string
}) {
  const [draft, setDraft] = useState<string>(() => String(value))
  const [editing, setEditing] = useState(false)

  // Reflect external changes (e.g. Finalize overwrote this row) when not editing,
  // so the draft never fights the user mid-typing.
  useEffect(() => {
    if (!editing) setDraft(String(value))
  }, [value, editing])

  return (
    <input
      className={className}
      type="text"
      inputMode="text"
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={e => {
        const raw = e.target.value
        setDraft(raw)
        const n = parseSigned(raw)
        if (n !== null) onCommit(n)
      }}
      onBlur={() => {
        setEditing(false)
        setDraft(String(value))
      }}
    />
  )
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
  const onSavedCommit = (id: string, saved: number) => {
    useBudgetStore.getState().updateSavingsRow(id, { saved })
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
                <SavedInput
                  className={styles.savingsInput}
                  value={row.saved}
                  onCommit={n => onSavedCommit(row.id, n)}
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
