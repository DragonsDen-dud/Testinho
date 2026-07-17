import { db } from '../db/db'
import { newId } from '../lib/id'
import { toDateKey, addDays } from '../lib/date'
import { isScheduledOnDate } from '../lib/habitStrength'
import { resolveQuietHoursDelivery } from '../lib/quietHours'
import { nextEscalationTiming } from '../lib/escalation'
import { deliverNotification, type NotifyFn } from '../lib/notify'
import { listActiveHabits } from './habits'
import { listActiveTodos } from './todos'
import { getReminderState } from './reminderActions'
import i18n from '../i18n/i18n'
import type { AppSettings, ReminderEntityType, ReminderState } from '../db/types'

export type { NotifyFn } from '../lib/notify'
export { acknowledgeReminder, dismissReminder, snoozeReminder } from './reminderActions'

const DEFAULT_ESCALATION_WINDOW_MINUTES = 45

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function timeOf(now: Date): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/**
 * Article 40/41 — creates the initial 'sent' reminder for one entity, if
 * none exists yet today. Respects quiet hours: queues (does nothing, tried
 * again next tick) or drops (records a terminal state without ever
 * notifying) rather than always firing outright.
 */
async function sendInitialReminderIfNeeded(
  entityType: ReminderEntityType,
  entityId: string,
  date: string,
  now: Date,
  quietHours: AppSettings['quietHours'],
  notify: NotifyFn,
  title: string,
  body: string,
): Promise<void> {
  const existing = await getReminderState(entityType, entityId, date)
  if (existing) return

  const decision = resolveQuietHoursDelivery(quietHours, date, now)
  if (decision === 'queue') return
  if (decision === 'drop') {
    await db.reminderStates.add({
      id: newId(),
      entityType,
      entityId,
      date,
      state: 'lapsed_for_day',
      sentAt: now.toISOString(),
      followUpSent: false,
    })
    return
  }

  notify(title, body)
  await db.reminderStates.add({
    id: newId(),
    entityType,
    entityId,
    date,
    state: 'sent',
    sentAt: now.toISOString(),
    followUpSent: false,
  })
}

/** Article 40 — advances one existing ReminderState by at most the single allowed follow-up. */
async function tickEscalationForState(
  state: ReminderState,
  now: Date,
  quietHours: AppSettings['quietHours'],
  notify: NotifyFn,
  title: string,
  body: string,
  escalationWindowMinutes: number,
): Promise<void> {
  const timing = nextEscalationTiming(state, now, escalationWindowMinutes)
  if (timing === 'none') return

  const decision = resolveQuietHoursDelivery(quietHours, state.date, now)
  if (decision === 'queue') return
  if (decision === 'drop') {
    await db.reminderStates.update(state.id, { state: 'lapsed_for_day' })
    return
  }

  notify(title, body)
  await db.reminderStates.update(state.id, {
    state: 'lapsed_for_day',
    followUpSent: true,
    lastActionAt: now.toISOString(),
  })
}

/** Article 42 — one push at the configured time, independent of individual reminders. */
async function maybeSendMorningDigest(
  spaceId: string,
  now: Date,
  settings: AppSettings,
  notify: NotifyFn,
): Promise<void> {
  const digest = settings.morningDigest
  if (!digest?.enabled) return

  const today = toDateKey(now)
  if (settings.morningDigestLastDeliveredDate === today) return
  if (timeOf(now) < digest.time) return

  const decision = resolveQuietHoursDelivery(settings.quietHours, today, now)
  if (decision === 'queue') return
  if (decision === 'drop') {
    await db.appSettings.update('singleton', { morningDigestLastDeliveredDate: today })
    return
  }

  const habits = await listActiveHabits(spaceId)
  const todaysHabits = habits.filter((h) => isScheduledOnDate(h, today))
  const todos = await listActiveTodos(spaceId)
  const todaysTodos = todos.filter((t) => t.status === 'open' && t.dueDate === today)

  const title = i18n.t('reminders.digestTitle', {
    habits: i18n.t('reminders.digestHabitCount', { count: todaysHabits.length }),
    tasks: i18n.t('reminders.digestTodoCount', { count: todaysTodos.length }),
  })
  notify(title, '')
  await db.appSettings.update('singleton', { morningDigestLastDeliveredDate: today })
}

/**
 * Articles 40/41/42 — the periodic check-on-open / foreground-poll tick.
 * Fires initial reminders whose time has passed, escalates any reminder
 * that's gone unanswered past its window (capped at one follow-up), and
 * sends the morning digest once. Safe to call repeatedly — every sub-step
 * is idempotent for a given entity+day.
 */
export async function tickReminders(
  spaceId: string,
  now: Date = new Date(),
  notify: NotifyFn = deliverNotification,
): Promise<void> {
  const settings = await db.appSettings.get('singleton')
  if (!settings) return
  const quietHours = settings.quietHours
  const date = toDateKey(now)
  const yesterday = addDays(date, -1)
  const nowTime = timeOf(now)
  const escalationWindowMinutes = DEFAULT_ESCALATION_WINDOW_MINUTES

  // Article 41 — a reminder queued during quiet hours can spill its actual
  // delivery into the next calendar day (a wrapping window like 22:00-07:00),
  // so yesterday needs re-checking too in that case. Gated strictly on quiet
  // hours being enabled: without them, "yesterday's reminder never fired"
  // just means it was missed (app wasn't open), not queued — retroactively
  // firing it the next day regardless would flood a user who opens the app
  // infrequently with a backlog of stale reminders, exactly what Article 41
  // says must never happen ("not showing up stale tomorrow").
  const checkDates = quietHours?.enabled ? [date, yesterday] : [date]

  const habits = await listActiveHabits(spaceId)
  for (const habit of habits) {
    for (const checkDate of checkDates) {
      if (!isScheduledOnDate(habit, checkDate)) continue
      const dueTimeFloor = checkDate === date ? nowTime : '23:59' // any reminderTime on a past day has already passed
      const due = habit.reminderTimes.some((rt) => rt <= dueTimeFloor)
      if (!due) continue
      await sendInitialReminderIfNeeded(
        'habit',
        habit.id,
        checkDate,
        now,
        quietHours,
        notify,
        habit.name,
        i18n.t('reminders.habitBody'),
      )
    }
  }

  const todos = await listActiveTodos(spaceId)
  for (const todo of todos) {
    if (todo.status !== 'open' || !todo.scheduledTime) continue
    for (const checkDate of checkDates) {
      if (todo.dueDate !== checkDate) continue
      const dueTimeFloor = checkDate === date ? nowTime : '23:59'
      if (todo.scheduledTime > dueTimeFloor) continue
      await sendInitialReminderIfNeeded(
        'todo',
        todo.id,
        checkDate,
        now,
        quietHours,
        notify,
        todo.title,
        i18n.t('reminders.todoBody'),
      )
    }
  }

  // Same lookback for escalation: a reminder sent late enough that its
  // 45-minute follow-up window crosses midnight is still keyed to
  // yesterday's date and needs to stay reachable on the next tick.
  const activeStates = await db.reminderStates
    .where('date')
    .anyOf([date, yesterday])
    .filter((s) => s.state === 'sent' || s.state === 'snoozed')
    .toArray()
  for (const state of activeStates) {
    const name =
      state.entityType === 'habit'
        ? (await db.habits.get(state.entityId))?.name
        : (await db.todos.get(state.entityId))?.title
    if (!name) continue
    await tickEscalationForState(state, now, quietHours, notify, name, i18n.t('reminders.followUpBody'), escalationWindowMinutes)
  }

  await maybeSendMorningDigest(spaceId, now, settings, notify)
}
