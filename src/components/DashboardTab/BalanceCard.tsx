import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, MoreHorizontal, Plus } from 'lucide-react'
import type { Account } from '../../types'
import { useBudgetStore } from '../../store/budgetStore'
import { useUiPrefsStore } from '../../store/uiPrefsStore'
import { showToast } from '../../store/toastStore'
import { evaluateLenient, hasMathOps, hasCurrencyToken } from '../../lib/evalExpr'
import { formatUpdatedAgo, isStale, balancesUpdatedAt } from '../../lib/freshness'
import { useMoney } from '../../lib/useMoney'
import { useDisplayBudget } from '../../lib/useDisplayBudget'
import { useRateResolver } from '../../lib/rates'
import { sortAccounts } from '../../lib/accountOrder'
import MathField from '../ui/MathField/MathField'
import CurrencySelect from '../ui/CurrencySelect/CurrencySelect'
import styles from './BalanceCard.module.css'

/** An account's caption: its name, or its currency code when unnamed. */
export function accountLabel(a: Pick<Account, 'name' | 'currency'>): string {
  return a.name.trim() || a.currency
}

/** The balance as text: the stored formula if there is one, else the number. */
function balanceText(a: Account): string {
  if (a.balanceExpr) return a.balanceExpr
  return a.balance ? String(a.balance) : ''
}

/**
 * One account's balance field. Accepts a formula ("1200+30", "50 USD") that
 * evaluates into the account's own currency; the formula is persisted as
 * `balanceExpr` next to the number so it stays editable (same as the old
 * single balance field and the category Budget/Spent).
 */
function AccountBalanceInput({ account, autoFocus }: { account: Account; autoFocus?: boolean }) {
  const rate = useRateResolver(account.currency)
  const stored = balanceText(account)
  const [expr, setExpr] = useState<string>(stored)

  // Pull in changes that didn't come from this field (sync, import, a currency
  // relabel re-evaluating the formula). Keyed on the stored value only — an
  // in-progress invalid formula doesn't commit, so it's never clobbered.
  useEffect(() => {
    setExpr(cur => (cur.trim() === stored.trim() ? cur : stored))
  }, [stored])

  const onChange = (raw: string) => {
    setExpr(raw)
    const r = evaluateLenient(raw, { rate })
    if (!r.ok) return
    const keep = hasMathOps(raw) || hasCurrencyToken(raw)
    useBudgetStore
      .getState()
      .setAccountBalance(account.id, Math.round(r.value * 100) / 100, keep ? raw.trim() : undefined)
  }

  return (
    <MathField
      ariaLabel={`${accountLabel(account)} balance`}
      placeholder="0.00"
      currency={account.currency}
      fullWidth
      autoFocus={autoFocus}
      value={expr}
      onChange={onChange}
    />
  )
}

/**
 * The "…" menu: Rename / Move up / Move down / Delete. Items that can't apply
 * are hidden — no Move up for the first account, no Move down for the last,
 * no Delete for the only one.
 */
function AccountMenu({
  label,
  canDelete,
  onRename,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  label: string
  canDelete: boolean
  onRename: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div className={styles.menuWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.menuBtn}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label} actions`}
        title="More actions"
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </button>
      {open && (
        <div role="menu" className={styles.popover}>
          <button type="button" role="menuitem" className={styles.menuItem} onClick={run(onRename)}>
            Rename
          </button>
          {onMoveUp && (
            <button type="button" role="menuitem" className={styles.menuItem} onClick={run(onMoveUp)}>
              Move up
            </button>
          )}
          {onMoveDown && (
            <button type="button" role="menuitem" className={styles.menuItem} onClick={run(onMoveDown)}>
              Move down
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              role="menuitem"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={run(onDelete)}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** The account's caption, or an inline name editor while renaming. */
function AccountName({
  account,
  renaming,
  onDone,
}: {
  account: Account
  renaming: boolean
  onDone: () => void
}) {
  const [draft, setDraft] = useState(account.name)

  useEffect(() => {
    if (renaming) setDraft(account.name)
  }, [renaming, account.name])

  if (!renaming) return <span className={styles.accountName}>{accountLabel(account)}</span>

  const commit = () => {
    useBudgetStore.getState().renameAccount(account.id, draft)
    onDone()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onDone()
    }
  }

  return (
    <input
      className={styles.nameInput}
      value={draft}
      placeholder={account.currency}
      aria-label="Account name"
      autoFocus
      onChange={e => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={commit}
    />
  )
}

function AccountRow({
  account,
  canDelete,
  canMoveUp,
  canMoveDown,
  autoFocus,
}: {
  account: Account
  canDelete: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  autoFocus?: boolean
}) {
  const [renaming, setRenaming] = useState(false)
  const label = accountLabel(account)

  // No blocking confirm — delete right away and offer Undo in a toast
  // (the delete is a tombstone, so undo simply restores the account).
  const onDelete = () => {
    if (!useBudgetStore.getState().deleteAccount(account.id)) return
    showToast({
      message: `Deleted “${label}”`,
      actionLabel: 'Undo',
      onAction: () => useBudgetStore.getState().restoreAccount(account.id),
    })
  }

  return (
    <li className={styles.account}>
      <AccountName account={account} renaming={renaming} onDone={() => setRenaming(false)} />
      <div className={styles.accountRow}>
        <AccountBalanceInput account={account} autoFocus={autoFocus} />
        <CurrencySelect
          variant="box"
          ariaLabel={`${label} currency`}
          value={account.currency}
          onChange={code => useBudgetStore.getState().setAccountCurrency(account.id, code)}
        />
        <AccountMenu
          label={label}
          canDelete={canDelete}
          onRename={() => setRenaming(true)}
          onMoveUp={canMoveUp ? () => useBudgetStore.getState().moveAccount(account.id, -1) : undefined}
          onMoveDown={canMoveDown ? () => useBudgetStore.getState().moveAccount(account.id, 1) : undefined}
          onDelete={onDelete}
        />
      </div>
    </li>
  )
}

/**
 * The dashboard balance (CLAUDE.md "Счета"): collapsed, the total of every
 * account converted into the display currency — no currency picker, it always
 * follows Settings. Tapping it expands the account list, where each account has
 * its own balance (formula-capable), currency and a Rename/Move/Delete menu. There is
 * always at least one account. One shared "Updated …" line covers them all.
 */
export default function BalanceCard() {
  const accounts = useBudgetStore(s => s.accounts)
  const live = sortAccounts(accounts.filter(a => !a.deletedAt))
  const display = useDisplayBudget()
  const money = useMoney()
  const storedOpen = useUiPrefsStore(s => s.accountsOpen)
  const setOpen = useUiPrefsStore(s => s.setAccountsOpen)
  // A brand-new install has nothing to show collapsed: open the list so the
  // first balance can be typed straight away.
  const empty = live.every(a => !a.balance && !a.balanceExpr)
  const open = storedOpen || empty
  const [focusId, setFocusId] = useState<string | null>(null)
  // True while the open/close height transition runs: the list clips its
  // overflow only then, so a "…" menu near the bottom isn't cut off once open.
  const [animating, setAnimating] = useState(false)

  // Fallback for engines that don't animate grid rows (no transitionend) and
  // for a toggle that doesn't change the height (e.g. forced open while empty).
  useEffect(() => {
    if (!animating) return
    const t = setTimeout(() => setAnimating(false), 320)
    return () => clearTimeout(t)
  }, [animating])

  const toggle = (next: boolean) => {
    if (next === open) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!reduced) setAnimating(true)
    setOpen(next)
  }

  const updatedAt = balancesUpdatedAt(accounts)
  const updatedLabel = formatUpdatedAgo(updatedAt)
  const stale = isStale(updatedAt)

  const onAdd = () => {
    const id = useBudgetStore.getState().addAccount()
    setFocusId(id)
  }

  return (
    <div className={styles.card}>
      {/* The whole face — padding included — is the toggle; collapsed, that's
          the entire card. */}
      <button
        type="button"
        className={styles.summary}
        aria-expanded={open}
        aria-controls="accounts-list"
        onClick={() => toggle(!open)}
      >
        <span className={styles.summaryLabel}>Current balance</span>
        <span className={styles.summaryRow}>
          <span className={styles.total}>
            <span className={styles.totalSymbol} aria-hidden="true">{money.symbol}</span>
            {money.fmt(display.bank)}
          </span>
          <ChevronDown
            className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
            size={18}
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>
        {updatedLabel && (
          <span className={`${styles.updated} ${stale ? styles.updatedStale : ''}`}>
            {updatedLabel}
          </span>
        )}
      </button>

      {/* Always mounted so closing can animate too; collapsed, it's hidden
          (visibility) from the tab order and assistive tech. */}
      <div
        className={[
          styles.details,
          open && styles.detailsOpen,
          open && !animating && styles.detailsSettled,
        ]
          .filter(Boolean)
          .join(' ')}
        id="accounts-list"
        onTransitionEnd={e => {
          if (e.target === e.currentTarget) setAnimating(false)
        }}
      >
        <div className={styles.detailsInner}>
          <div className={styles.detailsBody}>
            <ul className={styles.accounts} aria-label="Accounts">
              {live.map((a, i) => (
                <AccountRow
                  key={a.id}
                  account={a}
                  canDelete={live.length > 1}
                  canMoveUp={i > 0}
                  canMoveDown={i < live.length - 1}
                  autoFocus={a.id === focusId}
                />
              ))}
            </ul>
            <button type="button" className={styles.addBtn} onClick={onAdd}>
              <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
              <span>Add account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
