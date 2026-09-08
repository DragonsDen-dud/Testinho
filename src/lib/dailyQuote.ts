import type { Quote } from '../db/types'

/**
 * Which of the user's quotes to show on a given day.
 *
 * Deterministic per date, the same approach `pickBriefLineKey` already uses
 * for the Daily Brief's closing line: the quote must not change every time
 * the screen re-renders (a check-in re-renders Today), and it must not
 * need any stored "last shown" bookkeeping to rotate.
 *
 * Sorted by id before indexing so the choice depends only on the date and
 * the set of quotes, not on the order IndexedDB happened to return them in.
 */
export function pickQuoteForDate(quotes: Quote[], date: string): Quote | undefined {
  if (quotes.length === 0) return undefined
  const ordered = [...quotes].sort((a, b) => a.id.localeCompare(b.id))
  let hash = 0
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0
  }
  return ordered[hash % ordered.length]
}
