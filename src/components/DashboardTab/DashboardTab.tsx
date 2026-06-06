import { useMemo, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import {
  obligatoryTotal,
  currentSavingsTotal,
  computeDaysLeft,
  perDayYellow,
  perDayGreen,
  perDayAll,
  type BudgetResult,
} from '../../lib/math'
import { fmt, fmtAmount, pluralDays } from '../../lib/utils'
import Modal from '../ui/Modal/Modal'
import Inputs from './Inputs'
import MetricCard from './MetricCard'
import styles from './DashboardTab.module.css'

interface BreakdownItem {
  key: string
  label: string
  value: number
  help: string
}

function perDayCardProps(
  result: BudgetResult,
  normalSub: string,
  tone: 'yellow' | 'green' | 'blue',
  featured = false,
): {
  featured: boolean
  tone: 'yellow' | 'green' | 'blue' | 'deficit'
  symbol: string
  value: string
  subtitle: string
} {
  if (result.kind === 'ok') {
    return {
      featured,
      tone,
      symbol: '€',
      value: fmt(result.perDay),
      subtitle: normalSub,
    }
  }
  return {
    featured,
    tone: 'deficit',
    symbol: '−€',
    value: fmt(result.deficit),
    subtitle: `Deficit · ${result.daysNoSpend} ${pluralDays(result.daysNoSpend)} of no spending`,
  }
}

export default function DashboardTab() {
  const bank = useBudgetStore(s => s.bank)
  const incomeDay = useBudgetStore(s => s.incomeDay)
  const buffer = useBudgetStore(s => s.buffer)
  const categories = useBudgetStore(s => s.categories)
  const savings = useBudgetStore(s => s.savings)
  const [helpItem, setHelpItem] = useState<BreakdownItem | null>(null)

  const m = useMemo(() => {
    const b = Number(bank) || 0
    const oblig = obligatoryTotal(categories)
    const savingsPool = currentSavingsTotal(savings)
    const daysLeft = computeDaysLeft(Number(incomeDay))

    return {
      bank: b,
      oblig,
      savingsPool,
      daysLeft,
      withoutSavings: b - savingsPool,
      afterObligNoSavings: b - oblig - savingsPool,
      afterObligAll: b - oblig,
      yellow: perDayYellow(b, oblig, savingsPool, daysLeft),
      green: perDayGreen(b, oblig, savingsPool, daysLeft, buffer),
      all: perDayAll(b, oblig, daysLeft),
    }
  }, [bank, incomeDay, buffer, categories, savings])

  const yellowProps = perDayCardProps(
    m.yellow,
    `Without touching savings · ${m.daysLeft} ${pluralDays(m.daysLeft)} until income`,
    'yellow',
  )
  const greenProps = perDayCardProps(
    m.green,
    buffer > 0
      ? `+€${fmtAmount(buffer)} to savings by month end`
      : 'Break even by month end',
    'green',
    /* featured */ true,
  )
  const allProps = perDayCardProps(m.all, 'Including savings', 'blue')

  // Ordered from raw building blocks → derived "free to spend" sums.
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
              id="metric-green"
              featured={greenProps.featured}
              tone={greenProps.tone}
              label="Green zone (per day)"
              symbol={greenProps.symbol}
              value={greenProps.value}
              subtitle={greenProps.subtitle}
            />
            <MetricCard
              id="metric-yellow"
              featured={yellowProps.featured}
              tone={yellowProps.tone}
              label="Daily spend to break even"
              symbol={yellowProps.symbol}
              value={yellowProps.value}
              subtitle={yellowProps.subtitle}
            />
            <MetricCard
              id="metric-all"
              featured={allProps.featured}
              tone={allProps.tone}
              label="Spend everything (per day)"
              symbol={allProps.symbol}
              value={allProps.value}
              subtitle={allProps.subtitle}
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
                  <dd>€{fmt(item.value)}</dd>
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
