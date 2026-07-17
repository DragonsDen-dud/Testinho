import { describe, expect, it } from 'vitest'
import { buildHabitIcs, buildTodoIcs } from './ics'
import type { Habit, Todo } from '../db/types'

const NOW = new Date('2026-07-17T12:00:00.000Z')
const TODAY = '2026-07-17' // a Friday

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    spaceId: 's1',
    name: 'Read',
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: ['09:00'],
    criticalReminder: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    spaceId: 's1',
    title: 'Pay rent',
    criticalReminder: true,
    status: 'open',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildHabitIcs (Article 13)', () => {
  it('produces structurally valid VCALENDAR/VEVENT wrapping with CRLF line endings', () => {
    const result = buildHabitIcs(habit(), NOW, TODAY)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).toContain('BEGIN:VCALENDAR\r\n')
    expect(result.ics).toContain('VERSION:2.0\r\n')
    expect(result.ics).toContain('BEGIN:VEVENT\r\n')
    expect(result.ics).toContain('END:VEVENT\r\n')
    expect(result.ics.trim().endsWith('END:VCALENDAR')).toBe(true)
  })

  it('maps a daily schedule to RRULE:FREQ=DAILY, anchored today', () => {
    const result = buildHabitIcs(habit({ schedule: { type: 'daily', params: {} } }), NOW, TODAY)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).toContain('RRULE:FREQ=DAILY')
    expect(result.ics).toContain('DTSTART:20260717T090000')
  })

  it('maps specific_weekdays to RRULE:FREQ=WEEKLY;BYDAY, sorted and de-duplicated by weekday order', () => {
    // Monday(1), Wednesday(3), Friday(5)
    const result = buildHabitIcs(
      habit({ schedule: { type: 'specific_weekdays', params: { weekdays: [5, 1, 3] } } }),
      NOW,
      TODAY,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')
  })

  it('anchors DTSTART to the next date matching one of the specific weekdays, not an arbitrary today', () => {
    // TODAY (2026-07-17) is a Friday. Schedule only on Sunday (0) and Tuesday (2) —
    // next match from Friday is Sunday 2026-07-19.
    const result = buildHabitIcs(
      habit({ schedule: { type: 'specific_weekdays', params: { weekdays: [0, 2] } } }),
      NOW,
      TODAY,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).toContain('DTSTART:20260719T090000')
  })

  it('uses today directly when today itself matches one of the specific weekdays', () => {
    // TODAY is a Friday (5).
    const result = buildHabitIcs(
      habit({ schedule: { type: 'specific_weekdays', params: { weekdays: [5] } } }),
      NOW,
      TODAY,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).toContain('DTSTART:20260717T090000')
  })

  it('flags weekly_n_times as unmappable rather than guessing which days', () => {
    const result = buildHabitIcs(habit({ schedule: { type: 'weekly_n_times', params: { n: 3 } } }), NOW, TODAY)
    expect(result).toEqual({ ok: false, reason: 'unmappable_schedule' })
  })

  it('flags custom as unmappable rather than guessing', () => {
    const result = buildHabitIcs(habit({ schedule: { type: 'custom', params: {} } }), NOW, TODAY)
    expect(result).toEqual({ ok: false, reason: 'unmappable_schedule' })
  })

  it('refuses habits with no reminder times, before even considering the schedule', () => {
    const result = buildHabitIcs(habit({ reminderTimes: [] }), NOW, TODAY)
    expect(result).toEqual({ ok: false, reason: 'no_reminder_times' })
  })

  it('generates one VEVENT per reminder time, each with its own VALARM firing at that time', () => {
    const result = buildHabitIcs(habit({ reminderTimes: ['07:30', '20:00'] }), NOW, TODAY)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(result.ics.match(/BEGIN:VALARM/g)).toHaveLength(2)
    expect(result.ics).toContain('DTSTART:20260717T073000')
    expect(result.ics).toContain('DTSTART:20260717T200000')
    expect(result.ics.match(/TRIGGER:PT0S/g)).toHaveLength(2)
  })

  it('escapes commas, semicolons, and backslashes in the habit name', () => {
    const result = buildHabitIcs(habit({ name: 'Read; write, and edit\\revise' }), NOW, TODAY)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).toContain('SUMMARY:Read\\; write\\, and edit\\\\revise')
  })

  it('produces a deterministic, distinct UID per reminder time', () => {
    const result = buildHabitIcs(habit({ reminderTimes: ['07:00', '19:00'] }), NOW, TODAY)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).toContain('UID:habit-1-07:00@stoa.app')
    expect(result.ics).toContain('UID:habit-1-19:00@stoa.app')
  })
})

describe('buildTodoIcs (Article 13)', () => {
  it('refuses a todo with no due date', () => {
    const result = buildTodoIcs(todo({ dueDate: undefined }), NOW)
    expect(result).toEqual({ ok: false, reason: 'no_due_date' })
  })

  it('generates a timed one-time event when scheduledTime is set, alarm at the exact time', () => {
    const result = buildTodoIcs(todo({ dueDate: '2026-07-20', scheduledTime: '14:30' }), NOW)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).toContain('DTSTART:20260720T143000')
    expect(result.ics).toContain('TRIGGER:PT0S')
    expect(result.ics).not.toContain('RRULE') // Article 13 scope: Todos are one-time, never recurring
  })

  it('generates an all-day event when scheduledTime is not set, alarm defaulting to 9am', () => {
    const result = buildTodoIcs(todo({ dueDate: '2026-07-20', scheduledTime: undefined }), NOW)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).toContain('DTSTART;VALUE=DATE:20260720')
    expect(result.ics).toContain('TRIGGER;VALUE=DURATION:PT9H')
  })

  it('never generates an RRULE even for a recurring Todo — one-time export only, by explicit scope', () => {
    const result = buildTodoIcs(
      todo({ dueDate: '2026-07-20', recurrence: { type: 'weekly', params: { interval: 1 } } }),
      NOW,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).not.toContain('RRULE')
    expect(result.ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
  })

  it('escapes special characters in the title', () => {
    const result = buildTodoIcs(todo({ title: 'Buy milk, eggs; call mom', dueDate: '2026-07-20' }), NOW)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ics).toContain('SUMMARY:Buy milk\\, eggs\\; call mom')
  })
})
