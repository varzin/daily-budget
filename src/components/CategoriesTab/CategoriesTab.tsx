import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import { obligatoryTotal, categoryAmount } from '../../lib/math'
import { fmt } from '../../lib/utils'
import Button from '../ui/Button/Button'
import CategoryEditModal from './CategoryEditModal'
import type { Category } from '../../types'
import styles from './CategoriesTab.module.css'

type ModalState =
  | { kind: 'closed' }
  | { kind: 'add' }
  | { kind: 'edit'; category: Category }

export default function CategoriesTab() {
  const categories = useBudgetStore(s => s.categories)
  const total = useMemo(() => obligatoryTotal(categories), [categories])
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' })

  const openAdd = () => setModal({ kind: 'add' })
  const openEdit = (category: Category) => setModal({ kind: 'edit', category })
  const close = () => setModal({ kind: 'closed' })

  return (
    <section
      className={styles.section}
      id="tab-obligatory"
      role="tabpanel"
      aria-labelledby="tab-btn-obligatory"
      tabIndex={0}
    >
      <div className={styles.sectionHead}>
        <h2>Fixed expenses</h2>
      </div>

      {categories.length === 0 ? (
        <div className={styles.empty}>
          No fixed expenses yet. Add rent, bills, subscriptions —
          anything you owe every month.
        </div>
      ) : (
        <div className={styles.grid}>
          <div className={styles.header}>
            <span>Category</span>
            <span>Budget</span>
            <span>Spent</span>
            <span>Left</span>
          </div>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.row} ${cat.done ? styles.rowDone : ''}`}
              onClick={() => openEdit(cat)}
              aria-label={`Edit ${cat.name}`}
            >
              <span className={styles.name}>
                {cat.name}
                {cat.done && <span className={styles.badge}>paid</span>}
              </span>
              <span className={styles.num}>{fmt(cat.budget || 0)}</span>
              <span className={styles.num}>{fmt(cat.spent || 0)}</span>
              <span className={styles.left}>{fmt(categoryAmount(cat))}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <Button variant="primary" onClick={openAdd}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Add expense</span>
        </Button>
        <span className={styles.totalValue}>€{fmt(total)}</span>
      </div>

      <aside className={styles.hint}>
        <p className={styles.hintEyebrow}>Logic</p>
        <p>
          We subtract what's <strong>still left to pay</strong> (
          <span className={styles.mono}>budget − spent</span>). Marking a
          category <em>paid</em> means the money already left your account, so
          it's no longer deducted — remember to update <em>Current balance</em>{' '}
          after paying.
        </p>
      </aside>

      <CategoryEditModal
        open={modal.kind !== 'closed'}
        category={modal.kind === 'edit' ? modal.category : null}
        onClose={close}
      />
    </section>
  )
}
