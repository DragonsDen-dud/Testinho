import type { Habit, HabitLog } from '../db/types'
import { addDays, todayKey } from './date'
import { isPausedOnDate, isScheduledOnDate, safeCreatedDate } from './habitStrength'

/**
 * Part 3c — "which single habit is actually slipping right now".
 *
 * Fogg (B = Motivation × Ability × Prompt): the failure this addresses is a
 * *prompt* failure, not a motivation one. Today's list treats every unlogged
 * habit as an equal-weight row, so the one quietly dying gets exactly as
 * much of Denys's attention as the one he's never missed — which means the
 * app is passively waiting to be read rather than pointing at the thing that
 * needs the decision. Surfacing one habit, with the plain fact of what
 * happened, is a better-aimed prompt at no extra notification volume.
 *
 * Article 6 boundary, deliberately: this produces a *fact* (n of m scheduled
 * days missed), never a score, rank, grade, or reward. Nothing accumulates,
 * nothing is compared between habits in the UI, and there is no state to
 * "recover". It is the same category of output as the existing weak-day and
 * strong-time pattern lines (Article 26).
 */

/** Trailing days examined, ending yesterday. Two weeks is long enough for a
 * `specific_weekdays` habit to have produced real observations and short
 * enough that a slip from two months ago doesn't keep flagging. */
export const AT_RISK_WINDOW_DAYS = 14
/** Below this many real scheduled observations there isn't enough to say
 * anything honest, so nothing is surfaced. */
export const AT_RISK_MIN_OBSERVATIONS = 4
/** Only surface a habit that is genuinely below par. A habit completed most
 * of the time is not "at risk" and flagging it would make the signal noise. */
export const AT_RISK_MAX_COMPLETION_PERCENT = 60

export interface AtRiskHabit {
  habitId: string
  /** Scheduled, unpaused, non-skip days observed in the window. */
  observedDays: number
  missedDays: number
  completionPercent: number
}

/**
 * A miss, per habit type — the two polarities are genuinely different and
 * collapsing them would produce a false reading for one of them (Article 14):
 *  - `build`: a scheduled day that was never logged is a miss, same as an
 *    explicit `not_done`. Not doing the thing is the failure.
 *  - `avoid`: only an explicit `not_done` (a relapse) is a miss. An unlogged
 *    day is a success, matching what `computeAvoidStreak` already counts —
 *    treating silence as a relapse would flag every avoid habit Denys simply
 *    doesn't log daily, which is the normal way an avoid habit is used.
 * `skip` is excluded from the denominator entirely for both, exactly as
 * `computeHabitStrength` already excludes it.
 */
function isMiss(habit: Habit, log: HabitLog | undefined): boolean {
  if (habit.habitType === 'avoid') return log?.status === 'not_done'
  return !log || log.status === 'not_done'
}

function statsFor(habit: Habit, logs: HabitLog[], asOfDate: string): AtRiskHabit | null {
  const byDate = new Map(logs.map((l) => [l.date, l]))
  const createdDate = safeCreatedDate(habit, asOfDate)
  let observedDays = 0
  let missedDays = 0

  // Ends yesterday: today is still in progress, and counting an unlogged
  // today as a miss is exactly the convention habitStrength/habitPatterns
  // already refuse to adopt.
  for (let offset = 1; offset <= AT_RISK_WINDOW_DAYS; offset += 1) {
    const date = addDays(asOfDate, -offset)
    if (date < createdDate) continue
    if (isPausedOnDate(habit, date)) continue
    if (!isScheduledOnDate(habit, date)) continue
    const log = byDate.get(date)
    if (log?.status === 'skip') continue
    observedDays += 1
    if (isMiss(habit, log)) missedDays += 1
  }

  if (observedDays < AT_RISK_MIN_OBSERVATIONS) return null
  const completionPercent = Math.round(((observedDays - missedDays) / observedDays) * 100)
  return { habitId: habit.id, observedDays, missedDays, completionPercent }
}

/**
 * The single most at-risk habit among those passed in, or null when none
 * qualifies. Callers pass only the habits they'd actually surface (Today
 * passes the ones still unlogged for today), so this never points at
 * something already handled.
 *
 * Ties break on more missed days, then on habit id — deterministic, so the
 * highlighted habit doesn't shuffle between renders on equal data.
 */
export function computeAtRiskHabit(
  habits: Habit[],
  logsByHabitId: Map<string, HabitLog[]>,
  asOfDate: string = todayKey(),
): AtRiskHabit | null {
  let best: AtRiskHabit | null = null
  for (const habit of habits) {
    const stats = statsFor(habit, logsByHabitId.get(habit.id) ?? [], asOfDate)
    if (!stats || stats.completionPercent > AT_RISK_MAX_COMPLETION_PERCENT) continue
    if (
      !best ||
      stats.completionPercent < best.completionPercent ||
      (stats.completionPercent === best.completionPercent &&
        (stats.missedDays > best.missedDays ||
          (stats.missedDays === best.missedDays && stats.habitId < best.habitId)))
    ) {
      best = stats
    }
  }
  return best
}
