import { db } from '../db/db'
import { newId } from '../lib/id'
import type { EveningReview } from '../db/types'

export type NewEveningReviewInput = Omit<EveningReview, 'id' | 'createdAt'>

/** Max must-wins. Three is the brief's number and also the point of the
 * exercise — a list long enough to hide behind isn't a list of must-wins. */
export const MAX_MUST_WINS = 3

/** Trims, drops blanks, and caps at MAX_MUST_WINS. Applied on save so no
 * reader ever has to defend against an empty or oversized list. */
export function normalizeMustWins(raw: string[]): string[] {
  return raw.map((w) => w.trim()).filter(Boolean).slice(0, MAX_MUST_WINS)
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export async function getEveningReview(spaceId: string, date: string): Promise<EveningReview | undefined> {
  return db.eveningReviews.where('[spaceId+date]').equals([spaceId, date]).first()
}

/**
 * One row per Space per target day. Saving again for the same day updates
 * that row in place (keeping its original id and createdAt) rather than
 * creating a duplicate — same upsert-by-composite-key shape data/sleep.ts
 * already uses.
 */
export async function saveEveningReview(input: NewEveningReviewInput): Promise<EveningReview> {
  const existing = await getEveningReview(input.spaceId, input.date)
  const record: EveningReview = {
    id: existing?.id ?? newId(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    spaceId: input.spaceId,
    date: input.date,
    wakeTime: blankToUndefined(input.wakeTime),
    trainingPlan: blankToUndefined(input.trainingPlan),
    warmUp: blankToUndefined(input.warmUp),
    mustWins: normalizeMustWins(input.mustWins),
    habitIdea: blankToUndefined(input.habitIdea),
  }
  await db.eveningReviews.put(record)
  return record
}

export async function deleteEveningReview(spaceId: string, date: string): Promise<void> {
  const existing = await getEveningReview(spaceId, date)
  if (existing) await db.eveningReviews.delete(existing.id)
}

/**
 * True when a review carries nothing worth rendering a brief from. A row
 * saved with every field blank is possible (must-wins are the only
 * required field in the form, but the form can't stop someone clearing
 * them on a later edit), and a brief made of empty boxes is worse than no
 * brief at all — see MorningBriefCard's own no-review path.
 */
export function isEveningReviewEmpty(review: EveningReview | undefined): boolean {
  if (!review) return true
  return (
    review.mustWins.length === 0 &&
    !review.wakeTime &&
    !review.trainingPlan &&
    !review.warmUp
  )
}
