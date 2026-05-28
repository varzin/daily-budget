import { state } from './state.js'
import { savedIndicator, computeBalances } from './math.js'

export function drawChart() {
  const canvas = document.getElementById('savingsChart')
  if (!canvas) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const cssW = rect.width || canvas.width
  const cssH = 320
  canvas.width = cssW * dpr
  canvas.height = cssH * dpr
  canvas.style.height = cssH + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const W = cssW
  const H = cssH
  const padL = 60, padR = 24, padT = 24, padB = 40

  ctx.fillStyle = '#1a1c19'
  ctx.fillRect(0, 0, W, H)

  if (state.savings.length === 0) {
    ctx.fillStyle = '#5a5e55'
    ctx.font = 'italic 16px Fraunces, serif'
    ctx.textAlign = 'center'
    ctx.fillText('No data', W / 2, H / 2)
    return
  }

  const balances = computeBalances(state.savings)
  const data = state.savings.map((r, i) => ({
    label: r.month,
    bank: balances[i],
    saved: Number(r.saved) || 0
  }))

  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const maxVal = Math.max(...data.map(d => d.bank), 100)
  const minVal = Math.min(0, ...data.map(d => d.bank))
  const range = maxVal - minVal || 1

  ctx.strokeStyle = '#2a2d29'
  ctx.lineWidth = 1
  ctx.fillStyle = '#5a5e55'
  ctx.font = '11px JetBrains Mono, monospace'
  ctx.textAlign = 'right'
  const ySteps = 4
  for (let i = 0; i <= ySteps; i++) {
    const y = padT + (innerH * i) / ySteps
    const val = maxVal - (range * i) / ySteps
    ctx.beginPath()
    ctx.moveTo(padL, y)
    ctx.lineTo(W - padR, y)
    ctx.stroke()
    ctx.fillText('€' + val.toFixed(0), padL - 8, y + 4)
  }

  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0

  function xAt(i) {
    return data.length === 1 ? padL + innerW / 2 : padL + i * stepX
  }
  function yAt(v) {
    return padT + (1 - (v - minVal) / range) * innerH
  }

  ctx.fillStyle = '#8a8e85'
  ctx.textAlign = 'center'
  data.forEach((d, i) => {
    ctx.fillText(d.label, xAt(i), H - padB + 18)
  })

  if (data.length > 1) {
    ctx.strokeStyle = '#b4f06a'
    ctx.lineWidth = 2
    ctx.beginPath()
    data.forEach((d, i) => {
      const x = xAt(i)
      const y = yAt(d.bank)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    ctx.lineTo(xAt(data.length - 1), padT + innerH)
    ctx.lineTo(xAt(0), padT + innerH)
    ctx.closePath()
    ctx.fillStyle = 'rgba(180, 240, 106, 0.08)'
    ctx.fill()
  }

  data.forEach((d, i) => {
    const x = xAt(i)
    const y = yAt(d.bank)
    const ind = savedIndicator(d.saved)
    const colors = { blue: '#6aa3f0', green: '#6af0a3', yellow: '#f0d76a', red: '#f06a6a' }
    ctx.fillStyle = colors[ind]
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1a1c19'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#e8e6df'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    const savedStr = (d.saved >= 0 ? '+' : '') + d.saved.toFixed(0)
    ctx.fillText(savedStr, x, y - 10)
  })
}

export function setSavingsView(view) {
  document.querySelectorAll('.chart-toggle button[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view)
  })
  document.getElementById('savings-table-wrap').classList.toggle('hidden', view !== 'table')
  document.getElementById('savings-chart-wrap').classList.toggle('hidden', view !== 'chart')
  if (view === 'chart') drawChart()
}

export function bindChartToggle() {
  document.querySelectorAll('.chart-toggle button[data-view]').forEach(b => {
    b.addEventListener('click', () => setSavingsView(b.dataset.view))
  })
}
