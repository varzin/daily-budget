import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import styles from './Segmented.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  /** Accessible label for the group (it renders as a radiogroup). */
  ariaLabel?: string
}

/**
 * A segmented control: a row of mutually-exclusive options with a sliding
 * highlight. Implemented as a WAI-ARIA radiogroup with roving tabindex and
 * arrow-key navigation. Generic over the value type so callers stay type-safe.
 */
export default function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: SegmentedProps<T>) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value))

  const select = (idx: number) => {
    const opt = options[idx]
    if (!opt) return
    buttonsRef.current[idx]?.focus()
    onChange(opt.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (activeIndex + 1) % options.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (activeIndex - 1 + options.length) % options.length
    } else if (e.key === 'Home') {
      next = 0
    } else if (e.key === 'End') {
      next = options.length - 1
    }
    if (next !== null) {
      e.preventDefault()
      select(next)
    }
  }

  return (
    <div
      className={styles.group}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      style={{ '--seg-count': options.length } as React.CSSProperties}
    >
      <span
        className={styles.thumb}
        aria-hidden="true"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {options.map((opt, i) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonsRef.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            className={[styles.option, isActive ? styles.active : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon && (
              <span className={styles.icon} aria-hidden="true">
                {opt.icon}
              </span>
            )}
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
