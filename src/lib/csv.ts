import type { Habit, HabitLog, HabitLogEntry } from '../db/types'
import { sanitizeFilename } from './ics'

export interface CsvBuildResult {
  csv: string
  filename: string
}

/** RFC 4180 field escaping: quote a field containing a comma, quote, or any
 * line-break character, doubling any internal quotes. */
function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** A measurable habit can have several entries logged in one day (Article
 * 24) — each is kept, not collapsed to a single number, so the export
 * doesn't silently lose data a multi-entry day actually recorded. */
function formatEntries(entries: HabitLogEntry[] | undefined): string {
  if (!entries || entries.length === 0) return ''
  return entries.map((e) => `${e.timestamp}=${e.value}`).join('; ')
}

/**
 * Article 55 — exports one Habit's full HabitLog history as CSV, separate
 * from any full-app backup (no such JSON backup feature exists in this
 * codebase, despite Article 55's text implying one does — see README scope
 * notes). One row per HabitLog (per day), not per measurable entry, so a
 * day with several check-ins still exports as a single row with all its
 * entries packed into one escaped field.
 */
export function buildHabitLogCsv(habit: Habit, logs: HabitLog[]): CsvBuildResult {
  const header = ['date', 'status', 'value', 'note', 'mood']
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const rows = sorted.map((log) => [
    log.date,
    log.status,
    habit.measurable ? formatEntries(log.entries) : '',
    log.note ?? '',
    log.mood !== undefined ? String(log.mood) : '',
  ])
  const csv = [header, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\r\n') + '\r\n'
  return { csv, filename: `${sanitizeFilename(habit.name)}-history.csv` }
}
