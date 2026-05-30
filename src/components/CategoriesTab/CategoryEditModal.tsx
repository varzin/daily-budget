import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
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
  done: boolean
}

function exprFromCategory(expr: string | undefined, num: number): string {
  if (expr) return expr
  return num ? String(num) : ''
}

function draftFrom(category: Category | null): Draft {
  if (!category) return { name: '', budgetExpr: '', spentExpr: '', done: false }
  return {
    name: category.name,
    budgetExpr: exprFromCategory(category.budgetExpr, category.budget),
    spentExpr: exprFromCategory(category.spentExpr, category.spent),
    done: category.done,
  }
}

export default function CategoryEditModal({ open, category, onClose }: CategoryEditModalProps) {
  const isEdit = category !== null
  const [draft, setDraft] = useState<Draft>(() => draftFrom(category))

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
    const payload = {
      name,
      budget: budgetEval.value,
      budgetExpr: hasMathOps(draft.budgetExpr) ? draft.budgetExpr.trim() : undefined,
      spent: spentEval.value,
      spentExpr: hasMathOps(draft.spentExpr) ? draft.spentExpr.trim() : undefined,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit expense' : 'Add expense'}
      footer={
        <>
          {isEdit && (
            <Button
              variant="danger"
              onClick={onDelete}
              className={styles.deleteBtn}
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 size={18} strokeWidth={2} />
            </Button>
          )}
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

        <div className={styles.actionsRow}>
          {(budgetInvalid || spentInvalid) && (
            <span className={styles.spentError}>
              Invalid expression in {budgetInvalid ? 'Budget' : 'Spent'}
            </span>
          )}
          <button
            type="button"
            className={styles.allSpent}
            disabled={budgetInvalid || !budgetEval.ok || budgetEval.value === 0}
            onClick={() =>
              setDraft(d => ({ ...d, spentExpr: d.budgetExpr || '0' }))
            }
          >
            All spent
          </button>
        </div>
      </div>
    </Modal>
  )
}
