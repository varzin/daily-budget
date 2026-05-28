import { state, saveState, exportData, importData } from './state.js'
import { renderDashboard } from './dashboard.js'
import { renderCategories, bindCategoryForm } from './categories.js'
import { renderSavings, bindSavingsActions } from './savings.js'
import { drawChart, bindChartToggle } from './chart.js'

export function renderAll() {
  renderDashboard()
  renderCategories()
  renderSavings()
}

export function setTab(name) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name)
  })
  document.querySelectorAll('.section').forEach(s => {
    s.classList.toggle('active', s.id === 'tab-' + name)
  })
  if (name === 'savings') drawChart()
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => setTab(t.dataset.tab))
})

document.getElementById('bank').addEventListener('input', e => {
  state.bank = parseFloat(e.target.value) || 0
  saveState()
  renderDashboard()
})

document.getElementById('incomeDay').addEventListener('input', e => {
  const v = parseInt(e.target.value)
  state.incomeDay = (isNaN(v) || v < 1 || v > 31) ? 0 : v
  saveState()
  renderDashboard()
})

document.getElementById('export-btn').addEventListener('click', exportData)

document.getElementById('importFile').addEventListener('change', e => {
  importData(e, renderAll)
})

let resizeTimer
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (!document.getElementById('savings-chart-wrap').classList.contains('hidden')) {
      drawChart()
    }
  }, 200)
})

bindCategoryForm()
bindSavingsActions()
bindChartToggle()
renderAll()
