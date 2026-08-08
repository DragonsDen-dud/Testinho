import { describe, expect, it } from 'vitest'
import { BRIEF_LINE_KEYS, briefContentFrom, pickBriefLineKey, wrapText } from './morningBrief'
import { isEveningPromptTime, EVENING_PROMPT_FROM_HOUR } from './eveningPrompt'
import type { EveningReview } from '../db/types'

/**
 * `renderMorningBrief` itself is deliberately not unit-tested here: it is a
 * pure Canvas 2D painting routine, and this sandbox has no real canvas
 * implementation under Node/jsdom (the same limitation already documented
 * for lib/imageCompression.ts and lib/chartExport.ts). It is verified live
 * in real Chromium instead — including decoding the exported PNG's pixels.
 * What IS testable without a canvas is the pure logic around it, below.
 */

/** Minimal stand-in for the one canvas API wrapText actually uses. */
function fakeCtx(charWidth = 10): CanvasRenderingContext2D {
  return {
    measureText: (text: string) => ({ width: text.length * charWidth }),
  } as unknown as CanvasRenderingContext2D
}

describe('wrapText', () => {
  it('keeps a short string on one line', () => {
    expect(wrapText(fakeCtx(), 'hello there', 500, 2)).toEqual(['hello there'])
  })

  it('wraps at the width boundary rather than mid-word', () => {
    const lines = wrapText(fakeCtx(), 'alpha beta gamma delta', 100, 4)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) expect(line).not.toMatch(/^\s|\s$/)
    expect(lines.join(' ')).toBe('alpha beta gamma delta')
  })

  it('never returns more than maxLines', () => {
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ')
    expect(wrapText(fakeCtx(), long, 100, 2)).toHaveLength(2)
  })

  it('ellipsises the last line when the text overruns, rather than dropping it silently', () => {
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ')
    const lines = wrapText(fakeCtx(), long, 100, 2)
    expect(lines[lines.length - 1].endsWith('…')).toBe(true)
  })

  it('does not ellipsise when everything fits inside maxLines', () => {
    const lines = wrapText(fakeCtx(), 'alpha beta', 100, 2)
    expect(lines.join('')).not.toContain('…')
  })

  it('keeps a single unbreakable word rather than returning nothing', () => {
    // A word wider than maxWidth still has to be emitted — dropping it
    // would silently lose a must-win.
    const lines = wrapText(fakeCtx(), 'supercalifragilistic', 50, 2)
    expect(lines[0]).toContain('supercalifragilistic')
  })

  it('returns an empty array for empty or whitespace-only input', () => {
    expect(wrapText(fakeCtx(), '', 100, 2)).toEqual([])
    expect(wrapText(fakeCtx(), '   ', 100, 2)).toEqual([])
  })

  it('collapses runs of whitespace instead of emitting blank words', () => {
    expect(wrapText(fakeCtx(), 'alpha    beta', 500, 2)).toEqual(['alpha beta'])
  })
})

describe('pickBriefLineKey', () => {
  it('always returns a key from the published set', () => {
    for (const date of ['2026-01-01', '2026-07-17', '2026-12-31']) {
      expect(BRIEF_LINE_KEYS).toContain(pickBriefLineKey(date))
    }
  })

  it('is deterministic — the same day never reshuffles between opens', () => {
    expect(pickBriefLineKey('2026-07-17')).toBe(pickBriefLineKey('2026-07-17'))
  })

  it('varies across dates rather than pinning one line forever', () => {
    const seen = new Set<string>()
    for (let day = 1; day <= 28; day += 1) {
      seen.add(pickBriefLineKey(`2026-07-${String(day).padStart(2, '0')}`))
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('briefContentFrom', () => {
  const labels = {
    dateLine: 'Fri, 17 Jul',
    greeting: 'Good morning',
    wakeLabel: 'Wake time',
    trainingLabel: 'Training',
    warmUpLabel: 'Warm-up',
    mustWinsLabel: 'Must-wins',
    closingLine: 'Three things.',
    footer: 'Personal',
  }

  function review(overrides: Partial<EveningReview> = {}): EveningReview {
    return {
      id: 'r1',
      spaceId: 's1',
      date: '2026-07-17',
      mustWins: ['ship it'],
      createdAt: '2026-07-16T21:00:00.000Z',
      ...overrides,
    }
  }

  it('carries the review values through alongside the labels', () => {
    const content = briefContentFrom(review({ wakeTime: '06:30', trainingPlan: 'intervals' }), labels)
    expect(content.wakeTime).toBe('06:30')
    expect(content.trainingPlan).toBe('intervals')
    expect(content.mustWins).toEqual(['ship it'])
    expect(content.greeting).toBe('Good morning')
  })

  it('leaves absent optional fields undefined so the renderer can skip them', () => {
    const content = briefContentFrom(review(), labels)
    expect(content.wakeTime).toBeUndefined()
    expect(content.trainingPlan).toBeUndefined()
    expect(content.warmUp).toBeUndefined()
  })
})

describe('isEveningPromptTime', () => {
  function at(hour: number): Date {
    const d = new Date(2026, 6, 17)
    d.setHours(hour, 0, 0, 0)
    return d
  }

  it('is quiet through the morning and afternoon', () => {
    expect(isEveningPromptTime(at(9))).toBe(false)
    expect(isEveningPromptTime(at(16))).toBe(false)
  })

  it('turns on exactly at the configured hour', () => {
    expect(isEveningPromptTime(at(EVENING_PROMPT_FROM_HOUR))).toBe(true)
  })

  it('stays on through the late evening', () => {
    expect(isEveningPromptTime(at(23))).toBe(true)
  })
})
