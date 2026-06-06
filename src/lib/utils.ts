export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/** Drop tombstoned (soft-deleted) entities — used wherever the UI lists them. */
export function live<T extends { deletedAt?: string }>(items: T[]): T[] {
  return items.filter((e) => !e.deletedAt)
}

export function fmt(n: number): string {
  const v = Number(n) || 0
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ISO 8601 year-month (e.g. "2026-01") — the value format used by
// <input type="month"> and stored on each savings row.
export function currentMonthKey(date: Date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${mm}`
}

// Convert any legacy "MM.YYYY" value to ISO "YYYY-MM". Pass-through for
// already-ISO values; empty string for unrecognisable input.
export function normalizeMonth(m: string): string {
  if (!m) return ''
  if (/^\d{4}-\d{2}$/.test(m)) return m
  const legacy = m.match(/^(\d{2})\.(\d{4})$/)
  if (legacy) return `${legacy[2]}-${legacy[1]}`
  return ''
}

export function pluralDays(n: number): string {
  return Math.abs(n) === 1 ? 'day' : 'days'
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
