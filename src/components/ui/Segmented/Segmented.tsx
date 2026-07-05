import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import styles from './Segmented.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  /** Visible but not selectable: dimmed, skipped by arrow-key navigation. */
  disabled?: boolean
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
  const groupRef = useRef<HTMLDivElement>(null)
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value))

  // The sliding highlight tracks the active button's measured geometry: with
  // long labels the 1fr grid tracks grow past an equal split (nowrap text sets
  // their min-content), so a fixed 1/N thumb would misalign on narrow screens.
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null)
  useLayoutEffect(() => {
    const update = () => {
      const btn = buttonsRef.current[activeIndex]
      if (btn) setThumb({ left: btn.offsetLeft, width: btn.offsetWidth })
    }
    update()
    const group = groupRef.current
    if (!group || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(group)
    return () => ro.disconnect()
  }, [activeIndex, options.length])

  const select = (idx: number) => {
    const opt = options[idx]
    if (!opt || opt.disabled) return
    buttonsRef.current[idx]?.focus()
    onChange(opt.value)
  }

  /** Nearest enabled index stepping from activeIndex in `dir`, wrapping around. */
  const step = (dir: 1 | -1): number | null => {
    for (let k = 1; k <= options.length; k++) {
      const idx = (activeIndex + dir * k + options.length * k) % options.length
      if (!options[idx]?.disabled) return idx
    }
    return null
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = step(1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = step(-1)
    } else if (e.key === 'Home') {
      next = options.findIndex((o) => !o.disabled)
    } else if (e.key === 'End') {
      // findLastIndex needs ES2023; the project lib is ES2022.
      for (let i = options.length - 1; i >= 0; i--) {
        if (!options[i]?.disabled) {
          next = i
          break
        }
      }
    }
    if (next !== null && next !== -1) {
      e.preventDefault()
      select(next)
    }
  }

  return (
    <div
      ref={groupRef}
      className={styles.group}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      style={{ '--seg-count': options.length } as React.CSSProperties}
    >
      <span
        className={styles.thumb}
        aria-hidden="true"
        style={thumb ? { left: thumb.left, width: thumb.width } : { opacity: 0 }}
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
            aria-disabled={opt.disabled || undefined}
            tabIndex={isActive ? 0 : -1}
            className={[
              styles.option,
              isActive ? styles.active : '',
              opt.disabled ? styles.disabled : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (!opt.disabled) onChange(opt.value)
            }}
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
