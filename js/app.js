import { state, saveState, exportData, importData, onStateChange } from './state.js'
import { renderDashboard } from './dashboard.js'
import { renderCategories, bindCategoryForm } from './categories.js'
import { renderSavings, bindSavingsActions } from './savings.js'
import { drawChart, bindChartToggle } from './chart.js'
import {
  initSync, connectDropbox, disconnectDropbox, syncNow,
  notifyLocalChange, onSyncStatusChange, getSyncStatus
} from './sync.js'

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

// ---------- Sync wiring ----------

document.getElementById('connect-dropbox-btn').addEventListener('click', () => {
  const proceed = confirm(
    'Connect to Dropbox?\n\n' +
    'Your budget will be saved to a private "Apps/daily-budget" folder in your Dropbox. ' +
    'If both this device and your Dropbox already contain data, the newer version wins. ' +
    'Export a backup first if you want a safety copy.'
  )
  if (proceed) connectDropbox()
})

document.getElementById('disconnect-dropbox-btn').addEventListener('click', () => {
  if (confirm('Disconnect from Dropbox? Local data stays on this device. The file in Dropbox is not deleted.')) {
    disconnectDropbox()
  }
})

document.getElementById('sync-now-btn').addEventListener('click', () => syncNow())
document.getElementById('sync-indicator').addEventListener('click', () => syncNow())

// Push to Dropbox whenever local state changes
onStateChange(notifyLocalChange)

// Re-render after Dropbox pulls fresh state
window.addEventListener('state:replaced', () => renderAll())

// Pull when the tab becomes visible — but only if it's been a while.
// Alt-tabbing should not spam Dropbox API.
const VISIBILITY_PULL_THROTTLE_MS = 60_000
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return
  const s = getSyncStatus()
  if (!s.connected) return
  if (s.lastSyncAt && Date.now() - s.lastSyncAt < VISIBILITY_PULL_THROTTLE_MS) return
  syncNow()
})

// Settings UI: reflect sync status
const STATUS_LABELS = {
  not_connected: 'Dropbox not connected',
  connecting: 'Connecting Dropbox…',
  syncing: 'Dropbox syncing…',
  synced: 'Dropbox synced',
  offline: 'Dropbox offline',
  error: 'Dropbox sync error'
}

function relativeTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

function updateSyncUI(s) {
  const indicator = document.getElementById('sync-indicator')
  const disconnected = document.getElementById('sync-disconnected')
  const connected = document.getElementById('sync-connected')
  const dot = document.getElementById('sync-status-dot')
  const statusText = document.getElementById('sync-status-text')
  const statusTime = document.getElementById('sync-status-time')
  const account = document.getElementById('sync-account')
  const errorEl = document.getElementById('sync-error')

  // Top-bar indicator: shown only when connected
  indicator.hidden = !s.connected
  indicator.classList.toggle('spinning', s.status === 'syncing' || s.status === 'connecting')
  indicator.classList.toggle('error', s.status === 'error' || s.status === 'offline')
  indicator.title = STATUS_LABELS[s.status] + (s.lastSyncAt ? ` · ${relativeTime(s.lastSyncAt)}` : '')

  if (!s.connected) {
    disconnected.hidden = false
    connected.hidden = true
    return
  }
  disconnected.hidden = true
  connected.hidden = false

  dot.className = `sync-dot status-${s.status}`
  statusText.textContent = STATUS_LABELS[s.status]
  statusTime.textContent = s.lastSyncAt ? `· ${relativeTime(s.lastSyncAt)}` : ''
  account.textContent = s.account?.email || (s.account?.name) || '—'

  if (s.lastError && (s.status === 'error' || s.status === 'offline')) {
    errorEl.hidden = false
    errorEl.textContent = s.lastError
  } else {
    errorEl.hidden = true
  }
}

onSyncStatusChange(updateSyncUI)

// Periodically refresh the "X min ago" text
setInterval(() => updateSyncUI(getSyncStatus()), 30_000)

bindCategoryForm()
bindSavingsActions()
bindChartToggle()
renderAll()

// Kick off Dropbox sync (handles OAuth callback if present, then initial pull)
initSync()
