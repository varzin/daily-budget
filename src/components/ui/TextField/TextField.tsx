import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './TextField.module.css'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string
  prefix?: ReactNode
  suffix?: ReactNode
  fullWidth?: boolean
  alignRight?: boolean
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, prefix, suffix, fullWidth = false, alignRight = false, className, type = 'text', ...rest },
  ref,
) {
  const wrapClasses = [styles.field, fullWidth && styles.fullWidth, className].filter(Boolean).join(' ')
  const inputClasses = [styles.input, alignRight && styles.alignRight, prefix && styles.hasPrefix, suffix && styles.hasSuffix]
    .filter(Boolean)
    .join(' ')

  return (
    <label className={wrapClasses}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.inputWrap}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input ref={ref} type={type} className={inputClasses} {...rest} />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </span>
    </label>
  )
})

export default TextField
