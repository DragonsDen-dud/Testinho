import { computeTodoReminderTrigger } from './reminderTiming'
import type { Todo } from '../db/types'

/**
 * Article B.3 — the exact pieces a task row's metadata line composes from,
 * left to right: [Due date/time] · [Reminder offset, if set] · [Snooze
 * count, if >0] · [Calendar tag, if exported]. Kept as plain data (not
 * JSX/translated strings) so TodoItem.tsx and TaskCard.tsx — two different
 * visual treatments of the same Todo — render identical information from
 * one shared computation instead of two independently-maintained readings
 * of the same fields.
 */
export interface TodoMetadataPieces {
  /** HH:mm the reminder actually fires at, only set when it differs from
   * the due time itself (i.e. offsetMinutes > 0) — showing "6:00 PM ·
   * Reminder 5:30 PM" is useful; showing "6:00 PM · Reminder 6:00 PM"
   * would just be the same time twice. */
  reminderTime?: string
  /** Reminder is on, at exactly the due time (offset 0) — render a bare
   * "Reminder" chip with no time, per B.3's own worked example. */
  reminderAtDueTime: boolean
  showCalendarTag: boolean
  snoozeCount: number
}

export function todoMetadataPieces(todo: Todo): TodoMetadataPieces {
  const offset = todo.reminderOffsetMinutes ?? 0
  const hasReminder = !!todo.reminderEnabled && !!todo.dueDate && !!todo.scheduledTime

  let reminderTime: string | undefined
  if (hasReminder && offset > 0) {
    const trigger = computeTodoReminderTrigger(todo.dueDate!, todo.scheduledTime!, offset)
    reminderTime = `${String(trigger.getHours()).padStart(2, '0')}:${String(trigger.getMinutes()).padStart(2, '0')}`
  }

  return {
    reminderTime,
    reminderAtDueTime: hasReminder && offset === 0,
    showCalendarTag: !!todo.calendarExportedAt,
    snoozeCount: todo.snoozeCount ?? 0,
  }
}
