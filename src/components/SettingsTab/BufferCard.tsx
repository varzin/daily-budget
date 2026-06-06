import type { ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import TextField from '../ui/TextField/TextField'
import styles from './BufferCard.module.css'

/**
 * Green-zone cushion setting: the desired positive balance to keep by month
 * end. Feeds perDayGreen on the dashboard. Synced across devices via the same
 * scalar-merge path as bank / incomeDay (see budgetStore.setBuffer + meta).
 */
export default function BufferCard() {
  const buffer = useBudgetStore((s) => s.buffer)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    useBudgetStore.getState().setBuffer(v === '' ? 0 : parseFloat(v) || 0)
  }

  return (
    <div className={styles.card}>
      <p className={styles.lead}>
        Your cushion — the balance you want left over by your next income day.
        The green daily budget keeps this much untouched on top of savings. Set
        it to 0 for a plain break-even target.
      </p>
      <TextField
        label="Desired balance by month end"
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        placeholder="0"
        prefix="€"
        value={buffer || ''}
        onChange={onChange}
      />
    </div>
  )
}
