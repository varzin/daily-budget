export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function fmt(n) {
  const v = Number(n) || 0
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ISO 8601 year-month (e.g. "2026-01") — the value format used by
// <input type="month"> and stored on each savings row.
export function currentMonthKey(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${mm}`
}

// Convert any legacy "MM.YYYY" value to ISO "YYYY-MM". Pass-through for
// already-ISO values; empty string for unrecognisable input.
export function normalizeMonth(m) {
  if (!m) return ''
  if (/^\d{4}-\d{2}$/.test(m)) return m
  const legacy = m.match(/^(\d{2})\.(\d{4})$/)
  if (legacy) return `${legacy[2]}-${legacy[1]}`
  return ''
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
