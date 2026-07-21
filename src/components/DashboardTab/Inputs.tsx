import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { computeDaysLeft } from '../../lib/math'
import { evaluateLenient, formatEvalResult, hasMathOps } from '../../lib/evalExpr'
import { formatUpdatedAgo, isStale } from '../../lib/freshness'
import { useMoney } from '../../lib/useMoney'
import { pluralDays } from '../../lib/utils'
import styles from './DashboardTab.module.css'

/**
 * Current-balance input that accepts an arithmetic expression (e.g. "1200+30")
 * like the Budget/Spent fields. The formula string is the source of truth: while
 * focused you see the whole formula, on blur it shows the evaluated result (same
 * as MathField). The store only holds a number, so we commit the evaluated value
 * (rounded to 2 decimals) live and pull external changes (sync/import/finalize)
 * back into the formula. Uses the full keyboard on mobile because the decimal
 * keypad has no operators (same tradeoff as MathField, see CLAUDE.md).
 */
function BankInput() {
  const bank = useBudgetStore(s => s.bank)
  const [expr, setExpr] = useState<string>(() => (bank ? String(bank) : ''))
  const [focused, setFocused] = useState(false)

  // When the stored balance changes from outside this field (sync, import,
  // finalize) the formula no longer reflects it — replace it with the number.
  // Our own live commits round-trip to the same value, so the formula is kept.
  useEffect(() => {
    const r = evaluateLenient(expr)
    const current = r.ok ? Math.round(r.value * 100) / 100 : NaN
    if (current !== bank) setExpr(bank ? String(bank) : '')
    // Intentionally only on `bank`: reacting to `expr` would clobber an
    // in-progress invalid formula (which doesn't commit) with the old number.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank])

  const result = evaluateLenient(expr)
  const invalid = expr.trim() !== '' && !result.ok
  const showResult = !focused && result.ok && hasMathOps(expr)
  const display = showResult ? formatEvalResult(result.value) : expr

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setExpr(raw)
    // Original `js/state.js` stored a raw number; empty input → 0. Commit the
    // rounded value live; leave the store untouched on a mid-typing garble.
    const r = evaluateLenient(raw)
    if (r.ok) useBudgetStore.getState().setBank(Math.round(r.value * 100) / 100)
  }

  return (
    <input
      type="text"
      id="bank"
      inputMode="text"
      placeholder="0.00"
      value={display}
      aria-invalid={invalid || undefined}
      onFocus={() => setFocused(true)}
      onChange={onChange}
      onBlur={() => setFocused(false)}
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
