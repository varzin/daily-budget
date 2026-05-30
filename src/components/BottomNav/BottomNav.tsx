import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { TabName } from '../../types'
import styles from './BottomNav.module.css'

interface TabDef {
  name: TabName
  label: string
  icon: ReactNode
}

/* Icons match the SVGs from index.html exactly. */
const TABS: TabDef[] = [
  {
    name: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
  },
  {
    name: 'obligatory',
    label: 'Fixed expenses',
    icon: (
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h5" />
        <path d="M17.5 17.5 16 16.3V14" />
        <circle cx="16" cy="16" r="6" />
      </svg>
    ),
  },
  {
    name: 'savings',
    label: 'Savings',
    icon: (
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="3" x2="21" y1="22" y2="22" />
        <line x1="6" x2="6" y1="18" y2="11" />
        <line x1="10" x2="10" y1="18" y2="11" />
        <line x1="14" x2="14" y1="18" y2="11" />
        <line x1="18" x2="18" y1="18" y2="11" />
        <polygon points="12 2 20 7 4 7" />
      </svg>
    ),
  },
  {
    name: 'settings',
    label: 'Settings',
    icon: (
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
]

interface Props {
  active: TabName
  onChange: (next: TabName) => void
}

/**
 * WAI-ARIA tablist with keyboard nav.
 * Mirrors the pattern from js/app.js:18-49 (Arrow/Home/End wrap, focus
 * follows selection).
 */
export default function BottomNav({ active, onChange }: Props) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])

  const focusTab = (idx: number) => {
    const btn = buttonsRef.current[idx]
    if (btn) btn.focus()
    const tab = TABS[idx]
    if (tab) onChange(tab.name)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = buttonsRef.current.findIndex((b) => b === document.activeElement)
    if (i === -1) return
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (i + 1) % TABS.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (i - 1 + TABS.length) % TABS.length
    } else if (e.key === 'Home') {
      next = 0
    } else if (e.key === 'End') {
      next = TABS.length - 1
    }
    if (next !== null) {
      e.preventDefault()
      focusTab(next)
    }
  }

  return (
    <nav
      className={styles.tabs}
      role="tablist"
      aria-label="Sections"
    >
      <div className={styles.inner} onKeyDown={handleKeyDown}>
        {TABS.map((t, i) => {
          const isActive = t.name === active
          const className = [styles.tab, isActive ? styles.active : '']
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={t.name}
              ref={(el) => {
                buttonsRef.current[i] = el
              }}
              className={className}
              role="tab"
              id={`tab-btn-${t.name}`}
              type="button"
              aria-selected={isActive}
              aria-controls={`tab-${t.name}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(t.name)}
            >
              {t.icon}
              <span className={styles.label}>
                <span>{t.label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
