import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { buildBackupJson, restoreFromBackupJson } from './backup'
import type {
  AppSettings,
  Space,
  LifeDomain,
  TimeBlock,
  PriorityLevel,
  Habit,
  HabitLog,
  Todo,
  PlanEntry,
  Project,
  JournalPrompt,
  JournalEntry,
  DiagnosticEntry,
  ReminderState,
} from '../db/types'

async function clearAllTables() {
  for (const table of db.tables) await table.clear()
}

/** One minimal-but-real row per table, deliberately including the two
 * fields the reviewer called out as the clearest evidence of spec drift:
 * Space.northStar and a ReminderState row (a whole table with no
 * equivalent in the original Section D model at all). */
async function seedOneRowPerTable() {
  const appSettings: AppSettings = {
    id: 'singleton',
    language: 'en',
    theme: { preset: 'dark' },
    activeSpaceId: 'space-1',
    homeScreenModuleOrder: ['todos', 'habits'],
    onboardingComplete: true,
    crossSpaceOverviewEnabled: false,
    trashRetentionDays: 30,
    claudeApiKey: 'sk-ant-test-key',
  }
  const space: Space = {
    id: 'space-1',
    name: 'Personal',
    icon: '🏠',
    color: '#123456',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    northStar: 'Be a little better than yesterday',
  }
  const domain: LifeDomain = { id: 'domain-1', spaceId: 'space-1', name: 'Health', color: '#fff', icon: '💪', sortOrder: 0, createdAt: '2026-01-01T00:00:00.000Z' }
  const timeBlock: TimeBlock = { id: 'tb-1', spaceId: 'space-1', name: 'Morning', sortOrder: 0 }
  const priority: PriorityLevel = { id: 'pl-1', spaceId: 'space-1', name: 'High', sortOrder: 0, weight: 3 }
  const habit: Habit = {
    id: 'habit-1',
    spaceId: 'space-1',
    name: 'Meditate',
    habitType: 'build',
    schedule: { type: 'daily', params: {} },
    reminderTimes: ['08:00'],
    criticalReminder: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
  const habitLog: HabitLog = { id: 'log-1', habitId: 'habit-1', date: '2026-07-18', status: 'done' }
  const todo: Todo = { id: 'todo-1', spaceId: 'space-1', title: 'Renew passport', criticalReminder: false, status: 'open', createdAt: '2026-01-01T00:00:00.000Z' }
  const planEntry: PlanEntry = { id: 'plan-1', spaceId: 'space-1', date: '2026-07-18', scope: 'day', content: 'Focus day' }
  const project: Project = { id: 'proj-1', spaceId: 'space-1', name: 'Move apartments', createdAt: '2026-01-01T00:00:00.000Z' }
  const journalPrompt: JournalPrompt = { id: 'prompt-1', spaceId: 'space-1', text: 'What went well today?', active: true, sortOrder: 0 }
  const journalEntry: JournalEntry = { id: 'entry-1', spaceId: 'space-1', date: '2026-07-18', text: 'Good day.', createdAt: '2026-07-18T00:00:00.000Z' }
  const diagnosticEntry: DiagnosticEntry = {
    id: 'diag-1',
    spaceId: 'space-1',
    periodStart: '2026-07-13',
    periodEnd: '2026-07-19',
    scope: 'week',
    autoStats: { habit1: { moodCorrelation: 1.2 } },
    userFeedback: 'felt good',
    includedNorthStarContext: false,
    generatedBy: 'scheduled',
  }
  const reminderState: ReminderState = {
    id: 'rs-1',
    entityType: 'habit',
    entityId: 'habit-1',
    date: '2026-07-18',
    state: 'sent',
    sentAt: '2026-07-18T08:00:00.000Z',
    followUpSent: false,
  }

  await db.appSettings.put(appSettings)
  await db.spaces.put(space)
  await db.lifeDomains.put(domain)
  await db.timeBlocks.put(timeBlock)
  await db.priorityLevels.put(priority)
  await db.habits.put(habit)
  await db.habitLogs.put(habitLog)
  await db.todos.put(todo)
  await db.planEntries.put(planEntry)
  await db.projects.put(project)
  await db.journalPrompts.put(journalPrompt)
  await db.journalEntries.put(journalEntry)
  await db.diagnosticEntries.put(diagnosticEntry)
  await db.reminderStates.put(reminderState)
}

beforeEach(async () => {
  await clearAllTables()
})

/**
 * The safety net requested: this reads db.tables at runtime (the live
 * schema, not a remembered list) and fails if buildBackupJson() ever
 * omits one. If a future round adds a 15th table the same way the last
 * several were added — ad hoc, mid-implementation — and nobody remembers
 * to touch the export, this test catches it because buildBackupJson()
 * itself iterates db.tables generically; there is no hand-maintained list
 * to forget to update in the first place.
 */
describe('backup export covers every live table (Article 18 safety net)', () => {
  it('the export touches exactly the set of tables db.tables reports right now', async () => {
    const liveTableNames = new Set(db.tables.map((t) => t.name))
    const { json } = await buildBackupJson(false)
    const exportedTableNames = new Set(Object.keys(JSON.parse(json).tables))
    expect(exportedTableNames).toEqual(liveTableNames)
  })
})

describe('full export -> wipe -> import round-trip (Article 18)', () => {
  it('restores every table to exactly its pre-export contents, including drifted-from-spec fields', async () => {
    await seedOneRowPerTable()

    const before: Record<string, unknown[]> = {}
    for (const table of db.tables) before[table.name] = await table.toArray()

    const { json } = await buildBackupJson(false)
    await clearAllTables()

    // Confirm the wipe actually happened, so a false-positive "restore"
    // can't be explained by data that was never cleared.
    for (const table of db.tables) expect(await table.count()).toBe(0)

    const result = await restoreFromBackupJson(json)
    expect(result.ok).toBe(true)

    for (const table of db.tables) {
      const after = await table.toArray()
      expect(after).toEqual(before[table.name])
    }

    // Explicitly re-check the two fields called out as evidence of spec
    // drift, not just "the tables matched" in aggregate.
    const space = await db.spaces.get('space-1')
    expect(space?.northStar).toBe('Be a little better than yesterday')
    const reminderState = await db.reminderStates.get('rs-1')
    expect(reminderState?.state).toBe('sent')
  })

  it('is replace-all, not merge: data added after the backup was taken is gone once it is imported', async () => {
    await seedOneRowPerTable()
    const { json } = await buildBackupJson(false) // "backup A" — taken now, before the extra habit exists

    // Something new happens after the backup — a habit the backup knows nothing about.
    await db.habits.put({
      id: 'habit-added-after-backup',
      spaceId: 'space-1',
      name: 'Added after the backup was taken',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
      createdAt: '2026-07-19T00:00:00.000Z',
    })
    expect(await db.habits.get('habit-added-after-backup')).toBeTruthy()

    const result = await restoreFromBackupJson(json) // restore backup A
    expect(result.ok).toBe(true)

    // A merge would have kept it (it's not in conflict with anything in the
    // backup); replace-all must not.
    expect(await db.habits.get('habit-added-after-backup')).toBeUndefined()
    expect(await db.habits.get('habit-1')).toBeTruthy() // the original habit IS restored
  })

  it('rejects a file that is not valid JSON without touching the database', async () => {
    await seedOneRowPerTable()
    const countBefore = await db.habits.count()
    const result = await restoreFromBackupJson('not json at all {{{')
    expect(result).toEqual({ ok: false, reason: 'invalid_format' })
    expect(await db.habits.count()).toBe(countBefore)
  })

  it('rejects a file missing the expected shape', async () => {
    const result = await restoreFromBackupJson(JSON.stringify({ hello: 'world' }))
    expect(result).toEqual({ ok: false, reason: 'invalid_format' })
  })

  it('rejects a file referencing a table this schema does not have', async () => {
    const fabricated = JSON.stringify({
      app: 'stoa',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      tables: { spaces: [], notARealTable: [{ id: 'x' }] },
    })
    const result = await restoreFromBackupJson(fabricated)
    expect(result).toEqual({ ok: false, reason: 'unknown_table' })
  })

  it('restoring an older backup missing a newer table just leaves that table empty, rather than being rejected', async () => {
    await seedOneRowPerTable()
    const oldBackup = JSON.stringify({
      app: 'stoa',
      schemaVersion: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      tables: { spaces: [{ id: 'space-1', name: 'Personal', icon: '🏠', color: '#123456', sortOrder: 0, createdAt: '2026-01-01T00:00:00.000Z' }] },
      // No reminderStates key at all — simulating a backup from before that table existed.
    })
    const result = await restoreFromBackupJson(oldBackup)
    expect(result.ok).toBe(true)
    expect(await db.reminderStates.count()).toBe(0)
    expect(await db.spaces.get('space-1')).toBeTruthy()
  })
})
