import { useMemo, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { useBudgetStore } from '../../store/budgetStore'
import {
  obligatoryTotal,
  plannedObligatoryTotal,
  currentSavingsTotal,
  computeDaysLeft,
  computeCycleLength,
  computeSituation,
  computePace,
  availableWidgetModes,
  WIDGET_MODES,
  type Pace,
  type Situation,
  type WidgetMode,
} from '../../lib/math'
import { pluralDays } from '../../lib/utils'
import { useMoney } from '../../lib/useMoney'
import type { Money } from '../../lib/currency'
import Modal from '../ui/Modal/Modal'
import Segmented from '../ui/Segmented/Segmented'
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

/**
 * Pace indicator line (CLAUDE.md "Future ideas" #2): how far ahead/behind the
 * income-derived plan the user is, in money until the next income day. Null
 * when the indicator is off (monthly income not set in Settings).
 */
function paceText(pace: Pace | null, money: Money): string | null {
  if (!pace) return null
  if (Math.abs(pace.ahead) < 1) return 'On pace with your plan'
  const amount = `${money.symbol}${money.fmt(Math.abs(pace.ahead))}`
  return pace.ahead > 0 ? `≈ ${amount} ahead of plan` : `≈ ${amount} behind plan`
}

/** Tab captions for the widget's three spending modes, strictest → loosest. */
const MODE_LABELS: Record<WidgetMode, string> = {
  ahead: 'Grow savings',
  onTrack: 'Keep savings',
  intoSavings: 'Spend savings',
}

/** Card treatment for one selectable widget mode and its daily figure. */
function modeProps(
  mode: WidgetMode,
  perDay: number,
  buffer: number,
  daysLeft: number,
  money: Money,
): CardProps {
  const until = `Income in ${daysLeft} ${pluralDays(daysLeft)}`
  const value = money.fmt(perDay)

  switch (mode) {
    case 'ahead':
      return {
        tone: 'teal',
        label: 'Daily budget',
        symbol: money.symbol,
        value,
        // With no cushion configured the teal figure equals the green one,
        // so the subtitle honestly collapses to the same promise.
        subtitle:
          buffer > 0
            ? `Adds ${money.symbol}${money.fmtAmount(buffer)} to savings · ${until}`
            : `Savings untouched · ${until}`,
      }
    case 'onTrack':
      return {
        tone: 'green',
        label: 'Daily budget',
        symbol: money.symbol,
        value,
        subtitle: `Savings untouched · ${until}`,
      }
    case 'intoSavings':
      return {
        tone: 'orange',
        label: 'Daily budget',
        symbol: money.symbol,
        value,
        subtitle: `Spends savings · ${until}`,
      }
  }
}

/** The fourth, tab-less card: can't even cover fixed expenses. */
function deficitProps(s: Situation, daysLeft: number, money: Money): CardProps {
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

export default function DashboardTab() {
  const bank = useBudgetStore(s => s.bank)
  const incomeDay = useBudgetStore(s => s.incomeDay)
  const buffer = useBudgetStore(s => s.buffer)
  const monthlyIncome = useBudgetStore(s => s.monthlyIncome)
  const categories = useBudgetStore(s => s.categories)
  const savings = useBudgetStore(s => s.savings)
  const money = useMoney()
  const [helpItem, setHelpItem] = useState<BreakdownItem | null>(null)
  // The user's explicit tab pick; null = follow the situation. When the pick
  // becomes unavailable (balance dropped), we fall back to the strictest
  // available mode instead of clearing it, so it re-applies if money returns.
  const [modeChoice, setModeChoice] = useState<WidgetMode | null>(null)

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
      pace: computePace({
        bank: b,
        oblig,
        plannedOblig: plannedObligatoryTotal(categories),
        savingsPool,
        buffer,
        monthlyIncome,
        daysLeft,
        cycleDays: computeCycleLength(Number(incomeDay)),
      }),
    }
  }, [bank, incomeDay, buffer, monthlyIncome, categories, savings])

  // Tabs: every mode at or below the current situation is selectable; stricter
  // ones (their daily figure would be negative) render blocked. No modes at all
  // means deficit — the widget drops the tabs and shows the fourth, red card.
  const availableModes = availableWidgetModes(m.situation.state)
  const mode =
    modeChoice && availableModes.includes(modeChoice) ? modeChoice : availableModes[0] ?? null
  const modePerDay: Record<WidgetMode, number> = {
    ahead: m.greenPerDay,
    onTrack: m.yellowPerDay,
    intoSavings: m.allPerDay,
  }
  const card = mode
    ? modeProps(mode, modePerDay[mode], buffer, m.daysLeft, money)
    : deficitProps(m.situation, m.daysLeft, money)
  const pace = paceText(m.pace, money)

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
    ...(m.pace
      ? [
          {
            key: 'pace',
            label: 'Pace vs plan',
            value: m.pace.ahead,
            help:
              'How far you are ahead (+) or behind (−) the plan derived from your monthly income: extra money you could spend before your next income day while still landing on plan. The planned daily rate is (monthly income − fixed budgets − cushion) ÷ days in the cycle; the figure is (actual daily budget − planned) × days left. Set or clear the income in Settings → Budget.',
          },
        ]
      : []),
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
              tabs={
                mode !== null ? (
                  <Segmented
                    value={mode}
                    onChange={setModeChoice}
                    ariaLabel="Daily budget mode"
                    options={WIDGET_MODES.map(value => ({
                      value,
                      label: MODE_LABELS[value],
                      disabled: !availableModes.includes(value),
                    }))}
                  />
                ) : undefined
              }
              subtitle={
                pace ? (
                  <>
                    {card.subtitle}
                    <span className={styles.paceLine}>{pace}</span>
                  </>
                ) : (
                  card.subtitle
                )
              }
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
