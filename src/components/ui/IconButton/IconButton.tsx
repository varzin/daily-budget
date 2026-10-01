import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './IconButton.module.css'

type Size = 'sm' | 'md'
type Tone = 'default' | 'danger'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name, also shown as the tooltip. */
  label: string
  /** sm — 24px box / 15px icon (inline with small text); md — 30px / 18px. */
  size?: Size
  /** danger reddens the icon on hover (row delete). */
  tone?: Tone
  children: ReactNode
}

/**
 * Icon-only button (help, info, close, row delete). Keeps a small visual box;
 * on touch devices the hit area grows invisibly to 44×44 without moving
 * anything around it.
 */
export default function IconButton({
  label,
  size = 'md',
  tone = 'default',
  className,
  type = 'button',
  children,
  ...rest
}: IconButtonProps) {
  const classes = [
    styles.btn,
    size === 'sm' ? styles.sm : styles.md,
    tone === 'danger' && styles.danger,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type={type} className={classes} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  )
}
