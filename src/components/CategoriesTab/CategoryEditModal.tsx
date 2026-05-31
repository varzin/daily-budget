import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { Category } from '../../types'
import { useBudgetStore } from '../../store/budgetStore'
import { evaluateLenient, hasMathOps } from '../../lib/evalExpr'
import Modal from '../ui/Modal/Modal'
import Button from '../ui/Button/Button'
import TextField from '../ui/TextField/TextField'
import MathField from '../ui/MathField/MathField'
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
  note: string
  noteVisible: boolean
  done: boolean
}

function exprFromCategory(expr: string | undefined, num: number): string {
  if (expr) return expr
  return num ? String(num) : ''
}

function draftFrom(category: Category | null): Draft {
  if (!category) {
    return { name: '', budgetExpr: '', spentExpr: '', note: '', noteVisible: false, done: false }
  }
  const note = category.note ?? ''
  return {
    name: category.name,
    budgetExpr: exprFromCategory(category.budgetExpr, category.budget),
    spentExpr: exprFromCategory(category.spentExpr, category.spent),
    note,
    noteVisible: note.length > 0,
    done: category.done,
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

  const run = (fn: () => void) => () => { setOpen(false); fn() }

  return (
    <div className={styles.moreWrap} ref={wrapRef}>
      <Button
        variant="ghost"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        title="More actions"
        className={styles.moreBtn}
      >
        <MoreHorizontal size={18} strokeWidth={2} />
      </Button>
      {open && (
        <div role="menu" className={styles.popover}>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            disabled={!canAllSpent}
            onClick={run(onAllSpent)}
          >
            All spent
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={run(onAddNote)}
          >
            Add note
          </button>
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

export default function CategoryEditModal({ open, category, onClose }: CategoryEditModalProps) {
  const isEdit = category !== null
  const [draft, setDraft] = useState<Draft>(() => draftFrom(category))
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) setDraft(draftFrom(category))
  }, [open, category])

  const budgetEval = evaluateLenient(draft.budgetExpr)
  const spentEval = evaluateLenient(draft.spentExpr)
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
      budgetExpr: hasMathOps(draft.budgetExpr) ? draft.budgetExpr.trim() : undefined,
      spent: spentEval.value,
      spentExpr: hasMathOps(draft.spentExpr) ? draft.spentExpr.trim() : undefined,
      note: note || undefined,
      done: draft.done,
    }
    const store = useBudgetStore.getState()
    if (isEdit && category) {
      store.updateCategory(category.id, payload)
    } else {
      store.addCategory(payload)
    }
    onClose()
  }

  const onDelete = () => {
    if (!isEdit || !category) return
    if (window.confirm(`Delete "${category.name}"?`)) {
      useBudgetStore.getState().deleteCategory(category.id)
      onClose()
    }
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
            prefix="€"
            alignRight
            fullWidth
            value={draft.budgetExpr}
            onChange={v => setDraft(d => ({ ...d, budgetExpr: v }))}
          />
          <MathField
            label="Spent"
            placeholder="0"
            prefix="€"
            alignRight
            fullWidth
            value={draft.spentExpr}
            onChange={v => setDraft(d => ({ ...d, spentExpr: v }))}
          />
        </div>

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

        {(budgetInvalid || spentInvalid) && (
          <div className={styles.errorRow}>
            Invalid expression in {budgetInvalid ? 'Budget' : 'Spent'}
          </div>
        )}
      </div>
    </Modal>
  )
}
