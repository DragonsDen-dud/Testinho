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
  CategoryStyle,
  SleepLog,
  EveningReview,
} from './types'
import { CURRENT_VERSION } from '../lib/changelog'

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
  categoryStyles!: Table<CategoryStyle, string>
  sleepLogs!: Table<SleepLog, string>
  eveningReviews!: Table<EveningReview, string>

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
    // v6: STOA Design System Part 1 — additive-only, no existing table's
    // shape changes. Explicit color/icon overrides for a category, keyed
    // by entityType+entityId; rows are created lazily on first edit/reset,
    // never backfilled in bulk on upgrade (see lib/categoryStyle.ts for
    // why a lazy per-read fallback is used instead of a one-time seed).
    this.version(6).stores({
      categoryStyles: 'id, entityType, entityId, [entityType+entityId]',
    })
    // v7: Sleep tracking round — one row per Space+date, [spaceId+date]
    // indexed for the same upsert-by-composite-key lookup logHabit already
    // uses for HabitLog's [habitId+date].
    this.version(7).stores({
      sleepLogs: 'id, spaceId, date, [spaceId+date]',
    })
    // v8: STOA-5 — drop the dead top-level `Habit.note`. It was written by
    // the habit form but never read anywhere (audited in STOA-4), so no
    // display or calculation changes. No `.stores()` change is needed since
    // `note` was never indexed; this exists purely so the stale property is
    // actually gone from stored rows rather than silently riding along in
    // every future JSON backup. `HabitLog.note` — the real, displayed
    // per-check-in note — is a different field on a different table and is
    // deliberately untouched here.
    this.version(8).upgrade(async (tx) => {
      await tx
        .table('habits')
        .toCollection()
        .modify((habit) => {
          delete habit.note
        })
    })
    // v9: STOA-6 — the Evening Review. Additive only, no existing table's
    // shape changes; [spaceId+date] is indexed for the same
    // upsert-by-composite-key lookup sleepLogs and habitLogs already use.
    this.version(9).stores({
      eveningReviews: 'id, spaceId, date, [spaceId+date]',
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
    crossSpaceOverviewEnabled: false,
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
    // A brand-new install has seen nothing yet — seeding this to the
    // current version means a first-time user never gets a changelog nag
    // for changes that predate their very first session.
    lastSeenChangelogVersion: CURRENT_VERSION,
  }
  await db.appSettings.put(defaults)
  return defaults
}
