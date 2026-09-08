import { db } from '../db/db'
import { newId } from '../lib/id'
import { excludeTrashed, onlyTrashed, isExpired } from '../lib/trash'
import type { Quote } from '../db/types'

export type NewQuoteInput = Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

/** The only place that should query Quotes for a Space — see lib/trash.ts. */
export async function listQuotes(spaceId: string): Promise<Quote[]> {
  const rows = await db.quotes.where('spaceId').equals(spaceId).toArray()
  return excludeTrashed(rows).sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
}

export async function listTrashedQuotes(spaceId: string): Promise<Quote[]> {
  const rows = await db.quotes.where('spaceId').equals(spaceId).toArray()
  return onlyTrashed(rows)
}

export async function createQuote(data: NewQuoteInput): Promise<Quote> {
  const now = new Date().toISOString()
  const quote: Quote = { ...data, id: newId(), createdAt: now, updatedAt: now }
  await db.quotes.add(quote)
  return quote
}

export async function updateQuote(id: string, patch: Partial<Quote>): Promise<void> {
  await db.quotes.update(id, { ...patch, updatedAt: new Date().toISOString() })
}

/** Article 20 — soft delete, restorable from Trash. */
export async function deleteQuote(id: string): Promise<void> {
  await db.quotes.update(id, { deletedAt: new Date().toISOString() })
}

export async function restoreQuote(id: string): Promise<void> {
  await db.quotes.update(id, { deletedAt: undefined })
}

export async function purgeQuote(id: string): Promise<void> {
  await db.quotes.delete(id)
}

/**
 * Article 20 — the retention sweep. Without this a soft-deleted quote would
 * sit in IndexedDB forever: `deleteQuote` only stamps `deletedAt`, and only
 * a purge actually removes the row.
 */
export async function purgeExpiredQuotes(retentionDays: number, asOf = new Date()): Promise<number> {
  const expired = await db.quotes
    .filter((q) => !!q.deletedAt && isExpired(q.deletedAt, retentionDays, asOf))
    .toArray()
  for (const q of expired) await purgeQuote(q.id)
  return expired.length
}

/**
 * Normalises what the user typed before it is stored.
 *
 * Surrounding quotation marks are stripped because the UI already renders
 * the text as a quotation — leaving them produces ""like this"" once the
 * two are combined, which is the kind of small wrongness that makes a
 * feature feel unfinished.
 */
export function normalizeQuoteText(raw: string): string {
  const trimmed = raw.trim()
  const pairs: [string, string][] = [
    ['"', '"'],
    ['“', '”'],
    ['«', '»'],
    ["'", "'"],
  ]
  for (const [open, close] of pairs) {
    if (trimmed.length >= 2 && trimmed.startsWith(open) && trimmed.endsWith(close)) {
      return trimmed.slice(open.length, trimmed.length - close.length).trim()
    }
  }
  return trimmed
}
