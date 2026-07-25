import { describe, expect, it } from 'vitest'
import { computeHabitHeroValue } from './habitHeroValue'
import type { Habit, HabitLog } from '../db/types'

const fakeT = ((key: string) => key) as unknown as Parameters<typeof computeHabitHeroValue>[3]

const baseHabit: Habit = {
  id: 'h1',
  spaceId: 's1',
  name: 'Read',
  habitType: 'build',
  schedule: { type: 'daily', params: {} },
  reminderTimes: [],
  criticalReminder: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('computeHabitHeroValue', () => {
  it('build habit: hero value is the streak count, captioned "day streak"', () => {
    const result = computeHabitHeroValue(baseHabit, undefined, 12, fakeT)
    expect(result).toEqual({ value: '12', caption: 'habits.heroCaptionStreak' })
  })

  it('avoid habit: hero value is the clean-days streak, captioned "days clean"', () => {
    const habit: Habit = { ...baseHabit, habitType: 'avoid' }
    const result = computeHabitHeroValue(habit, undefined, 7, fakeT)
    expect(result).toEqual({ value: '7', caption: 'habits.heroCaptionClean' })
  })

  it('measurable habit: hero value is today\'s logged total over target, captioned with the unit', () => {
    const habit: Habit = { ...baseHabit, measurable: { targetValue: 5, unit: 'pages' } }
    const todayLog: HabitLog = {
      id: 'log1',
      habitId: 'h1',
      date: '2026-07-25',
      status: 'done',
      entries: [
        { timestamp: '2026-07-25T08:00:00.000Z', value: 2 },
        { timestamp: '2026-07-25T09:00:00.000Z', value: 1 },
      ],
    }
    const result = computeHabitHeroValue(habit, todayLog, 0, fakeT)
    expect(result).toEqual({ value: '3/5', caption: 'pages' })
  })

  it('measurable habit with no entries yet today shows 0 over target', () => {
    const habit: Habit = { ...baseHabit, measurable: { targetValue: 8, unit: 'glasses' } }
    const result = computeHabitHeroValue(habit, undefined, 0, fakeT)
    expect(result).toEqual({ value: '0/8', caption: 'glasses' })
  })

  it('measurable takes priority over habitType (an avoid habit could theoretically have measurable set)', () => {
    const habit: Habit = { ...baseHabit, habitType: 'avoid', measurable: { targetValue: 3, unit: 'slips' } }
    const result = computeHabitHeroValue(habit, undefined, 0, fakeT)
    expect(result).toEqual({ value: '0/3', caption: 'slips' })
  })
})
