import { db } from '../db/db'
import { newId } from '../lib/id'
import type { PlanEntry } from '../db/types'

export async function savePlanEntry(data: {
  spaceId: string
  date: string
  scope: PlanEntry['scope']
  content: string
  linkedTodoIds?: string[]
  linkedHabitIds?: string[]
}): Promise<void> {
  const existing = await db.planEntries
    .where('[spaceId+date+scope]')
    .equals([data.spaceId, data.date, data.scope])
    .first()
  const entry: PlanEntry = {
    id: existing?.id ?? newId(),
    ...data,
  }
  await db.planEntries.put(entry)
}
