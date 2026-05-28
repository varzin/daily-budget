export const STORAGE_KEY = 'budget_app_v1'

export const defaultState = {
  bank: 0,
  incomeDay: 26,
  categories: [],
  savings: []
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(defaultState)
    const parsed = JSON.parse(raw)
    return {
      ...structuredClone(defaultState),
      ...parsed,
      categories: parsed.categories || [],
      savings: parsed.savings || []
    }
  } catch (e) {
    console.error('Failed to load state', e)
    return structuredClone(defaultState)
  }
}

export const state = {}
Object.assign(state, loadState())

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `budget-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importData(event, onSuccess) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result)
      if (!confirm('Import will overwrite current data. Continue?')) return
      Object.keys(state).forEach(k => delete state[k])
      Object.assign(state, structuredClone(defaultState), data, {
        categories: data.categories || [],
        savings: data.savings || []
      })
      saveState()
      onSuccess?.()
    } catch (err) {
      alert('Failed to read file: ' + err.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}
