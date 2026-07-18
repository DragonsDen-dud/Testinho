import type { Habit, HabitSchedule, Todo } from '../db/types'
import { todayKey, addDays, weekdayOf } from './date'

// index 0=Sun..6=Sat, matching weekdayOf()'s convention throughout this app.
const ICAL_WEEKDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

export type IcsBuildResult =
  | { ok: true; ics: string; filename: string }
  | { ok: false; reason: 'unmappable_schedule' | 'no_reminder_times' | 'no_due_date' }

// ---- RFC 5545 low-level helpers ----

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** RFC 5545 §3.1 line folding: content lines over 75 octets are folded with
 * CRLF + a leading space. Habit/task names in this app are short, so this
 * mainly matters for defensive correctness rather than anything observed. */
function foldLine(line: string): string {
  if (new TextEncoder().encode(line).length <= 75) return line
  const parts: string[] = []
  let start = 0
  let limit = 75
  while (start < line.length) {
    parts.push(line.slice(start, start + limit))
    start += limit
    limit = 74 // continuation lines are one octet shorter to leave room for the leading space
  }
  return parts.join('\r\n ')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dtstamp(now: Date): string {
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
}

/** Floating local time (no Z, no TZID) — RFC 5545 leaves this to the viewing
 * calendar's own timezone, which matches how every other time value in this
 * app (reminderTimes, scheduledTime, TimeBlock ranges) is already stored:
 * a bare wall-clock HH:mm with no timezone attached. */
function floatingDateTime(dateKey: string, time: string): string {
  const [y, m, d] = dateKey.split('-')
  const [h, min] = time.split(':')
  return `${y}${m}${d}T${h}${min}00`
}

function dateOnly(dateKey: string): string {
  return dateKey.replace(/-/g, '')
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .trim()
    .slice(0, 60)
  return cleaned || 'reminder'
}

function buildCalendar(eventLines: string[][]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//STOA//Habit and Task Reminders//EN', 'CALSCALE:GREGORIAN', ...eventLines.flat(), 'END:VCALENDAR']
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/**
 * Article 13 — maps a Habit's schedule to an RRULE where the grammar
 * actually allows a faithful mapping, and returns null otherwise rather
 * than guessing:
 *  - daily -> FREQ=DAILY, exact.
 *  - specific_weekdays -> FREQ=WEEKLY;BYDAY=..., exact.
 *  - weekly_n_times is a quota ("3 times this week", any days) with no
 *    fixed day pattern at all — RRULE has no way to express "N times,
 *    whichever days the user picks," so there is no faithful mapping,
 *    only a guess. Not attempted.
 *  - custom carries no structured recurrence data anywhere in this app
 *    (isScheduledOnDate treats it the same as "every day eligible", same
 *    as weekly_n_times) — nothing to map from, so equally unmappable.
 */
function rruleForSchedule(schedule: HabitSchedule): string | null {
  if (schedule.type === 'daily') return 'RRULE:FREQ=DAILY'
  if (schedule.type === 'specific_weekdays') {
    const days = schedule.params.weekdays ?? []
    if (days.length === 0) return null
    const byday = [...days].sort((a, b) => a - b).map((d) => ICAL_WEEKDAY[d]).join(',')
    return `RRULE:FREQ=WEEKLY;BYDAY=${byday}`
  }
  return null
}

/** For specific_weekdays, DTSTART's date should itself fall on one of the
 * BYDAY weekdays (RFC 5545 authoring convention, and better parser
 * compatibility) rather than an arbitrary "today" that might not match. */
function nextMatchingDate(fromDate: string, weekdays: number[]): string {
  let cursor = fromDate
  for (let i = 0; i < 7; i++) {
    if (weekdays.includes(weekdayOf(cursor))) return cursor
    cursor = addDays(cursor, 1)
  }
  return fromDate
}

function buildHabitEvent(habit: Habit, reminderTime: string, dtstartDate: string, rrule: string, now: Date): string[] {
  const uid = `${habit.id}-${reminderTime}@stoa.app`
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp(now)}`,
    `DTSTART:${floatingDateTime(dtstartDate, reminderTime)}`,
    rrule,
    `SUMMARY:${escapeIcsText(habit.name)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(habit.name)}`,
    'TRIGGER:PT0S',
    'END:VALARM',
    'END:VEVENT',
  ]
}

/**
 * Article 13 — strictly one-way, generate-once: nothing here reads back
 * from Calendar, and editing the Habit afterward has no effect on an
 * already-exported event. Re-export to pick up changes.
 */
export function buildHabitIcs(habit: Habit, now: Date = new Date(), asOfDate: string = todayKey()): IcsBuildResult {
  if (habit.reminderTimes.length === 0) return { ok: false, reason: 'no_reminder_times' }
  const rrule = rruleForSchedule(habit.schedule)
  if (!rrule) return { ok: false, reason: 'unmappable_schedule' }

  const dtstartDate =
    habit.schedule.type === 'specific_weekdays'
      ? nextMatchingDate(asOfDate, habit.schedule.params.weekdays ?? [])
      : asOfDate

  const events = habit.reminderTimes.map((rt) => buildHabitEvent(habit, rt, dtstartDate, rrule, now))
  return { ok: true, ics: buildCalendar(events), filename: `${sanitizeFilename(habit.name)}.ics` }
}

function buildTodoEvent(todo: Todo, now: Date): string[] {
  const uid = `${todo.id}@stoa.app`
  const lines = ['BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${dtstamp(now)}`]

  if (todo.scheduledTime) {
    lines.push(`DTSTART:${floatingDateTime(todo.dueDate!, todo.scheduledTime)}`)
  } else {
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(todo.dueDate!)}`)
  }
  lines.push(`SUMMARY:${escapeIcsText(todo.title)}`)
  lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcsText(todo.title)}`)
  // With a scheduledTime, the alarm fires exactly at the event's own start.
  // Without one (an all-day event has no time component to anchor to), default
  // to 9:00 local that same day — a reasonable "reminder for today" moment,
  // not a spec ambiguity, just a default since none was specified.
  lines.push(todo.scheduledTime ? 'TRIGGER:PT0S' : 'TRIGGER;VALUE=DURATION:PT9H')
  lines.push('END:VALARM', 'END:VEVENT')
  return lines
}

/** Article 13 — one-time event, never recurring, even for a recurring Todo
 * (Todo.recurrence regenerates a new instance in-app on completion; it has
 * no calendar-RRULE equivalent here, by explicit scope). */
export function buildTodoIcs(todo: Todo, now: Date = new Date()): IcsBuildResult {
  if (!todo.dueDate) return { ok: false, reason: 'no_due_date' }
  const events = [buildTodoEvent(todo, now)]
  return { ok: true, ics: buildCalendar(events), filename: `${sanitizeFilename(todo.title)}.ics` }
}
