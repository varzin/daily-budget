import { useEffect, useState } from 'react'
import type { Category } from '../../types'
import { useBudgetStore } from '../../store/budgetStore'
import Modal from '../ui/Modal/Modal'
import Button from '../ui/Button/Button'
import TextField from '../ui/TextField/TextField'
import Toggle from '../ui/Toggle/Toggle'
import styles from './CategoryEditModal.module.css'

interface CategoryEditModalProps {
  open: boolean
  category: Category | null  // null → "add" mode
  onClose: () => void
}

interface Draft {
  name: string
  budget: string
  spent: string
  done: boolean
}

function draftFrom(category: Category | null): Draft {
  if (!category) return { name: '', budget: '', spent: '', done: false }
  return {
    name: category.name,
    budget: category.budget ? String(category.budget) : '',
    spent: category.spent ? String(category.spent) : '',
    done: category.done,
  }
}

export default function CategoryEditModal({ open, category, onClose }: CategoryEditModalProps) {
  const isEdit = category !== null
  const [draft, setDraft] = useState<Draft>(() => draftFrom(category))

  useEffect(() => {
    if (open) setDraft(draftFrom(category))
  }, [open, category])

  const parseNum = (s: string) => (s === '' ? 0 : parseFloat(s) || 0)

  const submit = () => {
    const name = draft.name.trim()
    if (!name) return
    const payload = {
      name,
      budget: parseNum(draft.budget),
      spent: parseNum(draft.spent),
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
            <Button variant="danger" onClick={onDelete} className={styles.deleteBtn}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!draft.name.trim()}>
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
          <TextField
            label="Budget"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            prefix="€"
            alignRight
            fullWidth
            value={draft.budget}
            onChange={e => setDraft(d => ({ ...d, budget: e.target.value }))}
          />
          <TextField
            label="Spent"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            prefix="€"
            alignRight
            fullWidth
            value={draft.spent}
            onChange={e => setDraft(d => ({ ...d, spent: e.target.value }))}
          />
        </div>

        <div className={styles.toggleBlock}>
          <Toggle
            checked={draft.done}
            onChange={next => setDraft(d => ({ ...d, done: next }))}
            label="Already paid"
            description="Excluded from this period's deduction — money already left the account."
          />
        </div>
      </div>
    </Modal>
  )
}
