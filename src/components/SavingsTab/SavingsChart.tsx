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
import { useThemeStore } from '../../store/themeStore'
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

// Theme-aware palette, read live from the CSS design tokens on <html> so that
// switching System / Light / Dark propagates to the canvas (which can't use
// CSS variables directly).
interface ChartPalette {
  text: string
  line: string
  area: string
  pointBorder: string
  grid: string
  tickDim: string
  tickFaint: string
  tooltipBg: string
  indicators: Record<SavedIndicator, string>
}

const FALLBACK_PALETTE: ChartPalette = {
  text: '#e8e6df',
  line: '#b4f06a',
  area: '#b4f06a14',
  pointBorder: '#1a1c19',
  grid: '#2a2d29',
  tickDim: '#8a8e85',
  tickFaint: '#5a5e55',
  tooltipBg: '#16181580',
  indicators: { blue: '#6aa3f0', green: '#6af0a3', yellow: '#f0d76a', red: '#f06a6a' },
}

function readPalette(): ChartPalette {
  if (typeof document === 'undefined') return FALLBACK_PALETTE
  const cs = getComputedStyle(document.documentElement)
  const pick = (name: string, fb: string): string => cs.getPropertyValue(name).trim() || fb
  return {
    text: pick('--text', FALLBACK_PALETTE.text),
    line: pick('--accent', FALLBACK_PALETTE.line),
    area: pick('--chart-area', FALLBACK_PALETTE.area),
    pointBorder: pick('--bg-card', FALLBACK_PALETTE.pointBorder),
    grid: pick('--border', FALLBACK_PALETTE.grid),
    tickDim: pick('--text-dim', FALLBACK_PALETTE.tickDim),
    tickFaint: pick('--text-faint', FALLBACK_PALETTE.tickFaint),
    tooltipBg: pick('--bg-elev', FALLBACK_PALETTE.tooltipBg),
    indicators: {
      blue: pick('--blue', FALLBACK_PALETTE.indicators.blue),
      green: pick('--green', FALLBACK_PALETTE.indicators.green),
      yellow: pick('--yellow', FALLBACK_PALETTE.indicators.yellow),
      red: pick('--red', FALLBACK_PALETTE.indicators.red),
    },
  }
}

// Draws the value of each point right above it — ported 1:1 from js/chart.js.
// Reads the text color live so it tracks the active theme.
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
    ctx.fillStyle =
      getComputedStyle(chart.canvas).getPropertyValue('--text').trim() ||
      FALLBACK_PALETTE.text
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

function buildData(slice: Point[], palette: ChartPalette): ChartData<'line'> {
  return {
    labels: slice.map(d => d.month),
    datasets: [{
      data: slice.map(d => d.bank),
      borderColor: palette.line,
      backgroundColor: palette.area,
      borderWidth: 2,
      fill: 'origin',
      tension: 0.25,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointBackgroundColor: slice.map(d => palette.indicators[savedIndicator(d.saved)]),
      pointBorderColor: palette.pointBorder,
      pointBorderWidth: 2,
    }],
  }
}

function chartOptions(palette: ChartPalette): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { top: 24, right: 12, left: 4, bottom: 4 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        borderColor: palette.grid,
        borderWidth: 1,
        titleColor: palette.text,
        bodyColor: palette.text,
        callbacks: {
          label: ctx => 'Balance: €' + (ctx.parsed.y ?? 0).toFixed(2),
        },
      },
    },
    scales: {
      y: {
        grid: { color: palette.grid, drawTicks: false },
        ticks: {
          color: palette.tickFaint,
          font: { family: 'JetBrains Mono, monospace', size: 11 },
          padding: 8,
          callback: v => '€' + v,
        },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: palette.tickDim,
          font: { family: 'JetBrains Mono, monospace', size: 11 },
        },
        border: { color: palette.grid },
      },
    },
  }
}

export default function SavingsChart() {
  const savings = useBudgetStore(s => s.savings)
  // Re-render (and rebuild chart colors) whenever the resolved theme changes.
  const resolved = useThemeStore(s => s.resolved)

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
    const palette = readPalette()
    const instance = new Chart(canvas, {
      type: 'line',
      data: buildData([], palette),
      options: chartOptions(palette),
    })
    chartRef.current = instance
    return () => {
      instance.destroy()
      chartRef.current = null
    }
  }, [])

  // --- Effect 2: update data + theme colors. No destroy/recreate. ---
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const palette = readPalette()
    chart.options = chartOptions(palette)
    if (fullData.length === 0) {
      chart.data = buildData([], palette)
      chart.update()
      return
    }
    const [lo, hi] = range
    const cLo = Math.max(0, Math.min(lo, fullData.length - 1))
    const cHi = Math.max(0, Math.min(hi, fullData.length - 1))
    const start = Math.min(cLo, cHi)
    const end = Math.max(cLo, cHi)
    const slice = fullData.slice(start, end + 1)
    chart.data = buildData(slice, palette)
    // Container may have just become visible (hidden→shown transition when
    // the first row is added). Force a resize so Chart.js picks up the new
    // box dimensions instead of staying at zero size.
    chart.resize()
    chart.update()
  }, [fullData, range, resolved])

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
