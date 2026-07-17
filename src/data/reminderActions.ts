import { db } from '../db/db'
import type { ReminderEntityType, ReminderState } from '../db/types'

/**
 * Article 40 — the plain state-mutation half of the reminder system, kept
 * separate from data/reminders.ts (which orchestrates scanning habits/todos
 * and firing notifications) specifically so data/habits.ts and data/todos.ts
 * can call acknowledgeReminder without a circular import back through the
 * files that already depend on them.
 */
export async function getReminderState(
  entityType: ReminderEntityType,
  entityId: string,
  date: string,
): Promise<ReminderState | undefined> {
  return db.reminderStates.where('[entityType+entityId+date]').equals([entityType, entityId, date]).first()
}

/** Stops escalation immediately because the user actually did the thing. Called from
 * logHabit/logMeasurableEntry/markTodoDone — never needs an explicit UI action. */
export async function acknowledgeReminder(
  entityType: ReminderEntityType,
  entityId: string,
  date: string,
  now: Date = new Date(),
): Promise<void> {
  const existing = await getReminderState(entityType, entityId, date)
  if (!existing) return
  if (existing.state === 'acknowledged' || existing.state === 'dismissed' || existing.state === 'lapsed_for_day') return
  await db.reminderStates.update(existing.id, { state: 'acknowledged', lastActionAt: now.toISOString() })
}

/** Explicit "not now" — stops escalation immediately, same effect as lapsed_for_day
 * but kept distinguishable in state for later analytics. */
export async function dismissReminder(
  entityType: ReminderEntityType,
  entityId: string,
  date: string,
  now: Date = new Date(),
): Promise<void> {
  const existing = await getReminderState(entityType, entityId, date)
  if (!existing) return
  await db.reminderStates.update(existing.id, { state: 'dismissed', lastActionAt: now.toISOString() })
}

/** Reschedules the one still-pending follow-up nudge to now+minutes. A no-op once the
 * follow-up has already fired — there's nothing left to reschedule. */
export async function snoozeReminder(
  entityType: ReminderEntityType,
  entityId: string,
  date: string,
  minutes: 30 | 60,
  now: Date = new Date(),
): Promise<void> {
  const existing = await getReminderState(entityType, entityId, date)
  if (!existing || existing.followUpSent) return
  const snoozeUntil = new Date(now.getTime() + minutes * 60000).toISOString()
  await db.reminderStates.update(existing.id, { state: 'snoozed', snoozeUntil, lastActionAt: now.toISOString() })
}
