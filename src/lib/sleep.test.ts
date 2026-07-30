import { describe, expect, it } from 'vitest'
import { computeSleepTimestamps, computeHoursSlept, formatClockTime, dateKeyOf, timeOfDayForChart, formatChartHour } from './sleep'

describe('computeSleepTimestamps — the midnight-spanning case', () => {
  it('a typical night (bed late, wake early) puts bedtime on the day BEFORE the wake-up date', () => {
    const { bedTime, wakeTime } = computeSleepTimestamps('2026-06-15', '23:00', '07:00')
    expect(dateKeyOf(bedTime)).toBe('2026-06-14')
    expect(dateKeyOf(wakeTime)).toBe('2026-06-15')
    expect(formatClockTime(bedTime)).toBe('23:00')
    expect(formatClockTime(wakeTime)).toBe('07:00')
    expect(computeHoursSlept(bedTime, wakeTime)).toBe(8)
  })

  it('a same-day nap (bed and wake both in the afternoon) keeps both on the given date', () => {
    const { bedTime, wakeTime } = computeSleepTimestamps('2026-06-15', '14:00', '15:30')
    expect(dateKeyOf(bedTime)).toBe('2026-06-15')
    expect(dateKeyOf(wakeTime)).toBe('2026-06-15')
    expect(computeHoursSlept(bedTime, wakeTime)).toBe(1.5)
  })

  it('a bedtime already after midnight (e.g. 00:30) stays on the wake-up date itself, not the day before', () => {
    const { bedTime, wakeTime } = computeSleepTimestamps('2026-06-15', '00:30', '07:00')
    expect(dateKeyOf(bedTime)).toBe('2026-06-15')
    expect(dateKeyOf(wakeTime)).toBe('2026-06-15')
    expect(computeHoursSlept(bedTime, wakeTime)).toBe(6.5)
  })

  it('equal bed and wake clock times produce a zero-length night on the same date', () => {
    const { bedTime, wakeTime } = computeSleepTimestamps('2026-06-15', '07:00', '07:00')
    expect(dateKeyOf(bedTime)).toBe('2026-06-15')
    expect(computeHoursSlept(bedTime, wakeTime)).toBe(0)
  })

  it('a bedtime one minute before midnight and a wake time one minute after still computes a small positive duration, not a huge negative/garbage value', () => {
    const { bedTime, wakeTime } = computeSleepTimestamps('2026-06-15', '23:59', '00:01')
    expect(dateKeyOf(bedTime)).toBe('2026-06-14')
    expect(dateKeyOf(wakeTime)).toBe('2026-06-15')
    const hours = computeHoursSlept(bedTime, wakeTime)
    expect(hours).toBeGreaterThanOrEqual(0)
    expect(hours).toBeLessThan(0.1) // ~2 real minutes, rounds to 0.0h at 1-decimal precision — not negative
  })
})

describe('chart hour shifting', () => {
  it('a late bedtime (23:30) is unshifted — already on the continuous evening scale', () => {
    const { bedTime } = computeSleepTimestamps('2026-06-15', '23:30', '07:00')
    expect(timeOfDayForChart(bedTime, true)).toBeCloseTo(23.5, 5)
  })

  it('a post-midnight bedtime (00:30) is shifted by +24 so it sits next to a 23:xx bedtime, not at the bottom of the axis', () => {
    const { bedTime } = computeSleepTimestamps('2026-06-15', '00:30', '07:00')
    expect(timeOfDayForChart(bedTime, true)).toBeCloseTo(24.5, 5)
  })

  it('wake time is never shifted, even when shiftAfterMidnight would apply', () => {
    const { wakeTime } = computeSleepTimestamps('2026-06-15', '23:00', '07:00')
    expect(timeOfDayForChart(wakeTime, false)).toBeCloseTo(7, 5)
  })

  it('formatChartHour is the inverse of the shift, including values over 24', () => {
    expect(formatChartHour(24.5)).toBe('00:30')
    expect(formatChartHour(23.5)).toBe('23:30')
    expect(formatChartHour(7)).toBe('07:00')
  })
})
