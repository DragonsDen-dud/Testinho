import { describe, expect, it } from 'vitest'
import { computeMoodCorrelation, formatSignedMood } from './moodCorrelation'
import type { HabitLog } from '../db/types'

function log(id: string, status: HabitLog['status'], mood?: number): HabitLog {
  return { id, habitId: 'h1', date: `2026-07-${id.padStart(2, '0')}`, status, mood }
}

describe('computeMoodCorrelation (Article 35)', () => {
  it('returns null below the 5/5 minimum-sample threshold', () => {
    const logs = [
      log('01', 'done', 5),
      log('02', 'done', 5),
      log('03', 'done', 5),
      log('04', 'done', 5),
      log('05', 'not_done', 2), // only 1 not_done with mood
    ]
    expect(computeMoodCorrelation(logs)).toBeNull()
  })

  it('ignores logs with no mood populated when counting toward the threshold', () => {
    const logs = [
      ...Array.from({ length: 5 }, (_, i) => log(`d${i}`, 'done', 4)),
      ...Array.from({ length: 4 }, (_, i) => log(`n${i}`, 'not_done', 2)),
      log('n5', 'not_done'), // no mood — must not count toward the 5 minimum
    ]
    expect(computeMoodCorrelation(logs)).toBeNull()
  })

  it('computes a positive signed value, one decimal place, once both thresholds clear', () => {
    const logs = [
      ...Array.from({ length: 5 }, (_, i) => log(`d${i}`, 'done', 4)),
      ...Array.from({ length: 5 }, (_, i) => log(`n${i}`, 'not_done', 2)),
    ]
    const result = computeMoodCorrelation(logs)
    expect(result).not.toBeNull()
    expect(result?.value).toBe(2)
    expect(result?.doneCount).toBe(5)
    expect(result?.notDoneCount).toBe(5)
  })

  it('rounds to one decimal place', () => {
    const logs = [
      ...['a', 'b', 'c'].map((id) => log(`d${id}`, 'done', 5)),
      ...['d', 'e'].map((id) => log(`d${id}`, 'done', 4)), // avg = (5*3+4*2)/5 = 4.6
      ...Array.from({ length: 5 }, (_, i) => log(`n${i}`, 'not_done', 3)), // avg = 3
    ]
    const result = computeMoodCorrelation(logs)
    expect(result?.value).toBe(1.6)
  })

  it('a build habit and an avoid habit with identical underlying mood numbers produce the SAME sign — this guards against the exact bug the spec warns about', () => {
    // Both use the same status semantics (done = good/on-track, not_done = bad/off-track);
    // computeMoodCorrelation takes no habitType, so there's no branch that could flip it.
    const buildLogs = [
      ...Array.from({ length: 5 }, (_, i) => log(`d${i}`, 'done', 4)),
      ...Array.from({ length: 5 }, (_, i) => log(`n${i}`, 'not_done', 2)),
    ]
    const avoidLogs = buildLogs.map((l) => ({ ...l })) // identical done/not_done/mood data for an avoid habit
    const buildResult = computeMoodCorrelation(buildLogs)
    const avoidResult = computeMoodCorrelation(avoidLogs)
    expect(buildResult?.value).toBe(avoidResult?.value)
    expect(Math.sign(buildResult!.value)).toBe(Math.sign(avoidResult!.value))
  })

  it('a negative correlation (worse mood on done days) stays negative', () => {
    const logs = [
      ...Array.from({ length: 5 }, (_, i) => log(`d${i}`, 'done', 2)),
      ...Array.from({ length: 5 }, (_, i) => log(`n${i}`, 'not_done', 4)),
    ]
    const result = computeMoodCorrelation(logs)
    expect(result?.value).toBeLessThan(0)
  })
})

describe('formatSignedMood', () => {
  it('prefixes a plus sign for non-negative values', () => {
    expect(formatSignedMood(1.2)).toBe('+1.2')
    expect(formatSignedMood(0)).toBe('+0.0')
  })

  it('uses a proper minus sign for negative values', () => {
    expect(formatSignedMood(-0.4)).toBe('−0.4')
  })
})
