import type { ReactNode } from 'react'
import styles from './MetricCard.module.css'

type Tone = 'green' | 'teal' | 'yellow' | 'orange' | 'blue' | 'deficit'

interface MetricCardProps {
  /** Render the hero treatment (large serif italic, full-width). Can combine with tone. */
  featured?: boolean
  tone?: Tone
  label: string
  symbol?: string
  value: string
  subtitle?: ReactNode
  /** Optional control row (e.g. mode tabs) rendered inside the card, above the label. */
  tabs?: ReactNode
  id?: string
}

function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

export default function MetricCard({
  featured,
  tone,
  label,
  symbol = '€',
  value,
  subtitle,
  tabs,
  id,
}: MetricCardProps) {
  return (
    <div
      className={cx(
        styles.metric,
        featured && styles.featured,
        tone && styles[tone],
      )}
      id={id}
    >
      {tabs !== undefined && <div className={styles.tabs}>{tabs}</div>}
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>
        <span className={styles.sym}>{symbol}</span>
        <span>{value}</span>
      </div>
      {subtitle !== undefined && <div className={styles.sub}>{subtitle}</div>}
    </div>
  )
}
