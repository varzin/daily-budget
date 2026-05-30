import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  type Chart as ChartType,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from 'chart.js'
import { useBudgetStore } from '../../store/budgetStore'
import { computeBalances, savedIndicator } from '../../lib/math'
import type { SavedIndicator } from '../../lib/math'
import ChartRangeSlider from './ChartRangeSlider'
import styles from './SavingsChart.module.css'

// Register exactly the controllers/elements/plugins we use. Cheaper than
// `registerables` and silences tree-shaking warnings.
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
)

// Draws the value of each point right above it — ported 1:1 from js/chart.js.
const pointLabelsPlugin: Plugin<'line'> = {
  id: 'pointLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart
    const meta = chart.getDatasetMeta(0)
    const dataset = chart.data.datasets[0]
    if (!dataset) return
    const values = dataset.data as number[]
    ctx.save()
    ctx.font = '500 11px "JetBrains Mono", monospace'
    ctx.fillStyle = '#e8e6df'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    meta.data.forEach((pt, i) => {
      const v = values[i]
      if (v == null) return
      ctx.fillText('€' + Math.round(v), pt.x, pt.y - 10)
    })
    ctx.restore()
  },
}
Chart.register(pointLabelsPlugin)

type Point = { month: string; saved: number; bank: number }

function readIndicatorColors(): Record<SavedIndicator, string> {
  // Read live CSS custom properties so dark/light theme changes propagate.
  if (typeof document === 'undefined') {
    return { blue: '#6aa3f0', green: '#6af0a3', yellow: '#f0d76a', red: '#f06a6a' }
  }
  const cs = getComputedStyle(document.documentElement)
  const fallback: Record<SavedIndicator, string> = {
    blue: '#6aa3f0', green: '#6af0a3', yellow: '#f0d76a', red: '#f06a6a',
  }
  const pick = (name: string, fb: string): string => {
    const v = cs.getPropertyValue(name).trim()
    return v || fb
  }
  return {
    blue:   pick('--blue',   fallback.blue),
    green:  pick('--green',  fallback.green),
    yellow: pick('--yellow', fallback.yellow),
    red:    pick('--red',    fallback.red),
  }
}

function buildData(slice: Point[], colors: Record<SavedIndicator, string>): ChartData<'line'> {
  return {
    labels: slice.map(d => d.month),
    datasets: [{
      data: slice.map(d => d.bank),
      borderColor: '#b4f06a',
      backgroundColor: 'rgba(180, 240, 106, 0.08)',
      borderWidth: 2,
      fill: 'origin',
      tension: 0.25,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointBackgroundColor: slice.map(d => colors[savedIndicator(d.saved)]),
      pointBorderColor: '#1a1c19',
      pointBorderWidth: 2,
    }],
  }
}

function chartOptions(): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { top: 24, right: 12, left: 4, bottom: 4 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#16181580',
        borderColor: '#2a2d29',
        borderWidth: 1,
        titleColor: '#e8e6df',
        bodyColor: '#e8e6df',
        callbacks: {
          label: ctx => 'Balance: €' + (ctx.parsed.y ?? 0).toFixed(2),
        },
      },
    },
    scales: {
      y: {
        grid: { color: '#2a2d29', drawTicks: false },
        ticks: {
          color: '#5a5e55',
          font: { family: 'JetBrains Mono, monospace', size: 11 },
          padding: 8,
          callback: v => '€' + v,
        },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#8a8e85',
          font: { family: 'JetBrains Mono, monospace', size: 11 },
        },
        border: { color: '#2a2d29' },
      },
    },
  }
}

export default function SavingsChart() {
  const savings = useBudgetStore(s => s.savings)

  const fullData = useMemo<Point[]>(() => {
    const balances = computeBalances(savings)
    return savings.map((r, i) => ({
      month: r.month,
      saved: Number(r.saved) || 0,
      bank: balances[i] ?? 0,
    }))
  }, [savings])

  const lastIdx = Math.max(0, fullData.length - 1)
  const [range, setRange] = useState<[number, number]>([0, lastIdx])

  // Clamp range when dataset shrinks/grows. Always reflect a valid window.
  useEffect(() => {
    setRange(prev => {
      const [lo, hi] = prev
      const cLo = Math.max(0, Math.min(lo, lastIdx))
      const cHi = Math.max(0, Math.min(hi, lastIdx))
      const next: [number, number] = cLo > cHi ? [0, lastIdx] : [cLo, cHi]
      if (next[0] === prev[0] && next[1] === prev[1]) return prev
      return next
    })
  }, [lastIdx])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<ChartType<'line'> | null>(null)

  // --- Effect 1: create/destroy chart instance. Runs once per mount. ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const colors = readIndicatorColors()
    const instance = new Chart(canvas, {
      type: 'line',
      data: buildData([], colors),
      options: chartOptions(),
    })
    chartRef.current = instance
    return () => {
      instance.destroy()
      chartRef.current = null
    }
  }, [])

  // --- Effect 2: update data only. No destroy/recreate. ---
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    if (fullData.length === 0) {
      chart.data = buildData([], readIndicatorColors())
      chart.update()
      return
    }
    const [lo, hi] = range
    const cLo = Math.max(0, Math.min(lo, fullData.length - 1))
    const cHi = Math.max(0, Math.min(hi, fullData.length - 1))
    const start = Math.min(cLo, cHi)
    const end = Math.max(cLo, cHi)
    const slice = fullData.slice(start, end + 1)
    chart.data = buildData(slice, readIndicatorColors())
    // Container may have just become visible (hidden→shown transition when
    // the first row is added). Force a resize so Chart.js picks up the new
    // box dimensions instead of staying at zero size.
    chart.resize()
    chart.update()
  }, [fullData, range])

  const isEmpty = savings.length === 0
  const showRange = fullData.length >= 3
  const fromLabel = fullData[range[0]]?.month ?? ''
  const toLabel = fullData[range[1]]?.month ?? ''

  return (
    <div className={styles.chartWrap}>
      {isEmpty && (
        <div className={styles.savingsEmpty}>
          No entries yet. Add a row manually or click "Finalize month".
        </div>
      )}
      <div className={styles.chartCanvasWrap} hidden={isEmpty}>
        <canvas ref={canvasRef} />
      </div>
      {!isEmpty && showRange && (
        <div className={styles.chartRange}>
          <div className={styles.chartRangeLabels}>
            <span>{fromLabel}</span>
            <span className={styles.chartRangeSep}>to</span>
            <span>{toLabel}</span>
          </div>
          <ChartRangeSlider
            min={0}
            max={lastIdx}
            value={range}
            onChange={setRange}
            labelMin="Range start"
            labelMax="Range end"
          />
        </div>
      )}
    </div>
  )
}
