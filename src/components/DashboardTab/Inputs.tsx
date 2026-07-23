import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { computeDaysLeft } from '../../lib/math'
import { evaluateLenient, formatEvalResult, hasMathOps } from '../../lib/evalExpr'
import { formatUpdatedAgo, isStale } from '../../lib/freshness'
import { useMoney } from '../../lib/useMoney'
import { pluralDays } from '../../lib/utils'
import styles from './DashboardTab.module.css'

/** The balance as text: the stored formula if there is one, else the number. */
function bankText(bank: number, bankExpr?: string): string {
  if (bankExpr) return bankExpr
  return bank ? String(bank) : ''
}

/**
 * Current-balance input that accepts an arithmetic expression (e.g. "1200+30" —
 * a split across accounts), like the Budget/Spent fields. While focused you see
 * the whole formula, on blur the evaluated result (same as MathField). The
 * formula is persisted as `bankExpr` alongside the number, so it survives a
 * reload and syncs across devices — the point of a formula field is that it
 * stays editable. Uses the full keyboard on mobile because the decimal keypad
 * has no operators (same tradeoff as MathField, see CLAUDE.md).
 */
function BankInput() {
  const bank = useBudgetStore(s => s.bank)
  const bankExpr = useBudgetStore(s => s.bankExpr)
  const [expr, setExpr] = useState<string>(() => bankText(bank, bankExpr))
  const [focused, setFocused] = useState(false)

  // Pull in changes that didn't come from this field (sync, import): if what's
  // stored no longer matches what's typed, adopt the stored value. Our own
  // commits write back the same text, so typing is never interrupted.
  useEffect(() => {
    // Keyed on the stored value only — an in-progress invalid formula doesn't
    // commit, so this doesn't run and can't clobber what's being typed.
    const stored = bankText(bank, bankExpr)
    setExpr(cur => (cur.trim() === stored.trim() ? cur : stored))
  }, [bank, bankExpr])

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
    if (!r.ok) return
    useBudgetStore
      .getState()
      .setBank(Math.round(r.value * 100) / 100, hasMathOps(raw) ? raw.trim() : undefined)
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
