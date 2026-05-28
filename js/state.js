export const STORAGE_KEY = 'budget_app_v1'

export const defaultState = {
  bank: 0,
  incomeDay: 26,
  categories: [],
  savings: [],
  updatedAt: null
}

// `bank` used to be stored per savings row but is now fully derived from
// `saved`. Strip it on read so old localStorage / Dropbox JSONs are migrated
// the first time they're saved again.
function stripDerived(savings) {
  return (savings || []).map(({ bank, ...rest }) => rest)
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
      savings: stripDerived(parsed.savings)
    }
  } catch (e) {
    console.error('Failed to load state', e)
    return structuredClone(defaultState)
  }
}

export const state = {}
Object.assign(state, loadState())

const changeListeners = []
export function onStateChange(fn) {
  changeListeners.push(fn)
}

let suppressNotify = false

export function saveState() {
  state.updatedAt = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  if (!suppressNotify) {
    changeListeners.forEach(fn => fn())
  }
}

// Replace state from a remote source (Dropbox pull / Import) without
// bumping updatedAt and without firing change listeners — the remote's
// own updatedAt is preserved, and listeners (sync push) shouldn't react.
export function replaceState(next) {
  suppressNotify = true
  Object.keys(state).forEach(k => delete state[k])
  Object.assign(state, structuredClone(defaultState), next, {
    categories: next.categories || [],
    savings: stripDerived(next.savings)
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  suppressNotify = false
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
      replaceState(data)
      // After manual import we DO want the change to be pushed to Dropbox,
      // so bump updatedAt and notify listeners.
      saveState()
      onSuccess?.()
    } catch (err) {
      alert('Failed to read file: ' + err.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}
