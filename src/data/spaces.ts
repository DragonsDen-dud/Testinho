import { db } from '../db/db'
import { newId } from '../lib/id'
import type { Space, Language } from '../db/types'

// Structured start/end (HH:mm) from day one, covering the full 24h with no
// gaps — Evening wraps past midnight. Seeding these by default means a new
// Space gets the merged Planning timeline (Article 29) without the user
// having to visit Settings > Time Blocks first.
const DEFAULT_TIME_BLOCKS: Record<Language, { name: string; start: string; end: string }[]> = {
  en: [
    { name: 'Morning', start: '06:00', end: '12:00' },
    { name: 'Afternoon', start: '12:00', end: '18:00' },
    { name: 'Evening', start: '18:00', end: '06:00' },
  ],
  ru: [
    { name: 'Утро', start: '06:00', end: '12:00' },
    { name: 'День', start: '12:00', end: '18:00' },
    { name: 'Вечер', start: '18:00', end: '06:00' },
  ],
}

const DEFAULT_PRIORITIES: Record<Language, string[]> = {
  en: ['High', 'Medium', 'Low'],
  ru: ['Высокий', 'Средний', 'Низкий'],
}

// Article 33 starter set — records in the DB, not hardcoded UI copy: the
// user can edit, delete, or add their own from day one.
const DEFAULT_JOURNAL_PROMPTS: Record<Language, string[]> = {
  en: [
    'What went well today?',
    'What was hard?',
    'What did I waste time on?',
    'What am I grateful for today?',
    'What would I do differently?',
  ],
  ru: [
    'Что сегодня получилось хорошо?',
    'Что было сложным?',
    'На что я потратил время впустую?',
    'За что я благодарен сегодня?',
    'Что бы я сделал иначе?',
  ],
}

export async function createSpace(
  data: { name: string; color: string; icon: string; northStar?: string },
  language: Language = 'en',
): Promise<Space> {
  const count = await db.spaces.count()
  const space: Space = {
    id: newId(),
    name: data.name,
    color: data.color,
    icon: data.icon,
    northStar: data.northStar,
    sortOrder: count,
    createdAt: new Date().toISOString(),
  }
  await db.spaces.add(space)

  await db.timeBlocks.bulkAdd(
    DEFAULT_TIME_BLOCKS[language].map((block, i) => ({
      id: newId(),
      spaceId: space.id,
      name: block.name,
      sortOrder: i,
      approxTimeRange: { start: block.start, end: block.end },
    })),
  )
  await db.priorityLevels.bulkAdd(
    DEFAULT_PRIORITIES[language].map((name, i) => ({
      id: newId(),
      spaceId: space.id,
      name,
      sortOrder: i,
      weight: DEFAULT_PRIORITIES[language].length - i,
    })),
  )
  await db.journalPrompts.bulkAdd(
    DEFAULT_JOURNAL_PROMPTS[language].map((text, i) => ({
      id: newId(),
      spaceId: space.id,
      text,
      active: true,
      sortOrder: i,
    })),
  )

  return space
}

export async function updateSpace(id: string, patch: Partial<Space>): Promise<void> {
  await db.spaces.update(id, patch)
}

export async function archiveSpace(id: string): Promise<void> {
  await db.spaces.update(id, { archivedAt: new Date().toISOString() })
}
