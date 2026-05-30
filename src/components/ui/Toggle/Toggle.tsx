import type { ReactNode } from 'react'
import styles from './Toggle.module.css'

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export default function Toggle({ checked, onChange, label, description, disabled = false }: ToggleProps) {
  return (
    <label className={[styles.row, disabled && styles.disabled].filter(Boolean).join(' ')}>
      <span className={styles.text}>
        {label && <span className={styles.label}>{label}</span>}
        {description && <span className={styles.description}>{description}</span>}
      </span>
      <span className={[styles.switch, checked && styles.on].filter(Boolean).join(' ')}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          className={styles.input}
        />
        <span className={styles.thumb} />
      </span>
    </label>
  )
}
