import { state, saveState } from './state.js'
import { categoryAmount, obligatoryTotal } from './math.js'
import { uid, fmt, escapeHtml } from './utils.js'
import { renderDashboard } from './dashboard.js'

export function renderCategories() {
  const list = document.getElementById('catsList')
  list.innerHTML = ''

  state.categories.forEach((cat) => {
    const row = document.createElement('div')
    row.className = 'cat' + (cat.done ? ' done' : '')
    const remaining = categoryAmount(cat)

    row.innerHTML = `
      <div class="check ${cat.done ? 'checked' : ''}" data-id="${cat.id}"></div>
      <div class="cat-name-wrap">
        <input class="cat-name" value="${escapeHtml(cat.name)}" data-id="${cat.id}" data-field="name" placeholder="Name">
      </div>
      <div class="nums-row">
        <div class="num-field">
          <label>Budget</label>
          <input class="cat-input" type="number" inputmode="decimal" step="0.01" placeholder="0" value="${cat.budget || ''}" data-id="${cat.id}" data-field="budget">
        </div>
        <div class="num-field">
          <label>Spent</label>
          <input class="cat-input spent" type="number" inputmode="decimal" step="0.01" placeholder="0" value="${cat.spent || ''}" data-id="${cat.id}" data-field="spent">
        </div>
        <div class="num-field">
          <label>Left</label>
          <div class="cat-remaining" data-remaining-for="${cat.id}">€${fmt(remaining)}</div>
        </div>
      </div>
      <button class="cat-del" data-id="${cat.id}" title="Delete">×</button>
    `
    list.appendChild(row)
  })

  list.querySelectorAll('.check[data-id]').forEach(el => {
    el.addEventListener('click', () => toggleDone(el.dataset.id))
  })

  list.querySelectorAll('.cat-del[data-id]').forEach(btn => {
    btn.addEventListener('click', () => deleteCategory(btn.dataset.id))
  })

  list.querySelectorAll('input[data-id]').forEach(inp => {
    inp.addEventListener('input', e => {
      const id = e.target.dataset.id
      const field = e.target.dataset.field
      const cat = state.categories.find(c => c.id === id)
      if (!cat) return
      if (field === 'name') {
        cat.name = e.target.value
      } else {
        cat[field] = e.target.value === '' ? 0 : parseFloat(e.target.value)
      }
      saveState()
      const remEl = list.querySelector(`[data-remaining-for="${id}"]`)
      if (remEl) remEl.textContent = '€' + fmt(categoryAmount(cat))
      renderDashboard()
      updateObligTotal()
    })
  })

  updateObligTotal()
}

export function bindCategoryForm() {
  document.getElementById('newCatAdd').addEventListener('click', addCategory)
  document.getElementById('newCatDone').addEventListener('click', toggleNewDone)

  ;['newCatBudget', 'newCatSpent'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateNewRemaining)
  })

  ;['newCatName', 'newCatBudget', 'newCatSpent'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        addCategory()
      }
    })
  })
}

function addCategory() {
  const nameInp = document.getElementById('newCatName')
  const budgetInp = document.getElementById('newCatBudget')
  const spentInp = document.getElementById('newCatSpent')
  const doneEl = document.getElementById('newCatDone')

  const name = nameInp.value.trim()
  if (!name) {
    nameInp.focus()
    return
  }
  state.categories.push({
    id: uid(),
    name,
    budget: parseFloat(budgetInp.value) || 0,
    spent: parseFloat(spentInp.value) || 0,
    done: doneEl.classList.contains('checked')
  })

  nameInp.value = ''
  budgetInp.value = ''
  spentInp.value = ''
  doneEl.classList.remove('checked')
  updateNewRemaining()

  saveState()
  renderCategories()
  renderDashboard()

  nameInp.focus()
}

function deleteCategory(id) {
  if (!confirm('Delete category?')) return
  const idx = state.categories.findIndex(c => c.id === id)
  if (idx >= 0) state.categories.splice(idx, 1)
  saveState()
  renderCategories()
  renderDashboard()
}

function toggleDone(id) {
  const cat = state.categories.find(c => c.id === id)
  if (!cat) return
  cat.done = !cat.done
  saveState()
  renderCategories()
  renderDashboard()
}

function toggleNewDone() {
  const el = document.getElementById('newCatDone')
  el.classList.toggle('checked')
  updateNewRemaining()
}

function updateNewRemaining() {
  const budget = parseFloat(document.getElementById('newCatBudget').value) || 0
  const spent = parseFloat(document.getElementById('newCatSpent').value) || 0
  const done = document.getElementById('newCatDone').classList.contains('checked')
  const remaining = done ? 0 : Math.max(0, budget - spent)
  document.getElementById('newCatRemaining').textContent = '€' + fmt(remaining)
}

function updateObligTotal() {
  document.getElementById('oblig-total').textContent = '€' + fmt(obligatoryTotal(state.categories))
}
