import type { ChangeEvent } from 'react'
import type { Category } from '../../types'
import { useBudgetStore } from '../../store/budgetStore'
import { categoryAmount } from '../../lib/math'
import { fmt } from '../../lib/utils'
import styles from './CategoryRow.module.css'

interface CategoryRowProps {
  category: Category
}

function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

export default function CategoryRow({ category }: CategoryRowProps) {
  const { id, name, budget, spent, done } = category

  const onName = (e: ChangeEvent<HTMLInputElement>) => {
    useBudgetStore.getState().updateCategory(id, { name: e.target.value })
  }

  const onNumber = (field: 'budget' | 'spent') => (e: ChangeEvent<HTMLInputElement>) => {
    // Mirror original behaviour: empty input → 0, otherwise parseFloat.
    const raw = e.target.value
    const parsed = raw === '' ? 0 : parseFloat(raw) || 0
    useBudgetStore.getState().updateCategory(id, { [field]: parsed })
  }

  const onToggle = () => useBudgetStore.getState().toggleCategoryDone(id)

  const onDelete = () => {
    if (window.confirm('Delete category?')) {
      useBudgetStore.getState().deleteCategory(id)
    }
  }

  const remaining = categoryAmount(category)

  return (
    <div className={cx(styles.cat, done && styles.done)}>
      <div
        className={cx(styles.check, done && styles.checked)}
        onClick={onToggle}
        role="checkbox"
        aria-checked={done}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            onToggle()
          }
        }}
      />
      <div className={styles.catNameWrap}>
        <input
          className={styles.catName}
          value={name}
          onChange={onName}
          placeholder="Name"
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
            value={budget || ''}
            onChange={onNumber('budget')}
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
            value={spent || ''}
            onChange={onNumber('spent')}
          />
        </div>
        <div className={styles.numField}>
          <label>Left</label>
          <div className={styles.catRemaining}>€{fmt(remaining)}</div>
        </div>
      </div>
      <button
        className={styles.catDel}
        onClick={onDelete}
        title="Delete"
        type="button"
        aria-label="Delete category"
      >
        ×
      </button>
    </div>
  )
}
