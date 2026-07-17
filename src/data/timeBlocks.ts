import { db } from '../db/db'
import { newId } from '../lib/id'
import type { TimeBlock } from '../db/types'

export async function createTimeBlock(spaceId: string, name: string): Promise<TimeBlock> {
  const count = await db.timeBlocks.where('spaceId').equals(spaceId).count()
  const block: TimeBlock = { id: newId(), spaceId, name, sortOrder: count }
  await db.timeBlocks.add(block)
  return block
}

export async function updateTimeBlock(id: string, patch: Partial<TimeBlock>): Promise<void> {
  await db.timeBlocks.update(id, patch)
}

export async function setTimeBlockRange(id: string, start: string, end: string): Promise<void> {
  await db.timeBlocks.update(id, { approxTimeRange: { start, end } })
}

export async function clearTimeBlockRange(id: string): Promise<void> {
  await db.timeBlocks.update(id, { approxTimeRange: undefined })
}

/** Hard delete — TimeBlock isn't in Article 20's Trash scope. Habits keeping
 * a stale timeBlockId simply stop resolving a block (no cascade cleanup). */
export async function deleteTimeBlock(id: string): Promise<void> {
  await db.timeBlocks.delete(id)
}
