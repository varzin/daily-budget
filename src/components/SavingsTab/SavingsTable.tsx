import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { showToast } from '../../store/toastStore'
import { computeBalances, savedIndicator, savedThresholds } from '../../lib/math'
import type { SavedIndicator, SavedThresholds } from '../../lib/math'
import { live } from '../../lib/utils'
import { useMoney } from '../../lib/useMoney'
import { money as moneyFor, type Money } from '../../lib/currency'
import { useDisplayBudget, useThresholdScale } from '../../lib/useDisplayBudget'
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
  ariaLabel,
}: {
  value: number
  onCommit: (n: number) => void
  className?: string
  ariaLabel?: string
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
      aria-label={ariaLabel}
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

/** "2026-08" → "Aug 2026" in the device locale (the compact mobile label). */
function shortMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return 'Set month'
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

/**
 * Native month picker. On narrow screens the native control (wide, with its
 * own calendar icon) is laid invisibly over a compact "Aug 2026" label, so a
 * tap still opens the system picker but the column stays narrow.
 */
function MonthInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className={styles.month}>
      <span className={styles.monthText} aria-hidden="true">{shortMonth(value)}</span>
      <input
        className={`${styles.savingsInput} ${styles.monthInput}`}
        type="month"
        aria-label="Month"
        value={value}
        onChange={e => onChange(e.target.value)}
        onClick={e => {
          // Desktop Chrome edits month segments in place; when the field is
          // the invisible overlay, open the picker instead.
          try {
            if (getComputedStyle(e.currentTarget).opacity === '0') e.currentTarget.showPicker()
          } catch {
            /* showPicker unsupported — the native tap behaviour applies */
          }
        }}
      />
    </span>
  )
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
    <span className={styles.indicatorWrap} tabIndex={0}>
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

export default function SavingsTable() {
  const allSavings = useBudgetStore(s => s.savings)
  const savings = useMemo(() => live(allSavings), [allSavings])
  // "Balance at end" and the tiers read the rows converted into the display
  // currency; the editable "Saved this month" stays in each row's own one.
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
            const foreign = row.currency !== money.code
            return (
              <tr key={row.id}>
                <td>
                  <IndicatorCell tier={tier} thresholds={thresholds} money={money} />
                </td>
                <td>
                  <MonthInput value={row.month} onChange={v => onMonthChange(row.id, v)} />
                </td>
                <td className={styles.savedCell}>
                  {foreign && (
                    <span className={styles.rowCurrency} title={row.currency}>
                      {moneyFor(row.currency).symbol}
                    </span>
                  )}
                  <SavedInput
                    className={`${styles.savingsInput} ${styles.savedInput}`}
                    ariaLabel="Saved this month"
                    value={row.saved}
                    onCommit={n => onSavedCommit(row.id, n)}
                  />
                </td>
                <td className={styles.savingsBankCell}>{money.symbol}{money.fmt(balance)}</td>
                <td className={styles.delCell}>
                  <button
                    type="button"
                    className={styles.rowDel}
                    onClick={() => onDelete(row.id, row.month)}
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
