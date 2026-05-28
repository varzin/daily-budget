export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function fmt(n) {
  const v = Number(n) || 0
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function currentMonthKey(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${mm}.${date.getFullYear()}`
}

export function pluralDays(n) {
  return Math.abs(n) === 1 ? 'day' : 'days'
}

export function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function round2(n) {
  return Math.round(n * 100) / 100
}
