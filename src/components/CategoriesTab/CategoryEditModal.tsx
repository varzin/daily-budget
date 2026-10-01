import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { Category } from '../../types'
import { useBudgetStore } from '../../store/budgetStore'
import { showToast } from '../../store/toastStore'
import { evaluateLenient, hasMathOps, hasCurrencyToken } from '../../lib/evalExpr'
import { money } from '../../lib/currency'
import { useRateResolver } from '../../lib/rates'
import Modal from '../ui/Modal/Modal'
import Button from '../ui/Button/Button'
import TextField from '../ui/TextField/TextField'
import MathField from '../ui/MathField/MathField'
import Toggle from '../ui/Toggle/Toggle'
import CurrencySelect from '../ui/CurrencySelect/CurrencySelect'
import Menu, { type MenuItem } from '../ui/Menu/Menu'
import styles from './CategoryEditModal.module.css'

interface CategoryEditModalProps {
  open: boolean
  category: Category | null  // null → "add" mode
  onClose: () => void
}

interface Draft {
  name: string
  budgetExpr: string
  spentExpr: string
  /** Currency budget and spent are in; changing it relabels, never converts. */
  currency: string
  note: string
  noteVisible: boolean
  done: boolean
  ongoing: boolean
}

function exprFromCategory(expr: string | undefined, num: number): string {
  if (expr) return expr
  return num ? String(num) : ''
}

/**
 * Keep the raw text as a formula for any arithmetic OR currency entry ("50+10",
 * "10 AMD"), so it stays editable and re-evaluates; a plain number is stored as
 * just the number. Returns undefined to clear the stored formula.
 */
function keepExpr(raw: string): string | undefined {
  return hasMathOps(raw) || hasCurrencyToken(raw) ? raw.trim() : undefined
}

/** `defaultCurrency` (the display currency) tags a brand-new category. */
function draftFrom(category: Category | null, defaultCurrency: string): Draft {
  if (!category) {
    return {
      name: '',
      budgetExpr: '',
      spentExpr: '',
      currency: defaultCurrency,
      note: '',
      noteVisible: false,
      done: false,
      ongoing: false,
    }
  }
  const note = category.note ?? ''
  return {
    name: category.name,
    budgetExpr: exprFromCategory(category.budgetExpr, category.budget),
    spentExpr: exprFromCategory(category.spentExpr, category.spent),
    currency: category.currency,
    note,
    noteVisible: note.length > 0,
    done: category.done,
    ongoing: category.ongoing ?? false,
  }
}

interface MoreMenuProps {
  canAllSpent: boolean
  canDelete: boolean
  onAllSpent: () => void
  onAddNote: () => void
  onDelete: () => void
}

function MoreMenu({ canAllSpent, canDelete, onAllSpent, onAddNote, onDelete }: MoreMenuProps) {
  const items: MenuItem[] = [
    { label: 'Complete', onSelect: onAllSpent, disabled: !canAllSpent },
    { label: 'Add note', onSelect: onAddNote },
  ]
  if (canDelete) items.push({ label: 'Delete', onSelect: onDelete, danger: true })
  return (
    <Menu
      className={styles.moreWrap}
      items={items}
      placement="top"
      align="start"
      trigger={props => (
        <Button
          variant="ghost"
          aria-label="More actions"
          title="More actions"
          className={styles.moreBtn}
          {...props}
        >
          <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
        </Button>
      )}
    />
  )
}

export default function CategoryEditModal({ open, category, onClose }: CategoryEditModalProps) {
  const displayCurrency = useBudgetStore(s => s.currency)
  const isEdit = category !== null
  const [draft, setDraft] = useState<Draft>(() => draftFrom(category, displayCurrency))
  const noteRef = useRef<HTMLTextAreaElement>(null)
  // Formulas evaluate into the category's own currency.
  const rate = useRateResolver(draft.currency)
  const symbol = money(draft.currency).symbol

  useEffect(() => {
    // Snapshot the display currency at open — a sync landing mid-edit must not
    // re-tag the draft.
    if (open) setDraft(draftFrom(category, useBudgetStore.getState().currency))
  }, [open, category])

  const budgetEval = evaluateLenient(draft.budgetExpr, { rate })
  const spentEval = evaluateLenient(draft.spentExpr, { rate })
  const budgetInvalid = !budgetEval.ok
  const spentInvalid = !spentEval.ok

  const submit = () => {
    const name = draft.name.trim()
    if (!name) return
    if (!budgetEval.ok || !spentEval.ok) return
    const note = draft.note.trim()
    const payload = {
      name,
      budget: budgetEval.value,
      budgetExpr: keepExpr(draft.budgetExpr),
      spent: spentEval.value,
      spentExpr: keepExpr(draft.spentExpr),
      currency: draft.currency,
      note: note || undefined,
      done: draft.done,
      ongoing: draft.ongoing,
    }
    const store = useBudgetStore.getState()
    if (isEdit && category) {
      store.updateCategory(category.id, payload)
    } else {
      store.addCategory(payload)
    }
    onClose()
  }

  // No blocking confirm — delete right away and offer Undo in a toast
  // (the delete is a tombstone, so undo simply restores the row).
  const onDelete = () => {
    if (!isEdit || !category) return
    const { id, name } = category
    useBudgetStore.getState().deleteCategory(id)
    onClose()
    showToast({
      message: `Deleted “${name}”`,
      actionLabel: 'Undo',
      onAction: () => useBudgetStore.getState().restoreCategory(id),
    })
  }

  const onAllSpent = () => {
    setDraft(d => ({ ...d, spentExpr: d.budgetExpr || '0' }))
  }

  const onAddNote = () => {
    setDraft(d => ({ ...d, noteVisible: true }))
    setTimeout(() => noteRef.current?.focus(), 0)
  }

  const allSpentReady = budgetEval.ok && budgetEval.value > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit expense' : 'Add expense'}
      footer={
        <>
          <MoreMenu
            canAllSpent={allSpentReady}
            canDelete={isEdit}
            onAllSpent={onAllSpent}
            onAddNote={onAddNote}
            onDelete={onDelete}
          />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!draft.name.trim() || budgetInvalid || spentInvalid}
          >
            {isEdit ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <TextField
          label="Name"
          placeholder="e.g. Rent, Internet, Gym"
          value={draft.name}
          autoFocus
          fullWidth
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
        />

        <div className={styles.numRow}>
          <MathField
            label="Budget"
            placeholder="0"
            prefix={symbol}
            currency={draft.currency}
            alignRight
            fullWidth
            value={draft.budgetExpr}
            onChange={v => setDraft(d => ({ ...d, budgetExpr: v }))}
          />
          <MathField
            label="Spent"
            placeholder="0"
            prefix={symbol}
            currency={draft.currency}
            alignRight
            fullWidth
            value={draft.spentExpr}
            onChange={v => setDraft(d => ({ ...d, spentExpr: v }))}
          />
        </div>

        <CurrencySelect
          label="Currency"
          value={draft.currency}
          onChange={code => setDraft(d => ({ ...d, currency: code }))}
        />

        {draft.noteVisible && (
          <label className={styles.noteWrap}>
            <span className={styles.noteLabel}>Note</span>
            <textarea
              ref={noteRef}
              className={styles.noteInput}
              value={draft.note}
              onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
              rows={3}
              placeholder="Anything you want to remember"
            />
          </label>
        )}

        <div className={styles.ongoingRow}>
          <Toggle
            checked={draft.ongoing}
            onChange={next => setDraft(d => ({ ...d, ongoing: next }))}
            label="Ongoing expense"
            description="Spent gradually across the pay period — shows a spending-pace bar."
          />
        </div>

        {(budgetInvalid || spentInvalid) && (
          <div className={styles.errorRow}>
            Invalid expression in {budgetInvalid ? 'Budget' : 'Spent'}
          </div>
        )}
      </div>
    </Modal>
  )
}
