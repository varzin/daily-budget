import { useState } from 'react'
import type { ReactNode, KeyboardEvent } from 'react'
import TextField from '../TextField/TextField'
import { evaluateLenient, formatEvalResult, hasMathOps } from '../../../lib/evalExpr'

interface MathFieldProps {
  label?: string
  prefix?: ReactNode
  placeholder?: string
  value: string                            // the formula — source of truth
  onChange: (next: string) => void
  fullWidth?: boolean
  alignRight?: boolean
  autoFocus?: boolean
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

export default function MathField({
  label,
  prefix,
  placeholder,
  value,
  onChange,
  fullWidth,
  alignRight,
  autoFocus,
  onKeyDown,
}: MathFieldProps) {
  const [focused, setFocused] = useState(false)
  const result = evaluateLenient(value)
  const showResult = !focused && result.ok && hasMathOps(value)
  const display = showResult ? formatEvalResult(result.value) : value
  const invalid = !result.ok

  return (
    <TextField
      label={label}
      type="text"
      inputMode="text"
      placeholder={placeholder}
      prefix={prefix}
      fullWidth={fullWidth}
      alignRight={alignRight}
      autoFocus={autoFocus}
      value={display}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      aria-invalid={invalid || undefined}
    />
  )
}
