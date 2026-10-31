import { useEffect, useState, type KeyboardEvent } from 'react'
import type { SavingsRow } from '../../types'
import { useBudgetStore } from '../../store/budgetStore'
import { evaluateLenient } from '../../lib/evalExpr'
import { money } from '../../lib/currency'
import { useRateResolver } from '../../lib/rates'
import { currentMonthKey } from '../../lib/utils'
import Modal from '../ui/Modal/Modal'
import Button from '../ui/Button/Button'
import TextField from '../ui/TextField/TextField'
import MathField from '../ui/MathField/MathField'
import CurrencySelect from '../ui/CurrencySelect/CurrencySelect'
import styles from './SavingsRowModal.module.css'

interface SavingsRowModalProps {
  open: boolean
  row: SavingsRow | null  // null → "add" mode
  onClose: () => void
}

interface Draft {
  month: string
  savedExpr: string
  /** Currency `saved` is in; changing it relabels, never converts. */
  currency: string
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

/** `defaultCurrency` (the display currency) tags a brand-new row. */
function draftFrom(row: SavingsRow | null, defaultCurrency: string): Draft {
  if (!row) return { month: currentMonthKey(), savedExpr: '', currency: defaultCurrency }
  return {
    month: row.month,
    savedExpr: row.saved ? String(row.saved) : '',
    currency: row.currency,
  }
}

/**
 * Editor for a savings row — its month, "Saved this month" (formula-capable,
 * may be negative) and the currency that amount is in: the same amount +
 * currency pair as the category editor and the Settings amounts. Only the
 * evaluated number is stored; savings rows keep no formula.
 */
export default function SavingsRowModal({ open, row, onClose }: SavingsRowModalProps) {
  const isEdit = row !== null
  const [draft, setDraft] = useState<Draft>(() =>
    draftFrom(row, useBudgetStore.getState().currency),
  )
  // A formula evaluates into the row's own currency.
  const rate = useRateResolver(draft.currency)
  const symbol = money(draft.currency).symbol

  useEffect(() => {
    // Snapshot at open — a sync landing mid-edit must not reset the draft.
    if (open) setDraft(draftFrom(row, useBudgetStore.getState().currency))
  }, [open, row])

  const savedEval = evaluateLenient(draft.savedExpr, { rate })
  const monthValid = MONTH_RE.test(draft.month)
  const canSave = monthValid && savedEval.ok

  const submit = () => {
    if (!savedEval.ok || !monthValid) return
    const fields = { month: draft.month, saved: savedEval.value, currency: draft.currency }
    const store = useBudgetStore.getState()
    if (row) store.updateSavingsRow(row.id, fields)
    else store.addSavingsRow(fields)
    onClose()
  }

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit month' : 'Add month'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!canSave}>
            {isEdit ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <TextField
          label="Month"
          type="month"
          placeholder="YYYY-MM"
          fullWidth
          value={draft.month}
          onChange={e => setDraft(d => ({ ...d, month: e.target.value }))}
          onKeyDown={onEnter}
          aria-invalid={!monthValid || undefined}
        />

        <div className={styles.amount}>
          <div className={styles.amountRow}>
            <MathField
              label="Saved this month"
              placeholder="0"
              prefix={symbol}
              currency={draft.currency}
              alignRight
              fullWidth
              autoFocus
              value={draft.savedExpr}
              onChange={v => setDraft(d => ({ ...d, savedExpr: v }))}
              onKeyDown={onEnter}
            />
            <CurrencySelect
              variant="box"
              ariaLabel="Saved currency"
              value={draft.currency}
              onChange={code => setDraft(d => ({ ...d, currency: code }))}
            />
          </div>
          <p className={styles.note}>
            Negative if you spent more than you earned. Changing the currency
            keeps the number and only relabels it.
          </p>
        </div>

        {!canSave && (
          <div className={styles.errorRow}>
            {monthValid ? 'Invalid expression in Saved this month' : 'Pick a month'}
          </div>
        )}
      </div>
    </Modal>
  )
}
