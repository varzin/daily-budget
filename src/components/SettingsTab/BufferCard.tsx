import type { ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { CURRENCIES } from '../../lib/currency'
import { useMoney } from '../../lib/useMoney'
import TextField from '../ui/TextField/TextField'
import styles from './BufferCard.module.css'

/**
 * Budget settings: the currency used across the app, the green-zone cushion
 * (the desired balance to keep by month end) and the optional monthly income
 * feeding the dashboard pace indicator. All are synced scalars — see
 * budgetStore.setCurrency / setBuffer / setMonthlyIncome and the per-field
 * meta timestamps.
 */
export default function BufferCard() {
  const buffer = useBudgetStore((s) => s.buffer)
  const currency = useBudgetStore((s) => s.currency)
  const monthlyIncome = useBudgetStore((s) => s.monthlyIncome)
  const money = useMoney()

  const onBufferChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    useBudgetStore.getState().setBuffer(v === '' ? 0 : parseFloat(v) || 0)
  }

  const onCurrencyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    useBudgetStore.getState().setCurrency(e.target.value)
  }

  const onIncomeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    useBudgetStore.getState().setMonthlyIncome(v === '' ? 0 : parseFloat(v) || 0)
  }

  return (
    <div className={styles.card}>
      <p className={styles.lead}>
        The currency shown across the app, and your cushion — the balance you
        want left over by your next income day. The green daily budget keeps the
        cushion untouched on top of savings; set it to 0 for a plain break-even
        target.
      </p>

      <label className={styles.selectField}>
        <span className={styles.selectLabel}>Currency</span>
        <select
          className={styles.select}
          value={currency}
          onChange={onCurrencyChange}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} · {c.name} ({c.code})
            </option>
          ))}
        </select>
      </label>

      <TextField
        label="Desired balance by month end"
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        placeholder="0"
        prefix={money.symbol}
        value={buffer || ''}
        onChange={onBufferChange}
      />

      <div className={styles.income}>
        <TextField
          label="Monthly income (optional)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          placeholder="Not set"
          prefix={money.symbol}
          value={monthlyIncome || ''}
          onChange={onIncomeChange}
        />
        <p className={styles.note}>
          Used only for the spending-pace indicator on the dashboard — it
          compares your actual daily budget with the planned one. Your daily
          budget itself never depends on it. Leave empty to hide the indicator.
        </p>
      </div>
    </div>
  )
}
