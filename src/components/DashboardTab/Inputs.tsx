import type { ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import styles from './DashboardTab.module.css'

export default function Inputs() {
  const bank = useBudgetStore(s => s.bank)
  const incomeDay = useBudgetStore(s => s.incomeDay)

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
          <span className={styles.fieldPrefix} aria-hidden="true">€</span>
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
      </div>
    </div>
  )
}
