import type { HabitLog } from '../db/types'

const MIN_SAMPLES = 5

export interface MoodCorrelation {
  value: number // signed, one decimal place, already rounded
  doneCount: number
  notDoneCount: number
}

/**
 * Article 35 — avgMood(done) - avgMood(not_done). Deliberately habitType-
 * agnostic: `done` already means "the good thing happened" for both build
 * (did the habit) and avoid (stayed clean) per this codebase's status
 * semantics (see computeAvoidStreak — not_done is what breaks a clean
 * streak). So the same subtraction is sign-correct for both without any
 * branching, which is exactly what keeps this safe from the bug where a
 * naive avoid-specific "flip" would invert the sign relative to build for
 * identical underlying numbers. Only the caption text differs by type —
 * see moodCorrelationLabelKey.
 */
export function computeMoodCorrelation(logs: HabitLog[]): MoodCorrelation | null {
  const doneMoods: number[] = []
  const notDoneMoods: number[] = []
  for (const log of logs) {
    if (log.mood == null) continue
    if (log.status === 'done') doneMoods.push(log.mood)
    else if (log.status === 'not_done') notDoneMoods.push(log.mood)
  }
  if (doneMoods.length < MIN_SAMPLES || notDoneMoods.length < MIN_SAMPLES) return null

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const raw = avg(doneMoods) - avg(notDoneMoods)
  return {
    value: Math.round(raw * 10) / 10,
    doneCount: doneMoods.length,
    notDoneCount: notDoneMoods.length,
  }
}

export function formatSignedMood(value: number): string {
  const sign = value >= 0 ? '+' : '−'
  return `${sign}${Math.abs(value).toFixed(1)}`
}
