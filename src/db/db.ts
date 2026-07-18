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
  ReminderState,
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
  reminderStates!: Table<ReminderState, string>

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
    // v5: Article 12 — week and month Scheduled AI Report cadences are now
    // independently configurable (scheduledAiReport.week/.month) instead of
    // a single flat toggle that only ever covered week scope; migrate any
    // existing user's week-scope choice forward rather than silently
    // resetting it. Article 40's ReminderState is new in this version too.
    this.version(5)
      .stores({
        reminderStates: 'id, entityType, entityId, date, [entityType+entityId+date]',
      })
      .upgrade(async (tx) => {
        const settings = await tx.table('appSettings').get('singleton')
        if (settings && !settings.scheduledAiReport) {
          await tx.table('appSettings').update('singleton', {
            scheduledAiReport: {
              week: { enabled: settings.scheduledReportEnabled ?? true, dayOfWeek: settings.scheduledReportDayOfWeek ?? 1 },
              month: { enabled: true },
            },
          })
        }
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
    scheduledAiReport: {
      week: { enabled: true, dayOfWeek: 1 }, // Monday
      month: { enabled: true },
    },
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
    morningDigest: { enabled: false, time: '08:00' },
    backupReminderIntervalDays: 30,
  }
  await db.appSettings.put(defaults)
  return defaults
}
