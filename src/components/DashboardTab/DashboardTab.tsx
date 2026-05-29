import { useMemo } from 'react'
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
import { fmt, pluralDays } from '../../lib/utils'
import Inputs from './Inputs'
import MetricCard from './MetricCard'
import styles from './DashboardTab.module.css'

/**
 * Mirrors `js/dashboard.js renderPerDayMetric` — returns the props a MetricCard
 * needs to render either the "ok" per-day value or the "deficit" warning.
 */
function perDayCardProps(
  result: BudgetResult,
  normalSub: string,
  baseVariant: 'yellow' | 'green' | 'blue',
  featured = false,
): {
  variant: 'featured' | 'green' | 'yellow' | 'blue' | 'deficit'
  symbol: string
  value: string
  subtitle: string
} {
  if (result.kind === 'ok') {
    return {
      variant: featured ? 'featured' : baseVariant,
      symbol: '€',
      value: fmt(result.perDay),
      subtitle: normalSub,
    }
  }
  return {
    variant: 'deficit',
    symbol: '−€',
    value: fmt(result.deficit),
    subtitle: `Deficit · ${result.daysNoSpend} ${pluralDays(result.daysNoSpend)} of no spending`,
  }
}

export default function DashboardTab() {
  const bank = useBudgetStore(s => s.bank)
  const incomeDay = useBudgetStore(s => s.incomeDay)
  const categories = useBudgetStore(s => s.categories)
  const savings = useBudgetStore(s => s.savings)

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
      green: perDayGreen(b, oblig, savingsPool, daysLeft),
      all: perDayAll(b, oblig, daysLeft),
    }
  }, [bank, incomeDay, categories, savings])

  const yellowProps = perDayCardProps(
    m.yellow,
    `Without touching savings · ${m.daysLeft} ${pluralDays(m.daysLeft)} until income`,
    'yellow',
    /* featured */ true,
  )
  const greenProps = perDayCardProps(
    m.green,
    '+€200 to savings by month end',
    'green',
  )
  const allProps = perDayCardProps(m.all, 'Including savings', 'blue')

  return (
    <section
      className={styles.section}
      id="tab-dashboard"
      role="tabpanel"
      aria-labelledby="tab-btn-dashboard"
      tabIndex={0}
    >
      <Inputs />

      <div className={styles.metrics}>
        <MetricCard
          id="metric-yellow"
          variant={yellowProps.variant}
          label="Daily spend to break even"
          symbol={yellowProps.symbol}
          value={yellowProps.value}
          subtitle={yellowProps.subtitle}
        />
        <MetricCard
          id="metric-green"
          variant={greenProps.variant}
          label="Green zone (per day)"
          symbol={greenProps.symbol}
          value={greenProps.value}
          subtitle={greenProps.subtitle}
        />
        <MetricCard
          id="metric-all"
          variant={allProps.variant}
          label="Spend everything (per day)"
          symbol={allProps.symbol}
          value={allProps.value}
          subtitle={allProps.subtitle}
        />

        <MetricCard
          label="Total balance"
          value={fmt(m.bank)}
          subtitle="Income + savings"
        />
        <MetricCard
          label="Without savings"
          value={fmt(m.withoutSavings)}
          subtitle="This period only"
        />
        <MetricCard
          label="After fixed expenses, no savings"
          value={fmt(m.afterObligNoSavings)}
          subtitle="Free money this period"
        />
        <MetricCard
          label="After fixed expenses, total"
          value={fmt(m.afterObligAll)}
          subtitle="Including savings"
        />
      </div>

      <div className={styles.hint}>
        <strong>How it's calculated:</strong> "Balance" is everything you have
        right now (income + carry-over from last month). Days are counted
        until the next income day — if today is on or past it, we count to
        next month. Fixed expenses: we subtract what's{' '}
        <strong>still left to pay</strong> (budget minus already spent). The
        "paid" checkbox excludes a category from the deduction — that money
        has already left the account.
      </div>
    </section>
  )
}
