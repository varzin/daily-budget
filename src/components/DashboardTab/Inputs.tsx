import type { ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { computeDaysLeft } from '../../lib/math'
import { formatUpdatedAgo, isStale } from '../../lib/freshness'
import { useMoney } from '../../lib/useMoney'
import { pluralDays } from '../../lib/utils'
import styles from './DashboardTab.module.css'

export default function Inputs() {
  const bank = useBudgetStore(s => s.bank)
  const incomeDay = useBudgetStore(s => s.incomeDay)
  const bankUpdatedAt = useBudgetStore(s => s.meta.bank)
  const money = useMoney()

  const day = Number(incomeDay)
  const showDaysLeft = day >= 1 && day <= 31
  const daysLeft = showDaysLeft ? computeDaysLeft(day) : 0

  const updatedLabel = formatUpdatedAgo(bankUpdatedAt)
  const stale = isStale(bankUpdatedAt)

  const onBankChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Original `js/state.js` stored a raw number; empty input → 0.
    const v = e.target.value
    useBudgetStore.getState().setBank(v === '' ? 0 : parseFloat(v) || 0)
  }

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
          <input
            type="number"
            id="bank"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={bank || ''}
            onChange={onBankChange}
          />
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
