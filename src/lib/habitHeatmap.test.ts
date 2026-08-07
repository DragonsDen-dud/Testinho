import { describe, expect, it } from 'vitest'
import { buildHabitHeatmap, heatmapWeekCount } from './habitHeatmap'
import { isSuccessfulDay } from './habitDayState'
import type { Habit, HabitLog, HabitLogStatus } from '../db/types'

const TODAY = '2026-07-16' // a Thursday

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    spaceId: 's1',
    name: 'Push-ups',
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: [],
    criticalReminder: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function log(date: string, status: HabitLogStatus, extra: Partial<HabitLog> = {}): HabitLog {
  return { id: `l-${date}`, habitId: 'h1', date, status, ...extra }
}

function cellFor(heatmap: ReturnType<typeof buildHabitHeatmap>, date: string) {
  for (const week of heatmap.weeks) {
    const found = week.cells.find((c) => c.date === date)
    if (found) return found
  }
  return undefined
}

describe('buildHabitHeatmap — grid shape', () => {
  it('produces exactly the requested number of columns, each a full 7 cells', () => {
    const map = buildHabitHeatmap(habit(), [], TODAY, 12)
    expect(map.weeks).toHaveLength(12)
    for (const week of map.weeks) expect(week.cells).toHaveLength(7)
  })

  it('starts every column on a Monday', () => {
    const map = buildHabitHeatmap(habit(), [], TODAY, 6)
    for (const week of map.weeks) {
      const d = new Date(`${week.startDate}T00:00:00Z`)
      expect(d.getUTCDay()).toBe(1) // Monday
    }
  })

  it('ends in the week containing today, with today present in the last column', () => {
    const map = buildHabitHeatmap(habit(), [], TODAY, 6)
    const lastWeek = map.weeks[map.weeks.length - 1]
    expect(lastWeek.cells.map((c) => c.date)).toContain(TODAY)
  })

  it('runs oldest column first, newest last', () => {
    const map = buildHabitHeatmap(habit(), [], TODAY, 6)
    const starts = map.weeks.map((w) => w.startDate)
    expect([...starts].sort()).toEqual(starts)
  })

  it('emits one month label per month the range opens, in order', () => {
    const map = buildHabitHeatmap(habit(), [], TODAY, 20)
    const months = map.monthLabels.map((m) => m.month)
    expect(months.length).toBeGreaterThan(1)
    expect([...months].sort()).toEqual(months)
    expect(new Set(months).size).toBe(months.length)
  })
})

describe('buildHabitHeatmap — build habit intensity', () => {
  it('gives a done day full intensity and a missed day none', () => {
    const map = buildHabitHeatmap(habit(), [log('2026-07-14', 'done')], TODAY, 4)
    expect(cellFor(map, '2026-07-14')!.intensity).toBe(1)
    expect(cellFor(map, '2026-07-13')!.intensity).toBe(0)
    expect(cellFor(map, '2026-07-13')!.info!.state).toBe('missed')
  })

  it('gives an explicit not_done day no intensity', () => {
    const map = buildHabitHeatmap(habit(), [log('2026-07-14', 'not_done')], TODAY, 4)
    expect(cellFor(map, '2026-07-14')!.intensity).toBe(0)
  })

  it('marks a future day inactive with no intensity', () => {
    const map = buildHabitHeatmap(habit(), [], TODAY, 4)
    expect(cellFor(map, '2026-07-18')!.info!.state).toBe('inactive')
    expect(cellFor(map, '2026-07-18')!.intensity).toBe(0)
  })

  it('scales a measurable habit between 0.25 and 1 by how much of the target the day hit', () => {
    const h = habit({ measurable: { targetValue: 20, unit: 'reps' } })
    const partial = log('2026-07-14', 'done', { entries: [{ timestamp: 't', value: 10 }] })
    const full = log('2026-07-13', 'done', { entries: [{ timestamp: 't', value: 20 }] })
    const map = buildHabitHeatmap(h, [partial, full], TODAY, 4)
    expect(cellFor(map, '2026-07-14')!.intensity).toBeCloseTo(0.5)
    expect(cellFor(map, '2026-07-13')!.intensity).toBe(1)
  })

  it('caps intensity at 1 when a measurable day overshoots its target', () => {
    const h = habit({ measurable: { targetValue: 10, unit: 'reps' } })
    const over = log('2026-07-14', 'done', {
      entries: [
        { timestamp: 't1', value: 10 },
        { timestamp: 't2', value: 40 },
      ],
    })
    // Article 24 — exceeding the target is already a neutral `bonus` fact
    // and must never render as a bigger reward.
    expect(cellFor(buildHabitHeatmap(h, [over], TODAY, 4), '2026-07-14')!.intensity).toBe(1)
  })
})

describe('buildHabitHeatmap — avoid habit polarity (Article 14/27)', () => {
  const avoid = habit({ habitType: 'avoid' })

  it('fills an unlogged past day — no slip recorded is a success, matching computeAvoidStreak', () => {
    const map = buildHabitHeatmap(avoid, [], TODAY, 4)
    const cell = cellFor(map, '2026-07-13')!
    expect(cell.info!.state).toBe('clean')
    expect(isSuccessfulDay(cell.info!.state)).toBe(true)
    expect(cell.intensity).toBe(1)
  })

  it('leaves an explicit relapse empty', () => {
    const map = buildHabitHeatmap(avoid, [log('2026-07-13', 'not_done')], TODAY, 4)
    expect(cellFor(map, '2026-07-13')!.info!.state).toBe('not_done')
    expect(cellFor(map, '2026-07-13')!.intensity).toBe(0)
  })

  it('treats the same unlogged day oppositely for a build habit — the polarities do not collapse', () => {
    const buildMap = buildHabitHeatmap(habit(), [], TODAY, 4)
    const avoidMap = buildHabitHeatmap(avoid, [], TODAY, 4)
    expect(cellFor(buildMap, '2026-07-13')!.intensity).toBe(0)
    expect(cellFor(avoidMap, '2026-07-13')!.intensity).toBe(1)
  })

  it('still leaves days before the habit existed inactive rather than falsely clean', () => {
    const young = habit({ habitType: 'avoid', createdAt: '2026-07-10T00:00:00.000Z' })
    const map = buildHabitHeatmap(young, [], TODAY, 4)
    expect(cellFor(map, '2026-07-05')!.info!.state).toBe('inactive')
    expect(cellFor(map, '2026-07-05')!.intensity).toBe(0)
  })

  it('still leaves paused days inactive rather than falsely clean', () => {
    const paused = habit({ habitType: 'avoid', pausedFrom: '2026-07-06', pausedUntil: '2026-07-12' })
    const map = buildHabitHeatmap(paused, [], TODAY, 4)
    expect(cellFor(map, '2026-07-08')!.info!.state).toBe('inactive')
  })
})

describe('heatmapWeekCount', () => {
  it('never drops below the floor for a brand-new habit', () => {
    const fresh = habit({ createdAt: '2026-07-15T00:00:00.000Z' })
    expect(heatmapWeekCount(fresh, TODAY)).toBe(16)
  })

  it('never exceeds the cap for a very old habit', () => {
    const ancient = habit({ createdAt: '2018-01-01T00:00:00.000Z' })
    expect(heatmapWeekCount(ancient, TODAY)).toBe(53)
  })

  it('covers the habit\'s whole life when that sits between the floor and cap', () => {
    // 2026-01-01 to 2026-07-16 is about 29 weeks.
    const count = heatmapWeekCount(habit(), TODAY)
    expect(count).toBeGreaterThan(16)
    expect(count).toBeLessThan(53)
  })

  it('degrades safely for a malformed createdAt instead of throwing (black-screen guard)', () => {
    const broken = habit({ createdAt: undefined as unknown as string })
    expect(() => heatmapWeekCount(broken, TODAY)).not.toThrow()
    expect(heatmapWeekCount(broken, TODAY)).toBe(16)
  })
})
