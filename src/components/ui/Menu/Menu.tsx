import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import styles from './Menu.module.css'

export interface MenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

export interface MenuTriggerProps {
  onClick: () => void
  'aria-haspopup': 'menu'
  'aria-expanded': boolean
}

interface MenuProps {
  items: MenuItem[]
  /** Renders the button that toggles the menu; spread `props` onto it. */
  trigger: (props: MenuTriggerProps) => ReactNode
  /** Which edge of the trigger the popover lines up with. */
  align?: 'start' | 'end'
  /** Preferred side; flips to the other one when there's no room. */
  placement?: 'bottom' | 'top'
  className?: string
}

/** Space kept clear above the floating bottom nav (≈ main's bottom padding). */
const NAV_CLEARANCE = 100
const GAP = 6

/**
 * "…" actions menu. Escape closes only the menu (never a dialog it sits in),
 * an outside press or picking an item closes it, arrow keys move between
 * items, and the popover flips above the trigger when it wouldn't fit below
 * (e.g. it would land under the bottom nav).
 */
export default function Menu({
  items,
  trigger,
  align = 'end',
  placement = 'bottom',
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState(placement)
  const wrapRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const close = useCallback((refocus: boolean) => {
    setOpen(false)
    if (refocus) wrapRef.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
  }, [])

  // Pick the side before paint so the popover never flashes in the wrong spot.
  useLayoutEffect(() => {
    if (!open) return
    const wrap = wrapRef.current
    const pop = popRef.current
    if (!wrap || !pop) return
    const r = wrap.getBoundingClientRect()
    const need = pop.offsetHeight + GAP
    const below = window.innerHeight - r.bottom - NAV_CLEARANCE
    const above = r.top
    if (placement === 'bottom') setSide(below >= need || below >= above ? 'bottom' : 'top')
    else setSide(above >= need || above >= below ? 'top' : 'bottom')
  }, [open, placement])

  useEffect(() => {
    if (!open) return
    popRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close(false)
    }
    // Capture phase on window: runs before a surrounding Modal's Escape
    // handler, and stopping it there keeps the dialog open.
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      close(true)
    }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, close])

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    const list = Array.from(
      popRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    )
    if (list.length === 0) return
    e.preventDefault()
    const at = list.indexOf(document.activeElement as HTMLElement)
    const next =
      e.key === 'Home' ? 0
      : e.key === 'End' ? list.length - 1
      : (at + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length
    list[next]?.focus()
  }

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')} ref={wrapRef}>
      {trigger({
        onClick: () => setOpen(o => !o),
        'aria-haspopup': 'menu',
        'aria-expanded': open,
      })}
      {open && (
        <div
          ref={popRef}
          role="menu"
          className={[
            styles.popover,
            side === 'top' ? styles.top : styles.bottom,
            align === 'start' ? styles.start : styles.end,
          ].join(' ')}
          onKeyDown={onMenuKey}
        >
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={[styles.item, item.danger && styles.danger].filter(Boolean).join(' ')}
              disabled={item.disabled}
              onClick={() => {
                close(false)
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
