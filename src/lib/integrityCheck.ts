import { db } from '../db/db'

export type FkCardinality = 'single' | 'array'

export interface FkRelationship {
  fromTable: string
  field: string
  cardinality: FkCardinality
  // A fixed target table name, or — for the one polymorphic reference in
  // this schema (ReminderState.entityId, which points at either 'habits'
  // or 'todos' depending on the row's own entityType) — a function that
  // resolves the target per-row.
  toTable: string | ((row: Record<string, unknown>) => string)
}

/**
 * Article 53 — Dexie has no native concept of a foreign key (its schema
 * strings only declare indexes), so which fields reference which tables is
 * app-level knowledge with nowhere to be discovered from at runtime. This
 * catalog is a genuinely manual, hand-maintained list — unlike
 * buildBackupJson() (Article 18), which can enumerate db.tables()
 * generically because "every table" needs no relationship knowledge at
 * all, "every foreign key" fundamentally does. This is disclosed
 * explicitly rather than presented as if it were as automatic as the
 * backup export.
 *
 * What IS kept generic: the scanner itself (findOrphans below) doesn't
 * special-case any table by name — it walks this catalog and, for each
 * entry, generically reads db.table(fromTable) and db.table(toTable). A
 * relationship only needs one line added here to be covered; no new
 * scanning code.
 *
 * A note on what's deliberately NOT here: the assignment named
 * `StakeEvent.habitId` as an example orphan condition to check. No
 * `StakeEvent` table or entity exists anywhere in this codebase — a
 * Habit's stake (Article 27) is an embedded field (`Habit.stake`), never a
 * separate record with its own habitId, consistent with stakes being
 * "self-penalty, never auto-enforced" (no event log is kept of stakes
 * being triggered). There is nothing to check here; it isn't an omission.
 */
export const FK_RELATIONSHIPS: FkRelationship[] = [
  { fromTable: 'appSettings', field: 'activeSpaceId', cardinality: 'single', toTable: 'spaces' },
  { fromTable: 'lifeDomains', field: 'spaceId', cardinality: 'single', toTable: 'spaces' },
  { fromTable: 'timeBlocks', field: 'spaceId', cardinality: 'single', toTable: 'spaces' },
  { fromTable: 'priorityLevels', field: 'spaceId', cardinality: 'single', toTable: 'spaces' },
  { fromTable: 'habits', field: 'spaceId', cardinality: 'single', toTable: 'spaces' },
  { fromTable: 'habits', field: 'domainId', cardinality: 'single', toTable: 'lifeDomains' },
  { fromTable: 'habits', field: 'timeBlockId', cardinality: 'single', toTable: 'timeBlocks' },
  { fromTable: 'habits', field: 'dependsOnHabitIds', cardinality: 'array', toTable: 'habits' },
  { fromTable: 'habitLogs', field: 'habitId', cardinality: 'single', toTable: 'habits' },
  { fromTable: 'todos', field: 'spaceId', cardinality: 'single', toTable: 'spaces' },
  { fromTable: 'todos', field: 'priorityLevelId', cardinality: 'single', toTable: 'priorityLevels' },
  { fromTable: 'todos', field: 'domainId', cardinality: 'single', toTable: 'lifeDomains' },
  // Article 20's cascade-purge is expected to clear this when a Project is
  // permanently deleted — this scan is a safety net for whatever that rule
  // doesn't catch, not proof the cascade itself works (that's covered by
  // existing Article 20 tests).
  { fromTable: 'todos', field: 'projectId', cardinality: 'single', toTable: 'projects' },
  { fromTable: 'planEntries', field: 'spaceId', cardinality: 'single', toTable: 'spaces' },
  { fromTable: 'planEntries', field: 'linkedTodoIds', cardinality: 'array', toTable: 'todos' },
  { fromTable: 'planEntries', field: 'linkedHabitIds', cardinality: 'array', toTable: 'habits' },
  { fromTable: 'projects', field: 'spaceId', cardinality: 'single', toTable: 'spaces' },
  { fromTable: 'projects', field: 'domainId', cardinality: 'single', toTable: 'lifeDomains' },
  { fromTable: 'journalPrompts', field: 'spaceId', cardinality: 'single', toTable: 'spaces' },
  { fromTable: 'journalEntries', field: 'spaceId', cardinality: 'single', toTable: 'spaces' },
  { fromTable: 'journalEntries', field: 'promptId', cardinality: 'single', toTable: 'journalPrompts' },
  { fromTable: 'diagnosticEntries', field: 'spaceId', cardinality: 'single', toTable: 'spaces' },
  {
    fromTable: 'reminderStates',
    field: 'entityId',
    cardinality: 'single',
    toTable: (row) => (row.entityType === 'habit' ? 'habits' : 'todos'),
  },
]

export interface OrphanRecord {
  fromTable: string
  recordId: string
  field: string
  cardinality: FkCardinality
  /** The dangling id(s) — for an array field, only the subset that don't
   * resolve, not the whole array. */
  danglingIds: string[]
}

/**
 * A target id "exists" if any row with that id is present in the target
 * table at all — regardless of deletedAt/archivedAt. A soft-deleted (but
 * not yet purged) Habit is still a real record its old HabitLogs correctly
 * point at; that is not an orphan, it's Trash working as designed (Article
 * 20). Only a truly missing id — purged, or never valid — counts here.
 */
export async function findOrphans(): Promise<OrphanRecord[]> {
  const orphans: OrphanRecord[] = []
  const idSetCache = new Map<string, Set<string>>()

  async function idsFor(table: string): Promise<Set<string>> {
    let ids = idSetCache.get(table)
    if (!ids) {
      const rows = await db.table(table).toArray()
      ids = new Set(rows.map((r) => r.id))
      idSetCache.set(table, ids)
    }
    return ids
  }

  for (const rel of FK_RELATIONSHIPS) {
    const rows = await db.table(rel.fromTable).toArray()
    for (const row of rows) {
      const value = row[rel.field]
      if (value === undefined || value === null) continue

      const targetTable = typeof rel.toTable === 'function' ? rel.toTable(row) : rel.toTable
      const targetIds = await idsFor(targetTable)

      if (rel.cardinality === 'single') {
        if (typeof value === 'string' && value.length > 0 && !targetIds.has(value)) {
          orphans.push({ fromTable: rel.fromTable, recordId: row.id, field: rel.field, cardinality: 'single', danglingIds: [value] })
        }
      } else {
        const arr: string[] = Array.isArray(value) ? value : []
        const dangling = arr.filter((id) => !targetIds.has(id))
        if (dangling.length > 0) {
          orphans.push({ fromTable: rel.fromTable, recordId: row.id, field: rel.field, cardinality: 'array', danglingIds: dangling })
        }
      }
    }
  }

  return orphans
}

/** Clears just the dangling reference — for an array field, removes only
 * the dangling id(s), keeping any other still-valid entries intact. */
export async function clearOrphanReference(orphan: OrphanRecord): Promise<void> {
  if (orphan.cardinality === 'single') {
    await db.table(orphan.fromTable).update(orphan.recordId, { [orphan.field]: undefined })
    return
  }
  const row = await db.table(orphan.fromTable).get(orphan.recordId)
  const current: string[] = (row?.[orphan.field] as string[] | undefined) ?? []
  const cleaned = current.filter((id) => !orphan.danglingIds.includes(id))
  await db.table(orphan.fromTable).update(orphan.recordId, { [orphan.field]: cleaned.length > 0 ? cleaned : undefined })
}

export async function deleteOrphanRecord(orphan: OrphanRecord): Promise<void> {
  await db.table(orphan.fromTable).delete(orphan.recordId)
}
