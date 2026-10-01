import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { CURRENCIES, getCurrency, type Currency } from '../../../lib/currency'
import styles from './CurrencySelect.module.css'

interface CurrencySelectProps {
  value: string
  onChange: (code: string) => void
  /**
   * `field` — a labelled full-width select (Settings, the category editor).
   * `box` — the same boxed control without a label, showing only the symbol
   *   (or the code when the currency has none); sits next to an amount field.
   * `inline` — bare code + caret, for the borderless balance field.
   * `box` and `inline` lay the native select invisibly over a custom face, so
   * the platform picker (with full names) still opens.
   */
  variant?: 'field' | 'box' | 'inline'
  /** Visible label for the `field` variant. */
  label?: string
  /** Accessible name; required for `box` / `inline`, which have no visible label. */
  ariaLabel?: string
  className?: string
}

/** The curated picker set, plus `value` itself when it's outside it. */
function optionsFor(value: string): Currency[] {
  if (CURRENCIES.some((c) => c.code === value)) return CURRENCIES
  return [...CURRENCIES, getCurrency(value)]
}

/**
 * Currency picker (CLAUDE.md "Валюта у сумм"). Used for the display currency
 * and for the currency an individual amount is denominated in.
 */
export default function CurrencySelect({
  value,
  onChange,
  variant = 'field',
  label,
  ariaLabel,
  className,
}: CurrencySelectProps) {
  const options = useMemo(() => optionsFor(value), [value])
  const overlaid = variant !== 'field'
  const select = (
    <select
      className={overlaid ? styles.overlay : styles.select}
      value={value}
      aria-label={ariaLabel ?? (overlaid ? 'Currency' : undefined)}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} · {c.name} ({c.code})
        </option>
      ))}
    </select>
  )
  const cls = (base: string | undefined) => [base, className].filter(Boolean).join(' ')

  if (variant === 'inline') {
    return (
      <span className={cls(styles.inline)}>
        <span className={styles.code} aria-hidden="true">
          {value}
          <span className={styles.caret}>▾</span>
        </span>
        {select}
      </span>
    )
  }

  if (variant === 'box') {
    // Intl's narrow symbol falls back to the code for currencies without one.
    return (
      <span className={cls(styles.box)}>
        <span className={styles.boxFace} aria-hidden="true">
          {getCurrency(value).symbol}
        </span>
        <ChevronDown className={styles.chevron} size={16} strokeWidth={2} aria-hidden="true" />
        {select}
      </span>
    )
  }

  return (
    <label className={cls(styles.field)}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.selectWrap}>
        {select}
        <ChevronDown className={styles.chevron} size={16} strokeWidth={2} aria-hidden="true" />
      </span>
    </label>
  )
}
