import { state, saveState } from './state.js'
import { obligatoryTotal, currentSavingsTotal, computeBalances, savedIndicator } from './math.js'
import { uid, fmt, escapeHtml, currentMonthKey, round2 } from './utils.js'
import { renderDashboard } from './dashboard.js'
import { drawChart } from './chart.js'

const INDICATOR_TIERS = [
  { tier: 'blue',   label: '€500+' },
  { tier: 'green',  label: '€200+' },
  { tier: 'yellow', label: '€1+' },
  { tier: 'red',    label: '< €1' }
]

function indicatorCell(tier) {
  const legend = INDICATOR_TIERS.map(t =>
    `<span class="legend-row"><span class="indicator ind-${t.tier}"></span>${t.label}</span>`
  ).join('')
  return `
    <span class="indicator-wrap">
      <span class="indicator ind-${tier}"></span>
      <span class="indicator-tooltip" role="tooltip">${legend}</span>
    </span>
  `
}

export function renderSavings() {
  const body = document.getElementById('savingsBody')
  body.innerHTML = ''

  if (state.savings.length === 0) {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td colspan="5" class="savings-empty">No entries yet. Add a row manually or click "Finalize month".</td>`
    body.appendChild(tr)
    drawChart()
    return
  }

  const balances = computeBalances(state.savings)

  state.savings.forEach((row, i) => {
    const tr = document.createElement('tr')
    tr.dataset.id = row.id
    const ind = savedIndicator(row.saved)
    tr.innerHTML = `
      <td>${indicatorCell(ind)}</td>
      <td><input class="savings-input" type="month" value="${escapeHtml(row.month)}" data-id="${row.id}" data-field="month"></td>
      <td><input class="savings-input" type="number" step="0.01" value="${row.saved}" data-id="${row.id}" data-field="saved"></td>
      <td class="savings-bank-cell">€${fmt(balances[i])}</td>
      <td><button class="row-del" data-id="${row.id}">×</button></td>
    `
    body.appendChild(tr)
  })

  body.querySelectorAll('input[data-id]').forEach(inp => {
    inp.addEventListener('input', e => {
      const id = e.target.dataset.id
      const field = e.target.dataset.field
      const row = state.savings.find(r => r.id === id)
      if (!row) return
      if (field === 'month') {
        row.month = e.target.value
      } else if (field === 'saved') {
        row.saved = parseFloat(e.target.value) || 0
        const fresh = computeBalances(state.savings)
        body.querySelectorAll('tr[data-id]').forEach((tr, idx) => {
          const bankCell = tr.querySelector('.savings-bank-cell')
          if (bankCell) bankCell.textContent = '€' + fmt(fresh[idx])
        })
        const indEl = e.target.closest('tr').querySelector('.indicator-wrap > .indicator')
        indEl.className = 'indicator ind-' + savedIndicator(row.saved)
      }
      saveState()
      renderDashboard()
      drawChart()
    })
  })

  body.querySelectorAll('.row-del').forEach(btn => {
    btn.addEventListener('click', () => deleteSavingsRow(btn.dataset.id))
  })

  drawChart()
}

export function bindSavingsActions() {
  document.getElementById('savings-add-row').addEventListener('click', addSavingsRow)
  document.getElementById('savings-finalize').addEventListener('click', finalizeMonth)
}

function finalizeMonth() {
  const bank = Number(state.bank) || 0
  const oblig = obligatoryTotal(state.categories)
  const prevPool = currentSavingsTotal(state.savings)

  const saved = round2(bank - oblig - prevPool)
  const month = currentMonthKey()

  const existingIdx = state.savings.findIndex(r => r.month === month)
  const existingNote = existingIdx >= 0
    ? `\n⚠ An entry for ${month} already exists — its "Saved this month" will be overwritten.\n`
    : ''

  const message =
    `Finalize ${month}?\n` +
    existingNote +
    `\nThis will add a new row to the Savings table with:\n\n` +
    `  • Saved this month = current balance − fixed expenses − prior savings\n` +
    `      €${fmt(bank)} − €${fmt(oblig)} − €${fmt(prevPool)} = €${fmt(saved)}\n\n` +
    `  • Balance at end is auto-derived as previous row's balance + this value.\n\n` +
    `Tip: update "Current balance" on the Dashboard first if you've made any payments since.`

  if (!confirm(message)) return

  if (existingIdx >= 0) {
    state.savings[existingIdx] = {
      ...state.savings[existingIdx],
      saved
    }
  } else {
    state.savings.push({ id: uid(), month, saved })
  }

  saveState()
  renderSavings()
  renderDashboard()

  document.querySelector('.tab[data-tab="savings"]')?.click()
}

function addSavingsRow() {
  state.savings.push({
    id: uid(),
    month: currentMonthKey(),
    saved: 0
  })
  saveState()
  renderSavings()
  renderDashboard()
}

function deleteSavingsRow(id) {
  if (!confirm('Delete row?')) return
  state.savings = state.savings.filter(r => r.id !== id)
  saveState()
  renderSavings()
  renderDashboard()
}
