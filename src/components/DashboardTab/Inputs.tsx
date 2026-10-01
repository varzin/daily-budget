import type { ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { computeDaysLeft } from '../../lib/math'
import { pluralDays } from '../../lib/utils'
import BalanceCard from './BalanceCard'
import styles from './DashboardTab.module.css'

export default function Inputs() {
  const incomeDay = useBudgetStore(s => s.incomeDay)

  const day = Number(incomeDay)
  const showDaysLeft = day >= 1 && day <= 31
  const daysLeft = showDaysLeft ? computeDaysLeft(day) : 0

  const onIncomeDayChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    useBudgetStore.getState().setIncomeDay(v === '' ? 0 : parseInt(v, 10) || 0)
  }

  return (
    <div className={styles.inputs}>
      <BalanceCard />
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
