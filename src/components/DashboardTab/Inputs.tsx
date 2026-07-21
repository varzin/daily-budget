import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { computeDaysLeft } from '../../lib/math'
import { evaluateLenient } from '../../lib/evalExpr'
import { formatUpdatedAgo, isStale } from '../../lib/freshness'
import { useMoney } from '../../lib/useMoney'
import { pluralDays } from '../../lib/utils'
import styles from './DashboardTab.module.css'

/**
 * Current-balance input that accepts an arithmetic expression (e.g. "1200+30")
 * like the Budget/Spent fields, evaluating it to the stored numeric balance.
 * We keep a local string draft so the formula survives while typing, committing
 * the evaluated value live (the store only holds a number). On blur the draft
 * collapses to the computed number. Uses the full keyboard on mobile because the
 * decimal keypad has no operators (same tradeoff as MathField, see CLAUDE.md).
 */
function BankInput() {
  const bank = useBudgetStore(s => s.bank)
  const [draft, setDraft] = useState<string>(() => (bank ? String(bank) : ''))
  const [editing, setEditing] = useState(false)

  // Reflect external changes (sync, import) when not mid-edit.
  useEffect(() => {
    if (!editing) setDraft(bank ? String(bank) : '')
  }, [bank, editing])

  const invalid = draft.trim() !== '' && !evaluateLenient(draft).ok

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDraft(raw)
    // Original `js/state.js` stored a raw number; empty input → 0. Commit the
    // evaluated value live; leave the store untouched on a mid-typing garble.
    const r = evaluateLenient(raw)
    if (r.ok) useBudgetStore.getState().setBank(r.value)
  }

  return (
    <input
      type="text"
      id="bank"
      inputMode="text"
      placeholder="0.00"
      value={draft}
      aria-invalid={invalid || undefined}
      onFocus={() => setEditing(true)}
      onChange={onChange}
      onBlur={() => {
        setEditing(false)
        // Collapse the formula to its evaluated number.
        setDraft(bank ? String(bank) : '')
      }}
    />
  )
}

export default function Inputs() {
  const incomeDay = useBudgetStore(s => s.incomeDay)
  const bankUpdatedAt = useBudgetStore(s => s.meta.bank)
  const money = useMoney()

  const day = Number(incomeDay)
  const showDaysLeft = day >= 1 && day <= 31
  const daysLeft = showDaysLeft ? computeDaysLeft(day) : 0

  const updatedLabel = formatUpdatedAgo(bankUpdatedAt)
  const stale = isStale(bankUpdatedAt)

  const onIncomeDayChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    useBudgetStore.getState().setIncomeDay(v === '' ? 0 : parseInt(v, 10) || 0)
  }

  return (
    <div className={styles.inputs}>
      <div className={styles.field}>
        <label htmlFor="bank">Current balance</label>
        <div className={styles.fieldInput}>
          <span className={styles.fieldPrefix} aria-hidden="true">{money.symbol}</span>
          <BankInput />
        </div>
        {updatedLabel && (
          <p className={`${styles.updated} ${stale ? styles.updatedStale : ''}`}>
            {updatedLabel}
            {stale && <span className={styles.updatedNudge}> · refresh your balance</span>}
          </p>
        )}
      </div>
      <div className={styles.field}>
        <label htmlFor="incomeDay">Next income day</label>
        <div className={styles.fieldInput}>
          <input
            type="number"
            id="incomeDay"
            inputMode="numeric"
            min={1}
            max={31}
            placeholder="26"
            value={incomeDay || ''}
            onChange={onIncomeDayChange}
          />
        </div>
        {showDaysLeft && (
          <p className={styles.daysLeft}>
            <span className={styles.daysLeftNum}>{daysLeft}</span>
            <span className={styles.daysLeftLabel}>
              {pluralDays(daysLeft)} left
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
