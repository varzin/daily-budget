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
  )
  const greenProps = perDayCardProps(
    m.green,
    '+€200 to savings by month end',
    'green',
    /* featured */ true,
  )
  const allProps = perDayCardProps(m.all, 'Including savings', 'blue')

  const hasData = m.bank > 0

  return (
    <section
      className={styles.section}
      id="tab-dashboard"
      role="tabpanel"
      aria-labelledby="tab-btn-dashboard"
      tabIndex={0}
    >
      <Inputs />

      {!hasData ? (
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

          <details className={styles.breakdown}>
            <summary className={styles.breakdownSummary}>
              <span>Show breakdown</span>
              <span className={styles.breakdownCaret} aria-hidden="true">+</span>
            </summary>
            <dl className={styles.breakdownList}>
              <div className={styles.breakdownRow}>
                <dt>Without savings</dt>
                <dd>€{fmt(m.withoutSavings)}</dd>
              </div>
              <div className={styles.breakdownRow}>
                <dt>After fixed expenses, no savings</dt>
                <dd>€{fmt(m.afterObligNoSavings)}</dd>
              </div>
              <div className={styles.breakdownRow}>
                <dt>After fixed expenses, total</dt>
                <dd>€{fmt(m.afterObligAll)}</dd>
              </div>
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
    </section>
  )
}
