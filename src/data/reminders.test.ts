import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, ensureAppSettings } from '../db/db'
import { tickReminders } from './reminders'
import { acknowledgeReminder, dismissReminder, snoozeReminder } from './reminderActions'
import { createHabit, logHabit } from './habits'
import { createTodo, markTodoDone } from './todos'
import type { NewHabitInput } from './habits'
import type { NewTodoInput } from './todos'

const SPACE_ID = 'space-1'

function habitInput(name: string, reminderTimes: string[] = ['09:00']): NewHabitInput {
  return {
    spaceId: SPACE_ID,
    name,
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes,
    criticalReminder: false,
  }
}

// Article B.2 — reminderEnabled is now a distinct, explicit opt-in; every
// existing call site in this file expects its todo's reminder to actually
// fire, so the helper sets it (at the default "at due time" offset) rather
// than repeating it at every call site.
function todoInput(title: string, dueDate: string, scheduledTime: string): NewTodoInput {
  return {
    spaceId: SPACE_ID,
    title,
    dueDate,
    scheduledTime,
    criticalReminder: false,
    reminderEnabled: true,
    reminderOffsetMinutes: 0,
  }
}

beforeEach(async () => {
  await db.appSettings.clear()
  await db.habits.clear()
  await db.habitLogs.clear()
  await db.todos.clear()
  await db.reminderStates.clear()
  await ensureAppSettings()
})

describe('tickReminders — initial firing (Articles 40/41)', () => {
  it('fires a habit reminder once its time has passed, creating a "sent" ReminderState', async () => {
    const habit = await createHabit(habitInput('Read', ['09:00']))
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 5), notify) // Thu 09:05

    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledWith('Read', expect.any(String))
    const state = await db.reminderStates.where('[entityType+entityId+date]').equals(['habit', habit.id, '2026-07-16']).first()
    expect(state?.state).toBe('sent')
    expect(state?.followUpSent).toBe(false)
  })

  it('does not fire before the reminder time', async () => {
    await createHabit(habitInput('Read', ['09:00']))
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 8, 0), notify)

    expect(notify).not.toHaveBeenCalled()
    expect(await db.reminderStates.count()).toBe(0)
  })

  it('does not fire twice for the same day even across repeated ticks', async () => {
    await createHabit(habitInput('Read', ['09:00']))
    const notify = vi.fn()

    // All three ticks stay within the 45-min escalation window, so this
    // isolates "no duplicate initial send" from the separate follow-up path.
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 5), notify)
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 10), notify)
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 20), notify)

    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('fires a todo reminder at its scheduledTime when due today', async () => {
    const todo = await createTodo(todoInput('Pay rent', '2026-07-16', '09:00'))
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), notify)

    expect(notify).toHaveBeenCalledWith('Pay rent', expect.any(String))
    const state = await db.reminderStates.where('[entityType+entityId+date]').equals(['todo', todo.id, '2026-07-16']).first()
    expect(state?.state).toBe('sent')
  })

  it('a todo with a dueDate but no scheduledTime never fires a reminder, even with reminderEnabled true — there is no time to compute a trigger from', async () => {
    await createTodo({
      spaceId: SPACE_ID,
      title: 'Pay rent',
      dueDate: '2026-07-16',
      criticalReminder: false,
      reminderEnabled: true,
    })
    const notify = vi.fn()

    // Well past any reasonable time-of-day, and again the next day, to rule
    // out "just hasn't reached its time yet" rather than "never fires at all".
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 23, 59), notify)
    await tickReminders(SPACE_ID, new Date(2026, 6, 17, 12, 0), notify)

    expect(notify).not.toHaveBeenCalled()
    expect(await db.reminderStates.count()).toBe(0)
  })

  it('Article B.2 State 3 — a todo with scheduledTime set but reminderEnabled left off never fires, even well past its time', async () => {
    await createTodo({
      spaceId: SPACE_ID,
      title: 'Pay rent',
      dueDate: '2026-07-16',
      scheduledTime: '09:00',
      criticalReminder: false,
      // reminderEnabled intentionally omitted — must never be inferred
      // from scheduledTime's mere presence.
    })
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 23, 59), notify)

    expect(notify).not.toHaveBeenCalled()
    expect(await db.reminderStates.count()).toBe(0)
  })

  describe('Article B.2 — reminder offset', () => {
    it('"30 minutes before" fires 30 minutes ahead of the due datetime, on the same calendar day', async () => {
      const todo = await createTodo({
        spaceId: SPACE_ID,
        title: 'Pick up prescription',
        dueDate: '2026-07-16',
        scheduledTime: '09:00',
        criticalReminder: false,
        reminderEnabled: true,
        reminderOffsetMinutes: 30,
      })
      const notify = vi.fn()

      await tickReminders(SPACE_ID, new Date(2026, 6, 16, 8, 29), notify)
      expect(notify).not.toHaveBeenCalled()

      await tickReminders(SPACE_ID, new Date(2026, 6, 16, 8, 30), notify)
      expect(notify).toHaveBeenCalledWith('Pick up prescription', expect.any(String))
      const state = await db.reminderStates
        .where('[entityType+entityId+date]')
        .equals(['todo', todo.id, '2026-07-16'])
        .first()
      expect(state?.state).toBe('sent')
    })

    it('"1 day before" fires the day before dueDate and keys ReminderState to that earlier day, not dueDate', async () => {
      const todo = await createTodo({
        spaceId: SPACE_ID,
        title: 'Submit report',
        dueDate: '2026-07-16',
        scheduledTime: '09:00',
        criticalReminder: false,
        reminderEnabled: true,
        reminderOffsetMinutes: 1440,
      })
      const notify = vi.fn()

      // Still the 15th, but past 09:00 — should already have fired.
      await tickReminders(SPACE_ID, new Date(2026, 6, 15, 9, 5), notify)

      expect(notify).toHaveBeenCalledWith('Submit report', expect.any(String))
      const stateOnDueDate = await db.reminderStates
        .where('[entityType+entityId+date]')
        .equals(['todo', todo.id, '2026-07-16'])
        .first()
      expect(stateOnDueDate).toBeUndefined() // not keyed to dueDate itself
      const stateOnTriggerDay = await db.reminderStates
        .where('[entityType+entityId+date]')
        .equals(['todo', todo.id, '2026-07-15'])
        .first()
      expect(stateOnTriggerDay?.state).toBe('sent')
    })
  })

  describe('quiet hours (Article 41)', () => {
    it('queues instead of firing when the reminder time falls inside quiet hours', async () => {
      await db.appSettings.update('singleton', { quietHours: { enabled: true, start: '22:00', end: '07:00' } })
      await createHabit(habitInput('Read', ['23:00']))
      const notify = vi.fn()

      await tickReminders(SPACE_ID, new Date(2026, 6, 16, 23, 30), notify)

      expect(notify).not.toHaveBeenCalled()
      expect(await db.reminderStates.count()).toBe(0) // nothing recorded yet — still queued, will retry
    })

    it('delivers the queued reminder once a later tick crosses past quiet hours end', async () => {
      await db.appSettings.update('singleton', { quietHours: { enabled: true, start: '22:00', end: '07:00' } })
      await createHabit(habitInput('Read', ['23:00']))
      const notify = vi.fn()

      await tickReminders(SPACE_ID, new Date(2026, 6, 16, 23, 30), notify) // queued
      await tickReminders(SPACE_ID, new Date(2026, 6, 17, 7, 30), notify) // past quiet hours end

      expect(notify).toHaveBeenCalledTimes(1)
      const state = await db.reminderStates.where('[entityType+entityId+date]').equals(['habit', (await db.habits.toArray())[0].id, '2026-07-16']).first()
      expect(state?.state).toBe('sent')
    })

    it('never fires once the day is genuinely over, instead recording an explicit lapsed_for_day state', async () => {
      // A one-off todo (not a recurring daily habit) isolates staleness
      // cleanly — a daily habit would have a legitimately new, non-stale
      // occurrence the very next day that could confound this check.
      //
      // Article B.2 note: a Todo's trigger instant is computed directly
      // from (dueDate, scheduledTime, offset) and re-evaluated on every
      // tick regardless of how many days have passed (unlike the Habit
      // loop above, which only walks a fixed [today, yesterday] lookback)
      // — an offset like "1 day before" requires this, since it must still
      // be found on a tick that happens well after its own trigger day.
      // That means a long-unopened stale todo now correctly reaches
      // resolveQuietHoursDelivery's own 'drop' path and gets an explicit
      // lapsed_for_day record, rather than silently never being
      // reconsidered at all once outside a 1-day lookback window.
      await db.appSettings.update('singleton', { quietHours: { enabled: true, start: '22:00', end: '07:00' } })
      const todo = await createTodo(todoInput('One-off task', '2026-07-16', '23:00'))
      const notify = vi.fn()

      await tickReminders(SPACE_ID, new Date(2026, 6, 16, 23, 30), notify) // queued
      await tickReminders(SPACE_ID, new Date(2026, 6, 18, 8, 0), notify) // two days later — stale

      expect(notify).not.toHaveBeenCalled() // never actually notified
      const state = await db.reminderStates
        .where('[entityType+entityId+date]')
        .equals(['todo', todo.id, '2026-07-16'])
        .first()
      expect(state?.state).toBe('lapsed_for_day')
    })
  })
})

describe('tickReminders — escalation (Article 40)', () => {
  it('sends exactly one follow-up nudge once the escalation window elapses with no action', async () => {
    const habit = await createHabit(habitInput('Read', ['09:00']))
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), notify) // initial sent
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 44), notify) // before window (45 min)
    expect(notify).toHaveBeenCalledTimes(1)

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 46), notify) // past window
    expect(notify).toHaveBeenCalledTimes(2)

    const state = await db.reminderStates.where('[entityType+entityId+date]').equals(['habit', habit.id, '2026-07-16']).first()
    expect(state?.state).toBe('lapsed_for_day')
    expect(state?.followUpSent).toBe(true)
  })

  it('the hard cap: repeated ticks after the follow-up never send a third notification', async () => {
    await createHabit(habitInput('Read', ['09:00']))
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), notify)
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 46), notify) // follow-up fires here
    notify.mockClear()

    // Many more ticks throughout the rest of the day.
    for (const hour of [10, 12, 15, 18, 21, 23]) {
      await tickReminders(SPACE_ID, new Date(2026, 6, 16, hour, 0), notify)
    }

    expect(notify).not.toHaveBeenCalled()
  })

  it('acknowledging (logging the habit) stops escalation — no follow-up fires afterward', async () => {
    const habit = await createHabit(habitInput('Read', ['09:00']))
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), notify)
    await logHabit(habit.id, '2026-07-16', 'done')
    notify.mockClear()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 10, 0), notify) // well past the escalation window

    expect(notify).not.toHaveBeenCalled()
    const state = await db.reminderStates.where('[entityType+entityId+date]').equals(['habit', habit.id, '2026-07-16']).first()
    expect(state?.state).toBe('acknowledged')
  })

  it('acknowledges on not_done/skip too, not just done', async () => {
    const habit = await createHabit(habitInput('Read', ['09:00']))
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), vi.fn())
    await logHabit(habit.id, '2026-07-16', 'skip')

    const state = await db.reminderStates.where('[entityType+entityId+date]').equals(['habit', habit.id, '2026-07-16']).first()
    expect(state?.state).toBe('acknowledged')
  })

  it('completing a todo acknowledges its reminder', async () => {
    const todo = await createTodo(todoInput('Pay rent', '2026-07-16', '09:00'))
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), vi.fn())
    await markTodoDone(todo.id)

    const state = await db.reminderStates.where('[entityType+entityId+date]').equals(['todo', todo.id, '2026-07-16']).first()
    expect(state?.state).toBe('acknowledged')
  })

  it('dismiss stops escalation immediately, distinguishable in state from lapsed_for_day', async () => {
    const habit = await createHabit(habitInput('Read', ['09:00']))
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), vi.fn())
    await dismissReminder('habit', habit.id, '2026-07-16')

    const state = await db.reminderStates.where('[entityType+entityId+date]').equals(['habit', habit.id, '2026-07-16']).first()
    expect(state?.state).toBe('dismissed')

    const notify = vi.fn()
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 12, 0), notify)
    expect(notify).not.toHaveBeenCalled()
  })

  it('snooze reschedules the one pending follow-up rather than sending an extra one', async () => {
    const habit = await createHabit(habitInput('Read', ['09:00']))
    const notify = vi.fn()
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), notify) // initial send
    notify.mockClear()
    await snoozeReminder('habit', habit.id, '2026-07-16', 30, new Date(2026, 6, 16, 9, 10))

    // Original 45-min window would have elapsed by 9:45, but snooze pushed it to 9:40.
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 35), notify)
    expect(notify).not.toHaveBeenCalled() // not yet — snoozed until 9:40

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 41), notify)
    expect(notify).toHaveBeenCalledTimes(1) // the one follow-up, now delivered

    const state = await db.reminderStates.where('[entityType+entityId+date]').equals(['habit', habit.id, '2026-07-16']).first()
    expect(state?.state).toBe('lapsed_for_day')
    expect(state?.followUpSent).toBe(true)
  })

  it('Article B.2 State 6 — snoozing a todo reminder bumps its durable, user-visible snoozeCount', async () => {
    const todo = await createTodo(todoInput('Pay rent', '2026-07-16', '09:00'))
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), vi.fn()) // initial send

    expect((await db.todos.get(todo.id))?.snoozeCount).toBeUndefined()

    await snoozeReminder('todo', todo.id, '2026-07-16', 30, new Date(2026, 6, 16, 9, 10))
    expect((await db.todos.get(todo.id))?.snoozeCount).toBe(1)

    await snoozeReminder('todo', todo.id, '2026-07-16', 30, new Date(2026, 6, 16, 9, 41))
    expect((await db.todos.get(todo.id))?.snoozeCount).toBe(2)
  })

  it('snoozing after the follow-up already fired is a no-op — the cap is not reset', async () => {
    const habit = await createHabit(habitInput('Read', ['09:00']))
    const notify = vi.fn()
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), notify)
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 46), notify) // follow-up fires
    notify.mockClear()

    await snoozeReminder('habit', habit.id, '2026-07-16', 30, new Date(2026, 6, 16, 10, 0))
    const state = await db.reminderStates.where('[entityType+entityId+date]').equals(['habit', habit.id, '2026-07-16']).first()
    expect(state?.state).toBe('lapsed_for_day') // unchanged — snooze refused to touch it

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 23, 0), notify)
    expect(notify).not.toHaveBeenCalled()
  })

  it('acknowledgeReminder is a harmless no-op with no active reminder', async () => {
    await expect(acknowledgeReminder('habit', 'nonexistent', '2026-07-16')).resolves.toBeUndefined()
  })
})

describe('tickReminders — morning digest (Article 42)', () => {
  it('fires once at the configured time, summarizing today\'s counts', async () => {
    await db.appSettings.update('singleton', { morningDigest: { enabled: true, time: '08:00' } })
    await createHabit(habitInput('Read', []))
    await createHabit(habitInput('Meditate', []))
    await createTodo(todoInput('Pay rent', '2026-07-16', '09:00'))
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 8, 0), notify)

    expect(notify).toHaveBeenCalledWith(expect.stringContaining('2'), expect.any(String))
    const settings = await db.appSettings.get('singleton')
    expect(settings?.morningDigestLastDeliveredDate).toBe('2026-07-16')
  })

  it('does not fire twice the same day', async () => {
    await db.appSettings.update('singleton', { morningDigest: { enabled: true, time: '08:00' } })
    await createHabit(habitInput('Read', []))
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 8, 5), notify)
    notify.mockClear()
    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), notify)

    // habit has no reminderTimes so the only possible call here is a second digest
    expect(notify).not.toHaveBeenCalled()
  })

  it('does not fire before the configured time', async () => {
    await db.appSettings.update('singleton', { morningDigest: { enabled: true, time: '08:00' } })
    await createHabit(habitInput('Read', []))
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 7, 0), notify)

    expect(notify).not.toHaveBeenCalled()
  })

  it('digest being off does not silence individual reminders', async () => {
    await db.appSettings.update('singleton', { morningDigest: { enabled: false, time: '08:00' } })
    await createHabit(habitInput('Read', ['09:00']))
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 9, 0), notify)

    expect(notify).toHaveBeenCalledWith('Read', expect.any(String))
  })

  it('individual reminders being effectively absent (no reminderTimes) does not silence the digest', async () => {
    await db.appSettings.update('singleton', { morningDigest: { enabled: true, time: '08:00' } })
    await createHabit(habitInput('Read', [])) // no reminderTimes at all
    const notify = vi.fn()

    await tickReminders(SPACE_ID, new Date(2026, 6, 16, 8, 0), notify)

    expect(notify).toHaveBeenCalledTimes(1) // the digest itself
  })
})
