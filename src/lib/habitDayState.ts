import type { Habit, HabitLog } from '../db/types'
import { isScheduledOnDate, safeCreatedDate } from './habitStrength'

export type HabitDayState = 'done' | 'clean' | 'not_done' | 'skip' | 'missed' | 'pending' | 'inactive'

export interface HabitDayInfo {
  state: HabitDayState
  /** Measurable habits only — the day's logged entries summed, present only on a 'done' day. */
  value?: number
}

/**
 * Per-day display state for the habit pattern grid (week/month view in
 * HabitDetailSheet). Mirrors the exact same date-driven rules
 * computeBuildStreak/computeHabitStrength already use — a past scheduled day
 * with no log is a miss, today with no log is neutral rather than a miss,
 * paused/unscheduled/before-creation days are excluded — just surfaced
 * per-day here instead of collapsed into a streak count. No new rule
 * invented; reuses isScheduledOnDate (which itself already excludes paused
 * days) and safeCreatedDate (the black-screen-incident-hardened helper, so
 * a malformed createdAt degrades to "no known history" instead of crashing).
 */
export function computeHabitDayInfo(habit: Habit, log: HabitLog | undefined, date: string, today: string): HabitDayInfo {
  if (date > today) return { state: 'inactive' }
  if (date < safeCreatedDate(habit, today)) return { state: 'inactive' }
  if (!isScheduledOnDate(habit, date)) return { state: 'inactive' }

  if (log?.status === 'done') {
    const value = habit.measurable ? log.entries?.reduce((sum, e) => sum + e.value, 0) : undefined
    return { state: 'done', value }
  }
  if (log?.status === 'skip') return { state: 'skip' }
  if (log?.status === 'not_done') return { state: 'not_done' }

  // Article 14/27 correctness fix (STOA-5). For an `avoid` habit the
  // polarity is inverted: a day with no log is a day without a slip, i.e. a
  // success — which is exactly what computeAvoidStreak already counts (it
  // only breaks on an explicit `not_done`). This function previously
  // returned 'missed' for that case, contradicting the streak number shown
  // right next to it and, worse, implying the user failed on every day they
  // simply had nothing to report. 'clean' is its own state rather than
  // reusing 'done' so a surface can still distinguish "explicitly logged as
  // abstained" from "nothing happened", while both render as filled.
  if (habit.habitType === 'avoid') return { state: date === today ? 'pending' : 'clean' }

  return { state: date === today ? 'pending' : 'missed' }
}

/** True for the states that count as the habit going well on that day —
 * 'done' for build, 'done' or 'clean' for avoid. The single place any
 * surface should ask "should this day read as filled?" */
export function isSuccessfulDay(state: HabitDayState): boolean {
  return state === 'done' || state === 'clean'
}
