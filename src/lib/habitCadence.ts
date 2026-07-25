import type { TFunction } from 'i18next'
import type { Habit } from '../db/types'
import { weekdayName } from './date'

/**
 * Extracted from HabitDetailSheet's own local formatSchedule (unchanged
 * behavior/output) so the Habits list row (Part 2 round) can reuse the
 * exact same cadence text as the Detail View instead of inventing a
 * second, differently-worded notation — same string, two call sites.
 */
export function formatHabitCadence(habit: Habit, t: TFunction, locale: string): string {
  switch (habit.schedule.type) {
    case 'daily':
      return t('habits.scheduleDaily')
    case 'specific_weekdays': {
      const days = habit.schedule.params.weekdays ?? []
      if (days.length === 0) return t('habits.scheduleSpecificWeekdays')
      return days.map((d) => weekdayName(d, locale)).join(', ')
    }
    case 'weekly_n_times':
      return t('habits.scheduleWeeklyNTimesCount', { count: habit.schedule.params.n ?? 0 })
    case 'custom':
      return t('habits.scheduleCustom')
  }
}
