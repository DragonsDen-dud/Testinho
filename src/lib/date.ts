export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return toDateKey(dt)
}

export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

// ISO-ish week key (year + week number based on Monday-start weeks), used to
// group weekly_n_times habit logs for strength calculation.
export function weekKeyOf(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dayNum = (date.getUTCDay() + 6) % 7 // Monday = 0
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const weekNum =
    1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/** Monday-Sunday bounds of the week containing dateKey. */
export function weekBoundsOf(dateKey: string): { start: string; end: string } {
  const dow = weekdayOf(dateKey) // 0=Sun..6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const start = addDays(dateKey, mondayOffset)
  const end = addDays(start, 6)
  return { start, end }
}

/** Full weekday name (e.g. "Tuesday") for a 0=Sun..6=Sat index, locale-aware. */
export function weekdayName(dow: number, locale: string): string {
  // 2024-01-07 is a Sunday, so adding dow gives the matching weekday name.
  return new Date(2024, 0, 7 + dow).toLocaleDateString(locale, { weekday: 'long' })
}

export function formatHumanDate(dateKey: string, locale: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
