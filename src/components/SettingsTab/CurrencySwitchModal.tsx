import { useEffect, useMemo } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { getCurrency, money } from '../../lib/currency'
import { previewCurrencySwitch, type SwitchPreviewRow } from '../../lib/convert'
import { refreshRates } from '../../lib/rates'
import ConfirmModal from '../ui/ConfirmModal/ConfirmModal'
import styles from './CurrencySwitchModal.module.css'

interface CurrencySwitchModalProps {
  /** The display currency being switched to; null keeps the dialog closed. */
  to: string | null
  onConfirm: (code: string) => void
  onClose: () => void
}

const ROW_LABELS: Record<SwitchPreviewRow['key'], string> = {
  balance: 'Current balance',
  fixed: 'Fixed expenses left',
  savings: 'Savings',
  sample: 'For example',
}

const amount = (a: { amount: number; currency: string }): string => {
  const m = money(a.currency)
  return `${m.symbol}${m.fmt(a.amount)}`
}

/**
 * Confirmation before switching the display currency (CLAUDE.md "Валюта у
 * сумм"): explains that nothing is rewritten and illustrates the conversion on
 * the user's own figures — "֏25 000 → €61,34" — at today's cached rate. The
 * switch happens only on confirm.
 */
export default function CurrencySwitchModal({ to, onConfirm, onClose }: CurrencySwitchModalProps) {
  const currency = useBudgetStore(s => s.currency)
  const bank = useBudgetStore(s => s.bank)
  const bankCurrency = useBudgetStore(s => s.bankCurrency)
  const buffer = useBudgetStore(s => s.buffer)
  const bufferCurrency = useBudgetStore(s => s.bufferCurrency)
  const monthlyIncome = useBudgetStore(s => s.monthlyIncome)
  const monthlyIncomeCurrency = useBudgetStore(s => s.monthlyIncomeCurrency)
  const categories = useBudgetStore(s => s.categories)
  const savings = useBudgetStore(s => s.savings)
  const rates = useBudgetStore(s => s.rates)
  const preview = useMemo(
    () =>
      to
        ? previewCurrencySwitch(
            {
              currency,
              bank,
              bankCurrency,
              buffer,
              bufferCurrency,
              monthlyIncome,
              monthlyIncomeCurrency,
              categories,
              savings,
            },
            to,
            rates,
          )
        : null,
    [
      to,
      currency,
      bank,
      bankCurrency,
      buffer,
      bufferCurrency,
      monthlyIncome,
      monthlyIncomeCurrency,
      categories,
      savings,
      rates,
    ],
  )

  // A preview without rates can't illustrate anything — try to fetch them now;
  // the dialog re-renders when they land.
  const needsRates = !!preview && (preview.rate === null || preview.missing.length > 0)
  useEffect(() => {
    if (needsRates) void refreshRates()
  }, [needsRates])

  const target = to ? getCurrency(to) : null

  return (
    <ConfirmModal
      open={to !== null}
      onClose={onClose}
      title={target ? `Show amounts in ${target.name}?` : ''}
      confirmLabel={target ? `Switch to ${target.code}` : 'Switch'}
      onConfirm={() => to && onConfirm(to)}
    >
      {preview && target && (
        <>
          <p>
            Your totals and daily budget will be shown in {target.name}. All
            previously entered data stays untouched.
          </p>

          {preview.rows.length > 0 && (
            <ul className={styles.rows} aria-label="How your figures will look">
              {preview.rows.map(row => (
                <li key={row.key} className={styles.row}>
                  <span className={styles.label}>{ROW_LABELS[row.key]}</span>
                  <span className={styles.conversion}>
                    <span className={styles.from}>{amount(row.from)}</span>
                    <span className={styles.arrow} aria-label="becomes">→</span>
                    <span className={styles.to}>{amount(row.to)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {preview.missing.length > 0 && (
            <p className={styles.warning} role="status">
              No exchange rate for {preview.missing.join(', ')} yet — until rates
              load, those amounts would be counted 1:1.
            </p>
          )}
        </>
      )}
    </ConfirmModal>
  )
}
