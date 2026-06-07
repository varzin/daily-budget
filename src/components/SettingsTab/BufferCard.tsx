import type { ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { CURRENCIES } from '../../lib/currency'
import { useMoney } from '../../lib/useMoney'
import TextField from '../ui/TextField/TextField'
import styles from './BufferCard.module.css'

/**
 * Budget settings: the currency used across the app and the green-zone cushion
 * (the desired balance to keep by month end). Both are synced scalars — see
 * budgetStore.setCurrency / setBuffer and the per-field meta timestamps.
 */
export default function BufferCard() {
  const buffer = useBudgetStore((s) => s.buffer)
  const currency = useBudgetStore((s) => s.currency)
  const money = useMoney()

  const onBufferChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    useBudgetStore.getState().setBuffer(v === '' ? 0 : parseFloat(v) || 0)
  }

  const onCurrencyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    useBudgetStore.getState().setCurrency(e.target.value)
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
              {c.symbol} · {c.label} ({c.code})
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
    </div>
  )
}
