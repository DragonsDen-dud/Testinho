import Dexie, { type Table } from 'dexie'
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
} from './types'

export class StoaDatabase extends Dexie {
  appSettings!: Table<AppSettings, string>
  spaces!: Table<Space, string>
  lifeDomains!: Table<LifeDomain, string>
  timeBlocks!: Table<TimeBlock, string>
  priorityLevels!: Table<PriorityLevel, string>
  habits!: Table<Habit, string>
  habitLogs!: Table<HabitLog, string>
  todos!: Table<Todo, string>
  planEntries!: Table<PlanEntry, string>
  projects!: Table<Project, string>
  journalPrompts!: Table<JournalPrompt, string>
  journalEntries!: Table<JournalEntry, string>
  diagnosticEntries!: Table<DiagnosticEntry, string>

  constructor() {
    super('stoa')
    this.version(1).stores({
      appSettings: 'id',
      spaces: 'id, sortOrder, archivedAt',
      lifeDomains: 'id, spaceId, sortOrder, archivedAt',
      timeBlocks: 'id, spaceId, sortOrder',
      priorityLevels: 'id, spaceId, sortOrder',
      habits: 'id, spaceId, domainId, timeBlockId, archivedAt',
      habitLogs: 'id, habitId, date, [habitId+date]',
      todos: 'id, spaceId, domainId, priorityLevelId, status, dueDate',
      planEntries: 'id, spaceId, date, scope, [spaceId+date+scope]',
    })
    // v2: Article 20 soft-delete — deletedAt indexed on trashable entities
    // so Trash queries and the retention purge sweep don't full-scan.
    this.version(2)
      .stores({
        habits: 'id, spaceId, domainId, timeBlockId, archivedAt, deletedAt',
        todos: 'id, spaceId, domainId, priorityLevelId, status, dueDate, deletedAt',
      })
      .upgrade(async (tx) => {
        const settings = await tx.table('appSettings').get('singleton')
        if (settings && settings.trashRetentionDays === undefined) {
          await tx.table('appSettings').update('singleton', { trashRetentionDays: 30 })
        }
      })
    // v3: Projects (Article 32) and Journal (Article 33). Project is
    // soft-deletable from creation per Article 20's explicit inclusion of
    // Project alongside Habit/Todo in Trash — no retrofit needed here.
    this.version(3).stores({
      todos: 'id, spaceId, domainId, priorityLevelId, projectId, status, dueDate, deletedAt',
      projects: 'id, spaceId, domainId, archivedAt, deletedAt',
      journalPrompts: 'id, spaceId, sortOrder, active',
      journalEntries: 'id, spaceId, date, promptId',
    })
    // v4: Articles 26/35 local pattern insights + mood correlation feed
    // DiagnosticEntry.autoStats for the future Scheduled AI Report step.
    this.version(4).stores({
      diagnosticEntries: 'id, spaceId, scope, [spaceId+periodStart+scope]',
    })
  }
}

export const db = new StoaDatabase()

export async function ensureAppSettings(): Promise<AppSettings> {
  const existing = await db.appSettings.get('singleton')
  if (existing) return existing
  const defaults: AppSettings = {
    id: 'singleton',
    language: navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en',
    theme: { preset: 'system' },
    activeSpaceId: null,
    homeScreenModuleOrder: ['habits', 'todos'],
    onboardingComplete: false,
    trashRetentionDays: 30,
    moodCaptureEnabled: true,
    aiModelPreference: { scheduledReport: 'haiku', freeformQuery: 'haiku' },
    scheduledReportEnabled: true,
    scheduledReportDayOfWeek: 1, // Monday
  }
  await db.appSettings.put(defaults)
  return defaults
}
