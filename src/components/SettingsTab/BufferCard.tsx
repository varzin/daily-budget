import { useState, type ChangeEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { refreshRates } from '../../lib/rates'
import TextField from '../ui/TextField/TextField'
import CurrencySelect from '../ui/CurrencySelect/CurrencySelect'
import CurrencySwitchModal from './CurrencySwitchModal'
import styles from './BufferCard.module.css'

/**
 * Budget settings: the display currency, the green-zone cushion (the desired
 * balance to keep by month end) and the optional monthly income feeding the
 * dashboard pace indicator. All are synced scalars — see budgetStore
 * setCurrency / setBuffer / setMonthlyIncome and the per-field meta timestamps.
 * The cushion and the income each carry their own currency (CLAUDE.md
 * "Валюта у сумм"); switching the display currency converts nothing.
 */
export default function BufferCard() {
  const buffer = useBudgetStore((s) => s.buffer)
  const bufferCurrency = useBudgetStore((s) => s.bufferCurrency)
  const currency = useBudgetStore((s) => s.currency)
  const monthlyIncome = useBudgetStore((s) => s.monthlyIncome)
  const monthlyIncomeCurrency = useBudgetStore((s) => s.monthlyIncomeCurrency)
  // The display currency picked but not yet confirmed (dialog open).
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null)

  const onBufferChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    useBudgetStore.getState().setBuffer(v === '' ? 0 : parseFloat(v) || 0)
  }

  // The picker only opens the confirmation; the select stays on the current
  // currency (it's bound to the store) until the switch is confirmed.
  const onCurrencyChange = (code: string) => {
    if (code !== currency) setPendingCurrency(code)
  }

  const confirmCurrency = (code: string) => {
    useBudgetStore.getState().setCurrency(code)
    // Re-align the cached rates' base with the new display currency. Not
    // required for correctness (any pair converts via a cross-rate), and a
    // failure simply keeps the cache.
    void refreshRates()
  }

  const onIncomeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    useBudgetStore.getState().setMonthlyIncome(v === '' ? 0 : parseFloat(v) || 0)
  }

  return (
    <div className={styles.card}>
      <p className={styles.lead}>
        The currency totals and your daily budget are shown in, and your
        cushion — the balance you want left over by your next income day. The
        green daily budget keeps the cushion untouched on top of savings; set it
        to 0 for a plain break-even target.
      </p>

      <CurrencySelect
        className={styles.currency}
        label="Display currency"
        value={currency}
        onChange={onCurrencyChange}
      />
      <p className={styles.currencyNote}>
        Amounts you've entered keep their own currency and are converted at
        today's rate — switching here changes no data.
      </p>

      <div className={styles.amountRow}>
        <TextField
          label="Desired balance by month end"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          placeholder="0"
          fullWidth
          value={buffer || ''}
          onChange={onBufferChange}
        />
        <CurrencySelect
          variant="box"
          ariaLabel="Cushion currency"
          value={bufferCurrency}
          onChange={(code) => useBudgetStore.getState().setBuffer(buffer, code)}
        />
      </div>

      <div className={styles.income}>
        <div className={styles.amountRow}>
          <TextField
            label="Monthly income (optional)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            placeholder="Not set"
            fullWidth
            value={monthlyIncome || ''}
            onChange={onIncomeChange}
          />
          <CurrencySelect
            variant="box"
            ariaLabel="Income currency"
            value={monthlyIncomeCurrency}
            onChange={(code) =>
              useBudgetStore.getState().setMonthlyIncome(monthlyIncome, code)
            }
          />
        </div>
        <p className={styles.note}>
          Used only for the spending-pace indicator on the dashboard — it
          compares your actual daily budget with the planned one. Your daily
          budget itself never depends on it. Leave empty to hide the indicator.
        </p>
      </div>
      <CurrencySwitchModal
        to={pendingCurrency}
        onConfirm={confirmCurrency}
        onClose={() => setPendingCurrency(null)}
      />
    </div>
  )
}
