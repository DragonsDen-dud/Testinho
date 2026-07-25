import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { CategoryStyle } from '../db/types'

/**
 * All explicit category style rows, indexed by id (`${entityType}:${entityId}`).
 * The table only ever holds rows a user has actually edited or reset (see
 * data/categoryStyles.ts) — most categories have none — so a full-table
 * live query stays small and simple rather than needing per-Space
 * filtering at this size.
 */
export function useCategoryStyleMap(): Map<string, CategoryStyle> {
  const rows = useLiveQuery(() => db.categoryStyles.toArray(), []) ?? []
  return new Map(rows.map((r) => [r.id, r]))
}
