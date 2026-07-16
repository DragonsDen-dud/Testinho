import type { Trashable } from '../db/types'

/**
 * The single point that decides what counts as "active" vs. soft-deleted
 * (Article 20). Every query that lists Habits/Todos must funnel through
 * this — never re-implement the `!deletedAt` check inline, or a future
 * query can silently leak trashed records into the UI.
 */
export function excludeTrashed<T extends Trashable>(rows: T[]): T[] {
  return rows.filter((r) => !r.deletedAt)
}

export function onlyTrashed<T extends Trashable>(rows: T[]): T[] {
  return rows.filter((r) => !!r.deletedAt)
}

export function isExpired(deletedAt: string, retentionDays: number, asOf: Date = new Date()): boolean {
  const cutoff = new Date(deletedAt)
  cutoff.setDate(cutoff.getDate() + retentionDays)
  return asOf >= cutoff
}
