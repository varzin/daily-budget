import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { fmt } from '../../lib/utils'
import styles from './AddCategoryForm.module.css'

function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

export default function AddCategoryForm() {
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [spent, setSpent] = useState('')
  const [done, setDone] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const budgetNum = parseFloat(budget) || 0
  const spentNum = parseFloat(spent) || 0
  // Mirror `updateNewRemaining` from js/categories.js: done → 0, else max(0, b - s).
  const remaining = done ? 0 : Math.max(0, budgetNum - spentNum)

  const reset = () => {
    setName('')
    setBudget('')
    setSpent('')
    setDone(false)
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      nameRef.current?.focus()
      return
    }
    useBudgetStore.getState().addCategory({
      name: trimmed,
      budget: budgetNum,
      spent: spentNum,
      done,
    })
    reset()
    nameRef.current?.focus()
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  const onChangeStr = (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
  }

  return (
    <div className={styles.catNew}>
      <div
        className={cx(styles.check, done && styles.checked)}
        onClick={() => setDone(d => !d)}
        role="checkbox"
        aria-checked={done}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            setDone(d => !d)
          }
        }}
      />
      <div className={styles.catNameWrap}>
        <input
          ref={nameRef}
          className={styles.catName}
          placeholder="Category name"
          autoComplete="off"
          value={name}
          onChange={onChangeStr(setName)}
          onKeyDown={onKey}
        />
      </div>
      <div className={styles.numsRow}>
        <div className={styles.numField}>
          <label>Budget</label>
          <input
            className={styles.catInput}
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            value={budget}
            onChange={onChangeStr(setBudget)}
            onKeyDown={onKey}
          />
        </div>
        <div className={styles.numField}>
          <label>Spent</label>
          <input
            className={cx(styles.catInput, styles.spent)}
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            value={spent}
            onChange={onChangeStr(setSpent)}
            onKeyDown={onKey}
          />
        </div>
        <div className={styles.numField}>
          <label>Left</label>
          <div className={styles.catRemaining}>€{fmt(remaining)}</div>
        </div>
      </div>
      <button
        className={styles.catAdd}
        onClick={submit}
        title="Add"
        type="button"
        aria-label="Add category"
      >
        +
      </button>
    </div>
  )
}
