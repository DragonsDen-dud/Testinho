import type { Habit, HabitLog } from '../db/types'
import { addDays, todayKey, weekdayOf, weekKeyOf } from './date'

const GROWTH_RATE = 0.15

/** Article 21 — true while dateKey falls within the habit's pause window. */
export function isPausedOnDate(habit: Habit, dateKey: string): boolean {
  if (!habit.pausedFrom || !habit.pausedUntil) return false
  return dateKey >= habit.pausedFrom && dateKey <= habit.pausedUntil
}

export function isScheduledOnDate(habit: Habit, dateKey: string): boolean {
  if (isPausedOnDate(habit, dateKey)) return false
  const { type, params } = habit.schedule
  if (type === 'specific_weekdays') {
    return (params.weekdays ?? []).includes(weekdayOf(dateKey))
  }
  // daily, weekly_n_times, and custom are treated as "every day is eligible" —
  // weekly_n_times evaluates its quota over a rolling week instead of per-day.
  return true
}

function logByDate(logs: HabitLog[]): Map<string, HabitLog> {
  const map = new Map<string, HabitLog>()
  for (const log of logs) map.set(log.date, log)
  return map
}

/** Black-screen incident fix — every function below walks dates starting
 * from habit.createdAt.slice(0, 10), which crashed the whole app with an
 * uncaught TypeError the moment a real habit turned up with a missing/
 * malformed createdAt (confirmed reproducing the exact "opens to a blank
 * screen" symptom). createdAt is typed as always a real string, but nothing
 * in this local-first app validates old/imported records at the IndexedDB
 * boundary, so trusting the type here was the actual bug. Falls back to
 * asOfDate itself — "we don't know when this started, so don't claim any
 * history for it" — rather than crash or walk back indefinitely. */
export function safeCreatedDate(habit: Habit, asOfDate: string): string {
  return typeof habit.createdAt === 'string' ? habit.createdAt.slice(0, 10) : asOfDate
}

/**
 * Proportional decaying Habit Strength (0-100), per Article A/21.
 * Grows toward 100 on completed scheduled days, decays toward 0 on missed
 * scheduled days. Paused and skip days are excluded entirely, so Strength
 * stays frozen at its last value for the duration of a pause (Article 21).
 */
export function computeHabitStrength(habit: Habit, logs: HabitLog[], asOfDate: string = todayKey()): number {
  const byDate = logByDate(logs)
  let strength = 0

  if (habit.schedule.type === 'weekly_n_times') {
    const target = habit.schedule.params.n ?? 1
    const weeks = new Map<string, { done: number; days: string[] }>()
    let cursor = safeCreatedDate(habit, asOfDate)
    while (cursor <= asOfDate) {
      if (isPausedOnDate(habit, cursor)) {
        // Excluded entirely (Article 21) — a week made up only of paused
        // days never gets a bucket, so it can't move strength at all.
        cursor = addDays(cursor, 1)
        continue
      }
      const wk = weekKeyOf(cursor)
      if (!weeks.has(wk)) weeks.set(wk, { done: 0, days: [] })
      const bucket = weeks.get(wk)!
      bucket.days.push(cursor)
      const log = byDate.get(cursor)
      if (log && log.status === 'done') bucket.done += 1
      cursor = addDays(cursor, 1)
    }
    for (const [, bucket] of weeks) {
      // Only weight a week once it has produced at least one day of data,
      // so the current in-progress week still nudges strength gently.
      const ratio = Math.min(bucket.done / target, 1)
      strength = strength + (ratio * 100 - strength) * GROWTH_RATE
    }
    return Math.round(strength)
  }

  let cursor = safeCreatedDate(habit, asOfDate)
  while (cursor <= asOfDate) {
    if (isScheduledOnDate(habit, cursor)) {
      const log = byDate.get(cursor)
      if (log?.status === 'skip') {
        // excluded from calculation
      } else if (log?.status === 'done') {
        strength = strength + (100 - strength) * GROWTH_RATE
      } else if (cursor < asOfDate || log?.status === 'not_done') {
        // past scheduled day with no log, or explicit not_done, counts as a miss
        strength = strength - strength * GROWTH_RATE
      }
    }
    cursor = addDays(cursor, 1)
  }
  return Math.round(strength)
}

/** Consecutive completed scheduled days ending today/yesterday, for build habits. */
export function computeBuildStreak(habit: Habit, logs: HabitLog[], asOfDate: string = todayKey()): number {
  const byDate = logByDate(logs)
  let streak = 0
  let cursor = asOfDate
  // If today isn't logged yet, start counting from yesterday so an
  // unstarted today doesn't zero out an otherwise-intact streak.
  const todayLog = byDate.get(asOfDate)
  if (!todayLog && isScheduledOnDate(habit, asOfDate)) {
    cursor = addDays(asOfDate, -1)
  }
  const createdDate = safeCreatedDate(habit, asOfDate)
  while (cursor >= createdDate) {
    if (!isScheduledOnDate(habit, cursor)) {
      cursor = addDays(cursor, -1)
      continue
    }
    const log = byDate.get(cursor)
    if (log?.status === 'done') {
      streak += 1
    } else if (log?.status === 'skip') {
      // skip days don't break or extend the streak
    } else {
      break
    }
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Days without a relapse for avoid habits (Article 27). */
export function computeAvoidStreak(habit: Habit, logs: HabitLog[], asOfDate: string = todayKey()): number {
  const byDate = logByDate(logs)
  let streak = 0
  let cursor = asOfDate
  const createdDate = safeCreatedDate(habit, asOfDate)
  while (cursor >= createdDate) {
    const log = byDate.get(cursor)
    if (log?.status === 'not_done') break
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}
