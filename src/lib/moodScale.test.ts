import { describe, expect, it } from 'vitest'
import { MOOD_SCALE, MOOD_PROMPT_IGNORE_THRESHOLD, moodColor, shouldPromptMood } from './moodScale'
import type { HabitLog } from '../db/types'

function log(date: string, mood?: number): HabitLog {
  return { id: `l-${date}`, habitId: 'h1', date, status: 'done', mood }
}

describe('MOOD_SCALE', () => {
  it('is exactly five points — the single face-valid EMA item, never a second question', () => {
    expect(MOOD_SCALE).toHaveLength(5)
  })

  it('keeps the pre-existing -2..+2 values so already-logged moods keep their meaning', () => {
    expect(MOOD_SCALE.map((m) => m.value)).toEqual([-2, -1, 0, 1, 2])
  })

  it('gives every point its own distinct color', () => {
    const colors = MOOD_SCALE.map((m) => m.color)
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('resolves a color for every valid value and nothing for an invalid one', () => {
    for (const point of MOOD_SCALE) expect(moodColor(point.value)).toBe(point.color)
    expect(moodColor(7)).toBeUndefined()
  })
})

describe('shouldPromptMood', () => {
  it('prompts when there is no history at all', () => {
    expect(shouldPromptMood([], '2026-07-16')).toBe(true)
  })

  it('keeps prompting while there is less history than the threshold', () => {
    const logs = [log('2026-07-15'), log('2026-07-14')]
    expect(shouldPromptMood(logs, '2026-07-16')).toBe(true)
  })

  it('stops prompting once the last few check-ins in a row went unrated', () => {
    const logs = Array.from({ length: MOOD_PROMPT_IGNORE_THRESHOLD }, (_, i) => log(`2026-07-1${5 - i}`))
    expect(shouldPromptMood(logs, '2026-07-16')).toBe(false)
  })

  it('resumes prompting as soon as one recent check-in carries a mood', () => {
    const logs = [log('2026-07-15', 2), log('2026-07-14'), log('2026-07-13'), log('2026-07-12')]
    expect(shouldPromptMood(logs, '2026-07-16')).toBe(true)
  })

  it('only considers the most recent window — an old rated day does not keep it alive forever', () => {
    const logs = [
      log('2026-07-01', 2), // rated, but long past the window
      log('2026-07-15'),
      log('2026-07-14'),
      log('2026-07-13'),
      log('2026-07-12'),
    ]
    expect(shouldPromptMood(logs, '2026-07-16')).toBe(false)
  })

  it('ignores logs after the reference date, so a backdated view is judged on its own history', () => {
    const logs = [
      log('2026-07-20', 2), // in the future relative to asOf
      log('2026-07-15'),
      log('2026-07-14'),
      log('2026-07-13'),
      log('2026-07-12'),
    ]
    expect(shouldPromptMood(logs, '2026-07-16')).toBe(false)
  })

  it('treats mood 0 ("neutral") as a real rating, not as absent', () => {
    // 0 is falsy — this is the exact bug a truthiness check would introduce.
    const logs = [log('2026-07-15', 0), log('2026-07-14'), log('2026-07-13'), log('2026-07-12')]
    expect(shouldPromptMood(logs, '2026-07-16')).toBe(true)
  })

  it('is unaffected by the order logs arrive in', () => {
    const rated = [log('2026-07-12'), log('2026-07-15', 1), log('2026-07-13'), log('2026-07-14')]
    expect(shouldPromptMood(rated, '2026-07-16')).toBe(true)
  })
})
