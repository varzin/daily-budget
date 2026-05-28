import { state } from './state.js'
import { savedIndicator, computeBalances } from './math.js'

const INDICATOR_COLORS = {
  blue:   '#6aa3f0',
  green:  '#6af0a3',
  yellow: '#f0d76a',
  red:    '#f06a6a'
}

let chartInstance = null
let visibleRange = null  // [startIdx, endIdx], inclusive — null means show all

// Draws the value of each point right above it.
const pointLabels = {
  id: 'pointLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart
    const meta = chart.getDatasetMeta(0)
    const values = chart.data.datasets[0].data
    ctx.save()
    ctx.font = '500 11px "JetBrains Mono", monospace'
    ctx.fillStyle = '#e8e6df'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    meta.data.forEach((pt, i) => {
      ctx.fillText('€' + Math.round(values[i]), pt.x, pt.y - 10)
    })
    ctx.restore()
  }
}

function buildData(slice) {
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
      pointBackgroundColor: slice.map(d => INDICATOR_COLORS[savedIndicator(d.saved)]),
      pointBorderColor: '#1a1c19',
      pointBorderWidth: 2
    }]
  }
}

function chartOptions() {
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
          label: ctx => 'Balance: €' + ctx.parsed.y.toFixed(2)
        }
      }
    },
    scales: {
      y: {
        grid: { color: '#2a2d29', drawTicks: false },
        ticks: {
          color: '#5a5e55',
          font: { family: 'JetBrains Mono, monospace', size: 11 },
          padding: 8,
          callback: v => '€' + v
        },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#8a8e85',
          font: { family: 'JetBrains Mono, monospace', size: 11 }
        },
        border: { color: '#2a2d29' }
      }
    }
  }
}

export function drawChart() {
  const canvas = document.getElementById('savingsChart')
  if (!canvas) return

  const all = state.savings
  const wrap = document.getElementById('savings-chart-wrap')
  // Chart.js needs a visible parent to size itself; skip when hidden.
  if (wrap.hidden) return

  if (all.length === 0) {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null }
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    document.getElementById('chartRange').hidden = true
    return
  }

  const balances = computeBalances(all)
  const fullData = all.map((r, i) => ({
    month: r.month,
    saved: Number(r.saved) || 0,
    bank: balances[i]
  }))

  // Default range = full
  if (!visibleRange) visibleRange = [0, fullData.length - 1]
  // Clamp range if data length changed
  visibleRange = [
    Math.max(0, Math.min(visibleRange[0], fullData.length - 1)),
    Math.max(0, Math.min(visibleRange[1], fullData.length - 1))
  ]
  if (visibleRange[0] > visibleRange[1]) visibleRange = [0, fullData.length - 1]

  const slice = fullData.slice(visibleRange[0], visibleRange[1] + 1)

  if (!chartInstance || chartInstance.canvas !== canvas) {
    if (chartInstance) chartInstance.destroy()
    chartInstance = new Chart(canvas, {
      type: 'line',
      data: buildData(slice),
      options: chartOptions(),
      plugins: [pointLabels]
    })
  } else {
    chartInstance.data = buildData(slice)
    chartInstance.update()
  }

  updateRangeUI(fullData)
}

function updateRangeUI(fullData) {
  const wrap = document.getElementById('chartRange')
  // Hide the range UI when there are fewer than 3 rows — no point scrubbing 2 points.
  if (fullData.length < 3) {
    wrap.hidden = true
    return
  }
  wrap.hidden = false

  const min = document.getElementById('chartRangeMin')
  const max = document.getElementById('chartRangeMax')
  const lastIdx = fullData.length - 1
  min.max = max.max = String(lastIdx)
  min.value = String(visibleRange[0])
  max.value = String(visibleRange[1])

  const progress = document.getElementById('chartRangeProgress')
  const total = lastIdx || 1
  progress.style.left = (visibleRange[0] / total * 100) + '%'
  progress.style.width = ((visibleRange[1] - visibleRange[0]) / total * 100) + '%'

  document.getElementById('chartRangeFrom').textContent = fullData[visibleRange[0]]?.month || ''
  document.getElementById('chartRangeTo').textContent = fullData[visibleRange[1]]?.month || ''
}

function bindRangeSlider() {
  const min = document.getElementById('chartRangeMin')
  const max = document.getElementById('chartRangeMax')
  if (!min || min.dataset.bound) return
  min.dataset.bound = max.dataset.bound = '1'

  const onInput = which => () => {
    let lo = +min.value
    let hi = +max.value
    if (which === 'min' && lo > hi) min.value = String(hi)
    if (which === 'max' && hi < lo) max.value = String(lo)
    visibleRange = [+min.value, +max.value]
    drawChart()
  }
  min.addEventListener('input', onInput('min'))
  max.addEventListener('input', onInput('max'))
}

export function setSavingsView(view) {
  document.querySelectorAll('.chart-toggle button[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view)
  })
  document.getElementById('savings-table-wrap').hidden = view !== 'table'
  document.getElementById('savings-chart-wrap').hidden = view !== 'chart'
  if (view === 'chart') drawChart()
}

export function bindChartToggle() {
  document.querySelectorAll('.chart-toggle button[data-view]').forEach(b => {
    b.addEventListener('click', () => setSavingsView(b.dataset.view))
  })
  bindRangeSlider()
}
