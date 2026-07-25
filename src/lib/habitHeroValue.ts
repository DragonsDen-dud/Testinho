import type { TFunction } from 'i18next'
import type { Habit, HabitLog } from '../db/types'

export interface HabitHeroValue {
  /** The big tabular-nums number/ratio itself — HeroValue's content. */
  value: string
  /** Small unit caption shown alongside it (never inside HeroValue's own
   * typography — that stays reserved for the number, per Part 1). */
  caption: string
}

/**
 * Part 2 (Habits) HeroValue mapping, per habit type:
 *  - measurable: today's logged total over the target ("3/5"), captioned
 *    with the habit's own unit — "today's logged amount/target" per brief.
 *  - avoid: current clean-days streak, captioned "days clean".
 *  - build: current streak, captioned "day streak" — NOT Habit Strength%,
 *    which the pre-Part-2 row used to foreground; strength stays visible
 *    in the (untouched) Detail View. Streak was chosen over strength for
 *    the hero slot because the brief explicitly names "current streak
 *    count" for build habits, and because strength is a smoothed/decaying
 *    percentage rather than the single, glanceable "amount" CoinKeeper's
 *    hero-numeral convention wants.
 */
export function computeHabitHeroValue(
  habit: Habit,
  todayLog: HabitLog | undefined,
  streak: number,
  t: TFunction,
): HabitHeroValue {
  if (habit.measurable) {
    const total = (todayLog?.entries ?? []).reduce((sum, entry) => sum + entry.value, 0)
    return { value: `${total}/${habit.measurable.targetValue}`, caption: habit.measurable.unit }
  }
  if (habit.habitType === 'avoid') {
    return { value: String(streak), caption: t('habits.heroCaptionClean') }
  }
  return { value: String(streak), caption: t('habits.heroCaptionStreak') }
}
