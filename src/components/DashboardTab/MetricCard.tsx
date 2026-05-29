import type { ReactNode } from 'react'
import styles from './MetricCard.module.css'

type Variant = 'featured' | 'green' | 'yellow' | 'blue' | 'deficit'

interface MetricCardProps {
  variant?: Variant
  label: string
  symbol?: string
  value: string
  subtitle?: ReactNode
  id?: string
}

/**
 * Concatenates CSS-Module class names, dropping falsy values.
 * Intentionally manual — no `classnames` dependency.
 */
function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

export default function MetricCard({
  variant,
  label,
  symbol = '€',
  value,
  subtitle,
  id,
}: MetricCardProps) {
  const variantClass = variant ? styles[variant] : undefined
  return (
    <div className={cx(styles.metric, variantClass)} id={id}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>
        <span className={styles.sym}>{symbol}</span>
        <span>{value}</span>
      </div>
      {subtitle !== undefined && <div className={styles.sub}>{subtitle}</div>}
    </div>
  )
}
