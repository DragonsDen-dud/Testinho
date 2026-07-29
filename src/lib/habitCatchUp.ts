import type { Habit, HabitLog } from '../db/types'
import { addDays, todayKey } from './date'
import { isScheduledOnDate } from './habitStrength'

/**
 * Habit catch-up round — capped to a week rather than unlimited history.
 * Reasoning (disclosed per the brief): long enough to genuinely catch a
 * busy week's forgotten log, short enough that it doesn't turn into a way
 * to fabricate a streak retroactively with no bound, which would undercut
 * the point of tracking at all. Today itself is never in this window —
 * today still uses the normal HabitCard Done/Not done/Skip flow.
 */
export const CATCH_UP_LOOKBACK_DAYS = 7

export interface CatchUpDay {
  date: string
  habits: Habit[]
}

/**
 * Recent past days (most recent first) that have at least one pending
 * habit: one that already existed on that date, was scheduled that day
 * (isScheduledOnDate already excludes paused days and honors weekday
 * schedules — no new rule invented here), and has no log at all for it —
 * done/not_done/skip all count as already resolved, only a missing log
 * counts as pending, matching the same "no log yet" reading
 * computeHabitStrength/computeBuildStreak already use for a miss.
 *
 * Measurable habits are excluded: HabitCard itself has no "not done"
 * affordance for a measurable habit today (only "log a value" or leave it
 * unlogged), so there is no existing precedent for a backdated not-done
 * on one either — rather than invent one, catch-up simply doesn't offer
 * measurable habits this round (disclosed in the round's report).
 */
export function computeCatchUpDays(
  habits: Habit[],
  logsByHabit: Map<string, HabitLog[]>,
  today: string = todayKey(),
): CatchUpDay[] {
  const days: CatchUpDay[] = []
  for (let i = 1; i <= CATCH_UP_LOOKBACK_DAYS; i++) {
    const date = addDays(today, -i)
    const pending = habits.filter((h) => {
      if (h.measurable) return false
      // Defensive, not just typed: a real habit found to be missing/
      // malformed createdAt crashed this exact line in production with
      // an uncaught TypeError (see the black-screen incident this round
      // also added an ErrorBoundary for) — treat "we don't actually know
      // when this was created" as "don't offer to backdate it" rather
      // than trust the type system's promise that the field is always a
      // real string.
      if (typeof h.createdAt !== 'string' || h.createdAt.slice(0, 10) > date) return false
      if (!isScheduledOnDate(h, date)) return false
      const logs = logsByHabit.get(h.id) ?? []
      return !logs.some((l) => l.date === date)
    })
    if (pending.length > 0) days.push({ date, habits: pending })
  }
  return days
}

/** Total pending habit-day instances across the whole window — what the
 * Habits tab's entry-point banner counts ("3 pending from the last few
 * days"), not the number of days. */
export function countCatchUpPending(days: CatchUpDay[]): number {
  return days.reduce((sum, d) => sum + d.habits.length, 0)
}
