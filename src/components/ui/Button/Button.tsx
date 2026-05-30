import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  children: ReactNode
}

const variantClass: Record<Variant, string | undefined> = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
  ghost: styles.ghost,
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    styles.btn,
    variantClass[variant],
    size === 'sm' && styles.sm,
    block && styles.block,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}
