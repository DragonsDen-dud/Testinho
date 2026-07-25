import { db } from '../db/db'
import { getDeterministicDefault } from '../lib/categoryStyle'
import type { CategoryStyle, CategoryStyleEntityType } from '../db/types'

function rowId(entityType: CategoryStyleEntityType, entityId: string): string {
  return `${entityType}:${entityId}`
}

export interface ResolvedCategoryStyle {
  color: string
  icon: string
  /** True if backed by a real categoryStyles row (a deliberate edit or
   * reset); false if purely computed on the fly (no row exists yet). */
  isExplicit: boolean
}

/**
 * The single fallback chain every category-badge consumer should go
 * through. Precedence:
 *  1. An explicit categoryStyles row (a Pro Settings edit or reset)
 *     always wins.
 *  2. Otherwise, for entity types that already carry a native color
 *     (LifeDomain.color, Project.color), that live value is used —
 *     `nativeColor` is passed in fresh by the caller (which already has
 *     the LifeDomain/Project row from its own query) rather than cached
 *     here, so an edit made through the still-functional DomainsPage/
 *     ProjectForm (untouched by this round) is never shadowed by a stale
 *     one-time copy.
 *  3. Otherwise, the pure hash-based default.
 * Icon has no native-field case — LifeDomain.icon is a free-choice emoji,
 * not a lucide-compatible icon key, and Project has never had an icon
 * field — so icon is always either the explicit row's or the hash default.
 */
export function resolveCategoryStyle(
  entityType: CategoryStyleEntityType,
  entityId: string,
  nativeColor: string | undefined,
  explicitRow: CategoryStyle | undefined,
): ResolvedCategoryStyle {
  if (explicitRow) return { color: explicitRow.color, icon: explicitRow.icon, isExplicit: true }
  const fallback = getDeterministicDefault(entityType, entityId)
  return { color: nativeColor ?? fallback.color, icon: fallback.icon, isExplicit: false }
}

export async function setCategoryStyle(
  entityType: CategoryStyleEntityType,
  entityId: string,
  patch: { color: string; icon: string },
): Promise<void> {
  const row: CategoryStyle = {
    id: rowId(entityType, entityId),
    entityType,
    entityId,
    color: patch.color,
    icon: patch.icon,
    updatedAt: new Date().toISOString(),
  }
  await db.categoryStyles.put(row)
}

/**
 * Regenerates the pure hash default and stores it as an explicit row —
 * deliberately not the same as deleting the row. Deleting would fall back
 * to the native LifeDomain/Project color (see resolveCategoryStyle above),
 * not the hash value that "reset to default" is supposed to reproduce.
 */
export async function resetCategoryStyle(entityType: CategoryStyleEntityType, entityId: string): Promise<void> {
  await setCategoryStyle(entityType, entityId, getDeterministicDefault(entityType, entityId))
}

export async function resetAllCategoryStyles(
  entries: { entityType: CategoryStyleEntityType; entityId: string }[],
): Promise<void> {
  const now = new Date().toISOString()
  const rows: CategoryStyle[] = entries.map(({ entityType, entityId }) => {
    const fallback = getDeterministicDefault(entityType, entityId)
    return {
      id: rowId(entityType, entityId),
      entityType,
      entityId,
      color: fallback.color,
      icon: fallback.icon,
      updatedAt: now,
    }
  })
  await db.categoryStyles.bulkPut(rows)
}
