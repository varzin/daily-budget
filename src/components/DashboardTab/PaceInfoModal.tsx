import type { Money } from '../../lib/currency'
import { isOnPlan, type PaceExplanation, type PaceGoal, type PaceSide, type PaceTerm } from '../../lib/math'
import { pluralDays } from '../../lib/utils'
import Modal from '../ui/Modal/Modal'
import styles from './PaceInfoModal.module.css'

interface PaceInfoModalProps {
  open: boolean
  onClose: () => void
  explanation: PaceExplanation | null
  money: Money
  /** Display units per 1 € — the "on plan" band (see isOnPlan). */
  scale: number
}

const TERM_LABELS: Record<PaceTerm['key'], string> = {
  income: 'Monthly income',
  plannedFixed: 'Fixed expenses (full plan)',
  cushion: 'Cushion',
  savings: 'Savings',
  balance: 'Current balance',
  fixedLeft: 'Fixed expenses left',
}

const GOAL_TEXT: Record<PaceGoal, string> = {
  grow: 'Grow savings — land on your next income day with savings and the cushion untouched.',
  keep: 'Keep savings — land on your next income day with savings untouched.',
  spend: 'Spend savings — savings may be spent evenly too; land on zero.',
}

function Side({
  title,
  side,
  daysLabel,
  money,
}: {
  title: string
  side: PaceSide
  daysLabel: string
  money: Money
}) {
  const amt = (n: number) => `${money.symbol}${money.fmt(n)}`
  return (
    <section className={styles.side}>
      <h3 className={styles.sideTitle}>{title}</h3>
      <dl className={styles.terms}>
        {side.terms.map((t, i) => (
          <div key={t.key} className={styles.term}>
            <dt>{TERM_LABELS[t.key]}</dt>
            <dd>
              {i > 0 && <span className={styles.op}>{t.sign > 0 ? '+' : '−'}</span>}
              {amt(t.amount)}
            </dd>
          </div>
        ))}
        <div className={styles.term}>
          <dt>{daysLabel}</dt>
          <dd>
            <span className={styles.op}>÷</span>
            {side.days} {pluralDays(side.days)}
          </dd>
        </div>
        <div className={`${styles.term} ${styles.result}`}>
          <dt>Per day</dt>
          <dd>
            <span className={styles.op}>=</span>
            {amt(side.perDay)}
          </dd>
        </div>
      </dl>
    </section>
  )
}

/**
 * "How it's calculated" for the pace pill: the planned and the actual daily
 * rate for the selected tab's goal, term by term on the user's own figures,
 * and how their gap over the days left becomes the pill's amount
 * (lib/math.ts explainPace).
 */
export default function PaceInfoModal({ open, onClose, explanation, money, scale }: PaceInfoModalProps) {
  const amt = (n: number) => `${money.symbol}${money.fmt(n)}`
  const e = explanation
  const onPlan = e ? isOnPlan(e.ahead, scale) : false
  const verdict = !e
    ? ''
    : onPlan
      ? 'On plan.'
      : e.ahead > 0
        ? 'Ahead of plan — extra you could spend before your next income day and still land on plan.'
        : 'Behind plan — spend this much less before your next income day to get back on plan.'

  return (
    <Modal open={open} onClose={onClose} title="Pace vs plan">
      {e && (
        <div className={styles.body}>
          <p className={styles.goal}>{GOAL_TEXT[e.goal]}</p>

          <Side title="Plan" side={e.plan} daysLabel="Cycle length" money={money} />
          <Side title="Actual" side={e.actual} daysLabel="Days left" money={money} />

          <section className={styles.side}>
            <h3 className={styles.sideTitle}>Pace</h3>
            <p className={styles.formula}>
              ({amt(e.actual.perDay)} − {amt(e.plan.perDay)}) × {e.actual.days}{' '}
              {pluralDays(e.actual.days)} ={' '}
              <strong className={onPlan ? '' : e.ahead > 0 ? styles.good : styles.bad}>
                {e.ahead > 0 ? '+' : e.ahead < 0 ? '−' : ''}
                {amt(Math.abs(e.ahead))}
              </strong>
            </p>
            <p className={styles.verdict}>{verdict}</p>
          </section>
        </div>
      )}
    </Modal>
  )
}
