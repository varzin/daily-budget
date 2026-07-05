import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import MetricCard from './MetricCard'
import PacePill from './PacePill'
import Segmented from '../ui/Segmented/Segmented'
import {
  WIDGET_MODES,
  availableWidgetModes,
  type Pace,
  type SituationState,
  type WidgetMode,
} from '../../lib/math'

/**
 * The daily-budget widget as composed by DashboardTab: a featured MetricCard
 * with the mode tabs (Segmented) living inside it. The situation decides which
 * modes are selectable — stricter tabs whose daily figure would go negative
 * render blocked; when even fixed expenses aren't covered the tabs disappear
 * and the fourth, deficit card takes over.
 *
 * Labels, figures and copy mirror DashboardTab (MODE_LABELS / modeProps /
 * deficitProps) — kept in sync by hand; these stories are the visual spec for
 * that composition. Fixture: balance varies, fixed 100, savings 200, cushion
 * 50, 10 days until income.
 */
const meta = {
  title: 'Dashboard/DailyWidget',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const MODE_LABELS: Record<WidgetMode, string> = {
  ahead: 'Grow savings',
  onTrack: 'Keep savings',
  intoSavings: 'Spend savings',
}

/** Per-mode card treatment for the shared fixture (balance 400/320/150). */
const MODE_CARD: Record<WidgetMode, { tone: 'teal' | 'green' | 'orange'; value: string; subtitle: string }> = {
  ahead: { tone: 'teal', value: '5.00', subtitle: 'Adds €50 to savings · Income in 10 days' },
  onTrack: { tone: 'green', value: '10.00', subtitle: 'Savings untouched · Income in 10 days' },
  intoSavings: { tone: 'orange', value: '30.00', subtitle: 'Spends savings · Income in 10 days' },
}

/** Rounded clip wrapper standing in for DashboardTab's .metrics grid. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      {children}
    </div>
  )
}

/** Pace fixture: only `ahead` matters to the pill. */
function paceOf(ahead: number): Pace {
  return { perDayPlan: 20, perDayActual: 20 + ahead / 10, ahead }
}

function DailyWidget({ situation, ahead }: { situation: SituationState; ahead?: number }) {
  const available = availableWidgetModes(situation)
  const [choice, setChoice] = useState<WidgetMode | null>(null)
  const mode = choice && available.includes(choice) ? choice : available[0] ?? null
  const badge = ahead !== undefined ? <PacePill pace={paceOf(ahead)} /> : undefined

  if (mode === null) {
    return (
      <Frame>
        <MetricCard
          featured
          tone="deficit"
          label="Over budget"
          symbol="−€"
          value="20.00"
          subtitle="Deficit · 10 days of no spending"
          badge={badge}
        />
      </Frame>
    )
  }

  const card = MODE_CARD[mode]
  return (
    <Frame>
      <MetricCard
        featured
        tone={card.tone}
        label="Daily budget"
        symbol="€"
        value={card.value}
        subtitle={card.subtitle}
        badge={badge}
        tabs={
          <Segmented
            value={mode}
            onChange={setChoice}
            ariaLabel="Daily budget mode"
            options={WIDGET_MODES.map((value) => ({
              value,
              label: MODE_LABELS[value],
              disabled: !available.includes(value),
            }))}
          />
        }
      />
    </Frame>
  )
}

/** Best case: the cushion fits, every mode is selectable (balance 400). */
export const GrowSavings: Story = {
  render: () => <DailyWidget situation="ahead" />,
}

/** Cushion no longer fits — "Grow savings" is blocked (balance 320). */
export const KeepSavings: Story = {
  render: () => <DailyWidget situation="onTrack" />,
}

/** Spending eats into savings — only the loosest mode remains (balance 150). */
export const SpendSavings: Story = {
  render: () => <DailyWidget situation="intoSavings" />,
}

/** Fixed expenses aren't covered: tabs disappear, the deficit card takes over (balance 80). */
export const OverBudget: Story = {
  render: () => <DailyWidget situation="over" />,
}

/** With a monthly income set, the pace pill joins the label row: ahead of plan. */
export const PaceAhead: Story = {
  render: () => <DailyWidget situation="ahead" ahead={110} />,
}

/** Behind the income-derived plan — the pill flips red. */
export const PaceBehind: Story = {
  render: () => <DailyWidget situation="onTrack" ahead={-200} />,
}

/** Within ±1 of the plan — neutral "on plan" pill. */
export const PaceOnPlan: Story = {
  render: () => <DailyWidget situation="onTrack" ahead={0.4} />,
}

/** All four situations stacked for a side-by-side sweep. */
export const AllSituations: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['ahead', 'onTrack', 'intoSavings', 'over'] as const).map((s) => (
        <DailyWidget key={s} situation={s} />
      ))}
    </div>
  ),
}
