import { describe, expect, it } from 'vitest'
import { computeTodoReminderTrigger, todoReminderTriggerDateKey } from './reminderTiming'

describe('computeTodoReminderTrigger', () => {
  it('offset 0 ("at due time") equals the due datetime exactly', () => {
    const trigger = computeTodoReminderTrigger('2026-07-16', '18:00', 0)
    expect(trigger).toEqual(new Date(2026, 6, 16, 18, 0, 0, 0))
  })

  it('a 30-minute offset subtracts 30 minutes, same day', () => {
    const trigger = computeTodoReminderTrigger('2026-07-16', '09:00', 30)
    expect(trigger).toEqual(new Date(2026, 6, 16, 8, 30, 0, 0))
  })

  it('a 1-day (1440 min) offset lands on the previous calendar day, same time', () => {
    const trigger = computeTodoReminderTrigger('2026-07-16', '09:00', 1440)
    expect(trigger).toEqual(new Date(2026, 6, 15, 9, 0, 0, 0))
  })

  it('an offset larger than the time-of-day itself correctly rolls back a calendar day (not just wraps the clock)', () => {
    // 00:15 minus 30 minutes must land on the previous day at 23:45, not
    // wrap to 23:45 the *same* day or clamp at midnight.
    const trigger = computeTodoReminderTrigger('2026-07-16', '00:15', 30)
    expect(trigger).toEqual(new Date(2026, 6, 15, 23, 45, 0, 0))
  })
})

describe('todoReminderTriggerDateKey', () => {
  it('matches dueDate when the offset keeps the trigger on the same day', () => {
    expect(todoReminderTriggerDateKey('2026-07-16', '09:00', 30)).toBe('2026-07-16')
  })

  it('is one day earlier than dueDate for a 1-day-before offset', () => {
    expect(todoReminderTriggerDateKey('2026-07-16', '09:00', 1440)).toBe('2026-07-15')
  })
})
