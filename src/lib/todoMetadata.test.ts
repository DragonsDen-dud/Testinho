import { describe, expect, it } from 'vitest'
import { todoMetadataPieces } from './todoMetadata'
import type { Todo } from '../db/types'

function baseTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 't1',
    spaceId: 's1',
    title: 'Test task',
    criticalReminder: false,
    status: 'open',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('todoMetadataPieces', () => {
  it('a plain todo with no reminder/snooze/export has all pieces empty', () => {
    const pieces = todoMetadataPieces(baseTodo())
    expect(pieces.reminderAtDueTime).toBe(false)
    expect(pieces.reminderTime).toBeUndefined()
    expect(pieces.snoozeCount).toBe(0)
    expect(pieces.showCalendarTag).toBe(false)
  })

  it('reminderEnabled at offset 0 sets reminderAtDueTime, no reminderTime (would just repeat the due time)', () => {
    const pieces = todoMetadataPieces(
      baseTodo({ dueDate: '2026-07-16', scheduledTime: '18:00', reminderEnabled: true, reminderOffsetMinutes: 0 }),
    )
    expect(pieces.reminderAtDueTime).toBe(true)
    expect(pieces.reminderTime).toBeUndefined()
  })

  it('reminderEnabled with a positive offset sets reminderTime to the actual computed clock time', () => {
    const pieces = todoMetadataPieces(
      baseTodo({ dueDate: '2026-07-16', scheduledTime: '18:00', reminderEnabled: true, reminderOffsetMinutes: 30 }),
    )
    expect(pieces.reminderAtDueTime).toBe(false)
    expect(pieces.reminderTime).toBe('17:30')
  })

  it('reminderEnabled without a scheduledTime never yields a reminder piece — nothing to compute from', () => {
    const pieces = todoMetadataPieces(baseTodo({ dueDate: '2026-07-16', reminderEnabled: true }))
    expect(pieces.reminderAtDueTime).toBe(false)
    expect(pieces.reminderTime).toBeUndefined()
  })

  it('surfaces snoozeCount as-is, defaulting to 0 when unset', () => {
    expect(todoMetadataPieces(baseTodo({ snoozeCount: 3 })).snoozeCount).toBe(3)
    expect(todoMetadataPieces(baseTodo()).snoozeCount).toBe(0)
  })

  it('showCalendarTag reflects whether calendarExportedAt is set, regardless of its value', () => {
    expect(todoMetadataPieces(baseTodo({ calendarExportedAt: '2026-07-01T00:00:00.000Z' })).showCalendarTag).toBe(true)
    expect(todoMetadataPieces(baseTodo()).showCalendarTag).toBe(false)
  })
})
