import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import {
  MAX_MUST_WINS,
  getEveningReview,
  isEveningReviewEmpty,
  normalizeMustWins,
  saveEveningReview,
  deleteEveningReview,
} from './eveningReviews'

const SPACE = 'space-1'
const DATE = '2026-07-17'

beforeEach(async () => {
  await db.eveningReviews.clear()
})

describe('normalizeMustWins', () => {
  it('trims each entry', () => {
    expect(normalizeMustWins(['  ship it  ', 'call mum'])).toEqual(['ship it', 'call mum'])
  })

  it('drops blank and whitespace-only entries rather than storing empty strings', () => {
    expect(normalizeMustWins(['ship it', '', '   '])).toEqual(['ship it'])
  })

  it('caps at three — a longer list is not a list of must-wins', () => {
    expect(normalizeMustWins(['a', 'b', 'c', 'd', 'e'])).toHaveLength(MAX_MUST_WINS)
  })

  it('preserves order after dropping blanks, so the numbering matches what was typed', () => {
    expect(normalizeMustWins(['', 'second', '', 'fourth'])).toEqual(['second', 'fourth'])
  })

  it('returns an empty array for an all-blank list', () => {
    expect(normalizeMustWins(['', '  ', ''])).toEqual([])
  })
})

describe('saveEveningReview', () => {
  it('stores a review keyed by the day it plans FOR', async () => {
    await saveEveningReview({ spaceId: SPACE, date: DATE, mustWins: ['ship it'] })
    const stored = await getEveningReview(SPACE, DATE)
    expect(stored?.date).toBe(DATE)
    expect(stored?.mustWins).toEqual(['ship it'])
  })

  it('updates the existing row rather than creating a duplicate for the same day', async () => {
    const first = await saveEveningReview({ spaceId: SPACE, date: DATE, mustWins: ['first'] })
    const second = await saveEveningReview({ spaceId: SPACE, date: DATE, mustWins: ['second'] })

    expect(second.id).toBe(first.id)
    expect(second.createdAt).toBe(first.createdAt) // original filing time preserved
    expect(await db.eveningReviews.count()).toBe(1)
    expect((await getEveningReview(SPACE, DATE))?.mustWins).toEqual(['second'])
  })

  it('keeps separate rows for different days', async () => {
    await saveEveningReview({ spaceId: SPACE, date: DATE, mustWins: ['today'] })
    await saveEveningReview({ spaceId: SPACE, date: '2026-07-18', mustWins: ['tomorrow'] })
    expect(await db.eveningReviews.count()).toBe(2)
  })

  it('keeps separate rows per Space on the same day — Spaces stay isolated (Article 8)', async () => {
    await saveEveningReview({ spaceId: SPACE, date: DATE, mustWins: ['personal'] })
    await saveEveningReview({ spaceId: 'space-2', date: DATE, mustWins: ['work'] })
    expect((await getEveningReview(SPACE, DATE))?.mustWins).toEqual(['personal'])
    expect((await getEveningReview('space-2', DATE))?.mustWins).toEqual(['work'])
  })

  it('normalizes blank optional fields to undefined rather than storing empty strings', async () => {
    const saved = await saveEveningReview({
      spaceId: SPACE,
      date: DATE,
      wakeTime: '',
      trainingPlan: '   ',
      warmUp: '',
      habitIdea: '  ',
      mustWins: ['ship it'],
    })
    expect(saved.wakeTime).toBeUndefined()
    expect(saved.trainingPlan).toBeUndefined()
    expect(saved.warmUp).toBeUndefined()
    expect(saved.habitIdea).toBeUndefined()
  })

  it('trims the optional free-text fields it does keep', async () => {
    const saved = await saveEveningReview({
      spaceId: SPACE,
      date: DATE,
      trainingPlan: '  intervals  ',
      mustWins: ['ship it'],
    })
    expect(saved.trainingPlan).toBe('intervals')
  })

  it('normalizes must-wins on the way in, so no reader has to defend against blanks', async () => {
    const saved = await saveEveningReview({ spaceId: SPACE, date: DATE, mustWins: ['  a  ', '', 'b', 'c', 'd'] })
    expect(saved.mustWins).toEqual(['a', 'b', 'c'])
  })
})

describe('deleteEveningReview', () => {
  it('removes the row for that day and leaves other days alone', async () => {
    await saveEveningReview({ spaceId: SPACE, date: DATE, mustWins: ['a'] })
    await saveEveningReview({ spaceId: SPACE, date: '2026-07-18', mustWins: ['b'] })
    await deleteEveningReview(SPACE, DATE)
    expect(await getEveningReview(SPACE, DATE)).toBeUndefined()
    expect(await getEveningReview(SPACE, '2026-07-18')).toBeDefined()
  })

  it('is a no-op when nothing is stored for that day', async () => {
    await expect(deleteEveningReview(SPACE, DATE)).resolves.toBeUndefined()
  })
})

describe('isEveningReviewEmpty', () => {
  it('treats a missing review as empty', () => {
    expect(isEveningReviewEmpty(undefined)).toBe(true)
  })

  it('treats a review with nothing renderable as empty', async () => {
    const saved = await saveEveningReview({ spaceId: SPACE, date: DATE, mustWins: [''], habitIdea: 'just an idea' })
    // A habit idea alone is a note to self, not a brief worth rendering.
    expect(isEveningReviewEmpty(saved)).toBe(true)
  })

  it('is not empty when it has must-wins', async () => {
    const saved = await saveEveningReview({ spaceId: SPACE, date: DATE, mustWins: ['ship it'] })
    expect(isEveningReviewEmpty(saved)).toBe(false)
  })

  it('is not empty when it has only a wake time', async () => {
    const saved = await saveEveningReview({ spaceId: SPACE, date: DATE, wakeTime: '06:30', mustWins: [] })
    expect(isEveningReviewEmpty(saved)).toBe(false)
  })

  it('is not empty when it has only a training plan', async () => {
    const saved = await saveEveningReview({ spaceId: SPACE, date: DATE, trainingPlan: 'intervals', mustWins: [] })
    expect(isEveningReviewEmpty(saved)).toBe(false)
  })
})
