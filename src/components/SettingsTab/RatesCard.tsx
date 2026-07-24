import { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { refreshRates, RATES_MAX_AGE_DAYS } from '../../lib/rates'
import { formatUpdatedAgo, daysSince } from '../../lib/freshness'
import Button from '../ui/Button/Button'
import styles from './RatesCard.module.css'

/**
 * Exchange-rate status + manual refresh (CLAUDE.md "Валюта в формулах"). Shows
 * when the cached rates were last fetched and lets the user force a refresh. The
 * rates power currency amounts written inside any amount field ("10 AMD" → the
 * default currency); they auto-refresh once a day, this card is the manual lever.
 */
export default function RatesCard() {
  const rates = useBudgetStore((s) => s.rates)
  const ratesUpdatedAt = useBudgetStore((s) => s.meta.rates)
  const currency = useBudgetStore((s) => s.currency)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const updatedLabel = formatUpdatedAgo(ratesUpdatedAt)
  const stale = !ratesUpdatedAt || daysSince(ratesUpdatedAt) >= RATES_MAX_AGE_DAYS
  const dotClassName = [styles.dot, rates && !stale ? styles.dotOk : styles.dotWarn]
    .filter(Boolean)
    .join(' ')

  const statusText = rates
    ? `Rates for ${currency}${updatedLabel ? ` · ${updatedLabel.toLowerCase()}` : ''}`
    : 'Rates not loaded yet'

  const onRefresh = async () => {
    setBusy(true)
    setError(false)
    const ok = await refreshRates({ force: true })
    if (!ok) setError(true)
    setBusy(false)
  }

  return (
    <div className={styles.card}>
      <div className={styles.statusRow}>
        <span className={dotClassName} />
        <span className={styles.statusText}>{statusText}</span>
      </div>

      <p className={styles.note}>
        Type an amount in another currency inside any budget field — e.g.{' '}
        <span className={styles.code}>10 USD</span> or{' '}
        <span className={styles.code}>10&nbsp;₽</span> — and it converts to{' '}
        {currency}. Rates refresh automatically about once a day.
      </p>

      {error && (
        <p className={styles.error}>Couldn’t reach the rates service. Check your connection and try again.</p>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={busy}>
          {busy ? 'Refreshing…' : 'Refresh now'}
        </Button>
      </div>
    </div>
  )
}
