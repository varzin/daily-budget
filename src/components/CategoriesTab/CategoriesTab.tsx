import { useMemo } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { obligatoryTotal } from '../../lib/math'
import { fmt } from '../../lib/utils'
import CategoryRow from './CategoryRow'
import AddCategoryForm from './AddCategoryForm'
import styles from './CategoriesTab.module.css'

export default function CategoriesTab() {
  const categories = useBudgetStore(s => s.categories)
  const total = useMemo(() => obligatoryTotal(categories), [categories])

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
        <div className={styles.meta}>
          Total to deduct: <span id="oblig-total">€{fmt(total)}</span>
        </div>
      </div>

      <div className={styles.cats}>
        {categories.map(cat => (
          <CategoryRow key={cat.id} category={cat} />
        ))}
      </div>

      <AddCategoryForm />

      <div className={styles.hint}>
        <strong>Logic:</strong> we subtract what's{' '}
        <strong>still left to pay</strong>:{' '}
        <span className={styles.mono}>budget − spent</span>. The "paid"
        checkbox means "that money already left the account" — the category
        is no longer deducted (otherwise double-counted). Remember to update
        "Current balance" after paying.
      </div>
    </section>
  )
}
