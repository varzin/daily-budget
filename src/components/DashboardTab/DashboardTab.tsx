import { useMemo, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import {
  obligatoryTotal,
  currentSavingsTotal,
  computeDaysLeft,
  computeSituation,
  type Situation,
} from '../../lib/math'
import { pluralDays } from '../../lib/utils'
import { useMoney } from '../../lib/useMoney'
import type { Money } from '../../lib/currency'
import Modal from '../ui/Modal/Modal'
import Inputs from './Inputs'
import MetricCard from './MetricCard'
import styles from './DashboardTab.module.css'

interface BreakdownItem {
  key: string
  label: string
  value: number
  help: string
  /** Render a "/day" unit — used for the three daily-spend figures. */
  perDay?: boolean
}

interface CardProps {
  tone: 'teal' | 'green' | 'orange' | 'deficit'
  label: string
  symbol: string
  value: string
  subtitle: string
}

/** Map a situational state to the single widget's tone, headline and copy. */
function situationProps(s: Situation, buffer: number, daysLeft: number, money: Money): CardProps {
  const until = `${daysLeft} ${pluralDays(daysLeft)} until income`
  const perDay = s.result.kind === 'ok' ? money.fmt(s.result.perDay) : '0'

  switch (s.state) {
    case 'ahead':
      return {
        tone: 'teal',
        label: 'Daily budget',
        symbol: money.symbol,
        value: perDay,
        subtitle:
          buffer > 0
            ? `Ahead — keeps your ${money.symbol}${money.fmtAmount(buffer)} cushion · ${until}`
            : `You're ahead of plan · ${until}`,
      }
    case 'onTrack':
      return {
        tone: 'green',
        label: 'Daily budget',
        symbol: money.symbol,
        value: perDay,
        subtitle: `Savings stay untouched · ${until}`,
      }
    case 'intoSavings':
      return {
        tone: 'orange',
        label: 'Daily budget',
        symbol: money.symbol,
        value: perDay,
        subtitle: `Dips into savings · ${until}`,
      }
    case 'over': {
      const deficit = s.result.kind === 'deficit' ? s.result.deficit : 0
      const days = s.result.kind === 'deficit' ? s.result.daysNoSpend : daysLeft
      return {
        tone: 'deficit',
        label: 'Over budget',
        symbol: `−${money.symbol}`,
        value: money.fmt(deficit),
        subtitle: `Deficit · ${days} ${pluralDays(days)} of no spending`,
      }
    }
  }
}

export default function DashboardTab() {
  const bank = useBudgetStore(s => s.bank)
  const incomeDay = useBudgetStore(s => s.incomeDay)
  const buffer = useBudgetStore(s => s.buffer)
  const categories = useBudgetStore(s => s.categories)
  const savings = useBudgetStore(s => s.savings)
  const money = useMoney()
  const [helpItem, setHelpItem] = useState<BreakdownItem | null>(null)

  const m = useMemo(() => {
    const b = Number(bank) || 0
    const oblig = obligatoryTotal(categories)
    const savingsPool = currentSavingsTotal(savings)
    const daysLeft = computeDaysLeft(Number(incomeDay))
    const perDay = (available: number) => (daysLeft > 0 ? available / daysLeft : 0)

    return {
      bank: b,
      oblig,
      savingsPool,
      daysLeft,
      withoutSavings: b - savingsPool,
      afterObligNoSavings: b - oblig - savingsPool,
      afterObligAll: b - oblig,
      greenPerDay: perDay(b - oblig - savingsPool - buffer),
      yellowPerDay: perDay(b - oblig - savingsPool),
      allPerDay: perDay(b - oblig),
      situation: computeSituation(b, oblig, savingsPool, buffer, daysLeft),
    }
  }, [bank, incomeDay, buffer, categories, savings])

  const card = situationProps(m.situation, buffer, m.daysLeft, money)

  // Ordered from raw building blocks → derived "free to spend" sums → the three
  // daily figures (kept here now that the dashboard shows a single widget).
  const breakdownItems: BreakdownItem[] = [
    {
      key: 'savings',
      label: 'Savings',
      value: m.savingsPool,
      help: 'Your set-aside pool — the sum of every "Saved this month" row in the Savings tab. It stays reserved, so the green and yellow daily budgets leave it untouched.',
    },
    {
      key: 'fixed',
      label: 'Fixed expenses',
      value: m.oblig,
      help: "What's still left to pay across your fixed expenses (budget − spent). Categories you've marked paid are excluded.",
    },
    {
      key: 'withoutSavings',
      label: 'Without savings',
      value: m.withoutSavings,
      help: 'Your balance with the savings pool set aside, before paying fixed expenses. Formula: balance − savings.',
    },
    {
      key: 'afterFixedNoSavings',
      label: 'After fixed expenses, no savings',
      value: m.afterObligNoSavings,
      help: 'Truly free to spend: your balance after removing both fixed expenses and savings. This drives the break-even daily figure. Formula: balance − fixed expenses − savings.',
    },
    {
      key: 'afterFixedTotal',
      label: 'After fixed expenses, total',
      value: m.afterObligAll,
      help: 'What\'s left after fixed expenses if you allow yourself to dip into savings. This drives the "spend everything" daily figure. Formula: balance − fixed expenses.',
    },
    {
      key: 'greenPerDay',
      label: 'Green zone (per day)',
      value: m.greenPerDay,
      perDay: true,
      help: 'What you can spend each day and still keep both your savings and your cushion by your next income day. Formula: (balance − fixed − savings − cushion) ÷ days left.',
    },
    {
      key: 'yellowPerDay',
      label: 'Break even (per day)',
      value: m.yellowPerDay,
      perDay: true,
      help: 'What you can spend each day while keeping savings whole (no cushion). Formula: (balance − fixed − savings) ÷ days left.',
    },
    {
      key: 'allPerDay',
      label: 'Spend everything (per day)',
      value: m.allPerDay,
      perDay: true,
      help: 'What you can spend each day if you allow yourself to dip into savings. Formula: (balance − fixed) ÷ days left.',
    },
  ]

  const hasData = m.bank > 0

  return (
    <section
      className={styles.section}
      id="tab-dashboard"
      role="tabpanel"
      aria-labelledby="tab-btn-dashboard"
      tabIndex={0}
    >
      {!hasData ? (
        <>
          <div className={styles.empty}>
            <p className={styles.emptyEyebrow}>Start here</p>
            <h2 className={styles.emptyTitle}>
              Enter your <em>current balance</em> to see your daily budget.
            </h2>
            <p className={styles.emptyBody}>
              We'll split it across the days until your next income — with and
              without dipping into savings.
            </p>
          </div>
          <Inputs />
        </>
      ) : (
        <>
          <div className={styles.metrics}>
            <MetricCard
              id="metric-daily"
              featured
              tone={card.tone}
              label={card.label}
              symbol={card.symbol}
              value={card.value}
              subtitle={card.subtitle}
            />
          </div>

          <Inputs />

          <details className={styles.breakdown}>
            <summary className={styles.breakdownSummary}>
              <span>Show breakdown</span>
              <span className={styles.breakdownCaret} aria-hidden="true">+</span>
            </summary>
            <dl className={styles.breakdownList}>
              {breakdownItems.map(item => (
                <div key={item.key} className={styles.breakdownRow}>
                  <dt className={styles.breakdownTerm}>
                    <span>{item.label}</span>
                    <button
                      type="button"
                      className={styles.helpBtn}
                      onClick={() => setHelpItem(item)}
                      aria-label={`What does "${item.label}" mean?`}
                      title="What does this mean?"
                    >
                      <HelpCircle size={15} strokeWidth={2} />
                    </button>
                  </dt>
                  <dd>
                    {money.symbol}{money.fmt(item.value)}
                    {item.perDay && <span className={styles.perDayUnit}> /day</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </details>

          <aside className={styles.hint}>
            <p className={styles.hintEyebrow}>How it's calculated</p>
            <p>
              <em>Balance</em> is income + carry-over from last month. Days
              are counted to the next income day. <em>Fixed expenses</em>{' '}
              subtract what's <strong>still left to pay</strong> (budget −
              spent); marking a category <em>paid</em> excludes it.
            </p>
          </aside>
        </>
      )}

      <Modal
        open={helpItem !== null}
        onClose={() => setHelpItem(null)}
        title={helpItem?.label}
      >
        <div className={styles.helpBody}>
          <p>{helpItem?.help}</p>
        </div>
      </Modal>
    </section>
  )
}
