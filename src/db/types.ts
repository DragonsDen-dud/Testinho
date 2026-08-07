export interface Trashable {
  deletedAt?: string
}

export type Language = 'ru' | 'en'
export type ThemePreset = 'dark' | 'light' | 'contrast' | 'system'
export type HabitType = 'build' | 'avoid'
export type HabitLogStatus = 'done' | 'not_done' | 'skip'
export type TodoStatus = 'open' | 'done' | 'archived' | 'someday'
export type TodoRecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom'
export type ScheduleType = 'daily' | 'weekly_n_times' | 'specific_weekdays' | 'custom'
export type ClaudeModelChoice = 'haiku' | 'sonnet'

export interface AppSettings {
  id: 'singleton'
  language: Language
  theme: { preset: ThemePreset; accentColor?: string }
  activeSpaceId: string | null
  homeScreenModuleOrder: string[]
  onboardingComplete: boolean
  // Article 34 — Phase 2, off by default. The cross-Space aggregated-%
  // overview screen itself is deferred; this field exists now so the
  // eventual feature has a toggle to read rather than needing a later
  // migration. Optional, not required: like every other field added after
  // launch, existing rows predate it — undefined means "off", same as false.
  crossSpaceOverviewEnabled?: boolean
  trashRetentionDays: number
  overdueBannerLastShownDate?: string
  timeBlockRangeHintDismissed?: boolean
  // Article 35 support — optional per check-in, never blocks saving a log.
  // Undefined means enabled (existing installs predate this field).
  moodCaptureEnabled?: boolean
  // Article 38 — stored locally only (IndexedDB), never hardcoded, never
  // logged. Sent per-request to our own proxy (see api/), which forwards it
  // to Anthropic and never persists it server-side.
  claudeApiKey?: string
  aiUsage?: { callCount: number; currentPeriodStart: string; softCapWarningThreshold?: number }
  aiModelPreference?: { scheduledReport: ClaudeModelChoice; freeformQuery: ClaudeModelChoice }
  // Article 12 — week and month Scheduled AI Report cadences, independently
  // enabled/configured — not a single either/or toggle.
  scheduledAiReport?: ScheduledAiReportSettings
  scheduledReportCaveatDismissed?: boolean
  // Article 41 — any notification (push or Telegram) that would fire inside
  // this window is queued and delivered right at its end, never dropped
  // outright, unless the originally-scheduled day is already over.
  quietHours?: { enabled: boolean; start: string; end: string } // HH:mm, may wrap midnight
  // Article 42 — independent of, and in addition to, individual
  // reminderTimes/scheduledTime reminders. Neither toggle silences the other.
  morningDigest?: { enabled: boolean; time: string } // HH:mm
  morningDigestLastDeliveredDate?: string
  // Article 18 — a successful export clears any snooze and updates this;
  // undefined means "never backed up", which is due immediately.
  lastBackupExportedAt?: string // YYYY-MM-DD
  backupReminderIntervalDays?: number // default 30
  backupReminderSnoozedUntil?: string // YYYY-MM-DD, set by "remind me later"
  // Article 56 — undefined means "never seen any version's What's New
  // sheet". ensureAppSettings seeds this to the current version for a
  // brand-new install, so a first-time user never gets a changelog nag
  // about changes that predate their very first session.
  lastSeenChangelogVersion?: string
  // Habits Refocus round — the single flag gating the whole Tasks/Planning
  // surface (see lib/featureFlags.ts). Deliberately an AppSettings field
  // rather than a code constant, following the precedent already set by
  // moodCaptureEnabled/crossSpaceOverviewEnabled: it makes the flag
  // flippable from inside the app with no rebuild and no migration, which
  // is exactly what "trivially reversible later" asks for.
  //
  // undefined === false === Habits-focused mode. This is the one field in
  // this file whose undefined default is *not* the pre-existing behavior:
  // that's intentional, since the whole point of the round is that an
  // existing install lands in Habits-focused mode without needing a
  // migration to write the flag. No Todo/Project/PlanEntry data is touched
  // either way — only what is rendered and routable.
  tasksPlanningEnabled?: boolean
  // Part 3b — per-install habit field visibility + order (see
  // lib/habitFields.ts). Undefined means "every field visible, default
  // order", so an install that never opens the setting behaves exactly as
  // it did before this field existed.
  habitFieldConfig?: HabitFieldConfig
}

/** Part 3b — stored per install, not per habit (see lib/habitFields.ts for
 * the key catalog and the resolver that tolerates unknown/missing keys). */
export interface HabitFieldConfig {
  hidden?: string[]
  order?: string[]
}

export interface ScheduledAiReportSettings {
  week: { enabled: boolean; dayOfWeek: number } // 0=Sun..6=Sat
  month: { enabled: boolean }
}

export interface Space {
  id: string
  name: string
  icon: string
  color: string
  sortOrder: number
  createdAt: string
  archivedAt?: string
  // A short personal mission/goal statement, entirely optional. Exists so
  // DiagnosticEntry.includedNorthStarContext (Article 16) has real content
  // to opt into attaching — never sent to the AI unless the user explicitly
  // checks the "include North Star" box for that specific call.
  northStar?: string
}

export interface LifeDomain {
  id: string
  spaceId: string
  name: string
  color: string
  icon: string
  sortOrder: number
  createdAt: string
  archivedAt?: string
}

export interface TimeBlockRange {
  start: string // HH:mm
  end: string // HH:mm; end <= start means the range wraps past midnight
}

export interface TimeBlock {
  id: string
  spaceId: string
  name: string
  sortOrder: number
  approxTimeRange?: TimeBlockRange
}

export interface PriorityLevel {
  id: string
  spaceId: string
  name: string
  sortOrder: number
  weight: number
}

export interface HabitSchedule {
  type: ScheduleType
  params: {
    weekdays?: number[] // 0=Sun..6=Sat, for specific_weekdays
    n?: number // for weekly_n_times
  }
}

export interface HabitStake {
  triggerType: 'streak_breaks_n_times' | 'strength_below_threshold'
  triggerValue: number
  penaltyText: string
}

export interface Habit {
  id: string
  spaceId: string
  name: string
  habitType: HabitType
  domainId?: string
  // Habits 2.0 Part A — a lucide-react icon name (same CATEGORY_ICONS set
  // Pro Settings uses), chosen explicitly in the creation/edit form.
  // Undefined for every habit created before this round (and never
  // backfilled) — HabitCategoryBadge falls back to the domain-resolved
  // icon exactly as before when this is unset, so existing habits render
  // unchanged. Color is deliberately NOT part of this: it keeps resolving
  // from the habit's LifeDomain via categoryStyles, untouched by this field.
  icon?: string
  timeBlockId?: string
  schedule: HabitSchedule
  measurable?: { targetValue: number; unit: string }
  reminderTimes: string[]
  criticalReminder: boolean
  stake?: HabitStake
  dependsOnHabitIds?: string[]
  pausedFrom?: string
  pausedUntil?: string
  // REMOVED in STOA-5: `note?: string`. It was written by the habit form
  // and stored, but never read for display anywhere — the "Latest note" on
  // the detail view reads HabitLog.note (the per-check-in note), which is a
  // different field and is untouched. Dexie v8 strips the stale property
  // from existing rows so it doesn't linger in backups forever.
  createdAt: string
  archivedAt?: string
  deletedAt?: string
}

export interface HabitLogEntry {
  timestamp: string
  value: number
}

export interface HabitLog {
  id: string
  habitId: string
  date: string // YYYY-MM-DD
  status: HabitLogStatus
  entries?: HabitLogEntry[] // measurable habits only — multiple logs/day (Article 24)
  bonus?: boolean // entries.length >= 2 — neutral fact, never a score/reward (Article 24)
  note?: string
  mood?: number
  // Article 23 — always the already-compressed Blob (see lib/imageCompression.ts);
  // nothing upstream of persistence ever stores the original, uncompressed file.
  photo?: Blob
}

export interface TodoSubtask {
  id: string
  title: string
  done: boolean
}

export interface TodoRecurrence {
  type: TodoRecurrenceType
  params: {
    interval?: number // every N days/weeks/months (custom is treated as days); default 1
  }
}

export interface Todo {
  id: string
  spaceId: string
  title: string
  description?: string
  dueDate?: string
  scheduledTime?: string // HH:mm (Article 29)
  priorityLevelId?: string
  domainId?: string
  projectId?: string
  criticalReminder: boolean
  // Article B.2 — State 3: an explicit, separate opt-in for the in-app
  // reminder. Never inferred from the mere presence of scheduledTime.
  reminderEnabled?: boolean
  // Signed minutes before the (dueDate + scheduledTime) instant; 0 = "at
  // due time". Only meaningful while reminderEnabled is true. See
  // lib/reminderTiming.ts's REMINDER_OFFSET_MINUTES for the fixed set.
  reminderOffsetMinutes?: number
  // Article B.2 — State 6: a durable, user-visible count of how many times
  // this task's fired reminder has been snoozed, surfaced as "Snoozed ×N"
  // in the list — distinct from ReminderState's internal snoozeUntil,
  // which resets with every new reminder cycle and was never itself shown.
  snoozeCount?: number
  // Article B.2 — State 5: set the first time "Add to Calendar" is tapped
  // for this task, so the list can show a persistent tag confirming the
  // export happened, without the user needing to remember doing it.
  calendarExportedAt?: string
  subtasks?: TodoSubtask[]
  recurrence?: TodoRecurrence // Article 28 — regenerates on completion, not a Habit
  status: TodoStatus
  completedAt?: string
  createdAt: string
  deletedAt?: string
  // Article 23 — always the already-compressed Blob (see lib/imageCompression.ts).
  photo?: Blob
}

export interface PlanEntry {
  id: string
  spaceId: string
  date: string
  scope: 'day' | 'week' | 'month'
  content: string
  linkedTodoIds?: string[]
  linkedHabitIds?: string[]
}

export interface Project {
  id: string
  spaceId: string
  name: string
  domainId?: string
  color?: string
  createdAt: string
  archivedAt?: string
  deletedAt?: string
}

export interface JournalPrompt {
  id: string
  spaceId: string
  text: string
  active: boolean
  sortOrder: number
}

export interface JournalEntry {
  id: string
  spaceId: string
  date: string
  promptId?: string
  text: string
  mood?: number
  createdAt: string
  // Article 23 — always the already-compressed Blob (see lib/imageCompression.ts).
  photo?: Blob
}

/**
 * Sleep tracking round — its own small entity, not folded into the
 * measurable-habit model: checked against that model first (it already
 * supports backdating and multiple values/day), but a habit's `entries`
 * are same-day timestamp+value pairs, with no concept of "this value is
 * the end of a range that started on the previous calendar day" — exactly
 * the midnight-spanning case a bedtime/wake-time pair needs, and forcing
 * two correlated fields (bed + wake) into one measurable habit's single
 * `value` would either need two separate habits (losing the pairing this
 * feature exists to show) or fabricated units. A real fit didn't exist.
 *
 * `date` is the wake-up day (the day this entry is "for" — matches how a
 * user would naturally say "last night's sleep" the next morning).
 * bedTime/wakeTime are full ISO timestamps, not HH:mm strings, so a bedtime
 * after midnight and one before both compute a correct duration without
 * any special-cased "spans midnight" branch at read time — the timestamps
 * already encode which calendar day each moment actually fell on.
 * One row per spaceId+date; logging again for an already-logged date
 * updates that row rather than creating a duplicate (see data/sleep.ts).
 */
export interface SleepLog {
  id: string
  spaceId: string
  date: string
  bedTime: string
  wakeTime: string
}

/** Articles 12/16/26/35 — autoStats is populated locally (no AI) so the
 * Scheduled AI Report and freeform queries can reference these as given
 * facts instead of re-deriving them. One row per Space+period+scope. */
export interface DiagnosticEntry {
  id: string
  spaceId: string
  periodStart: string
  periodEnd: string
  scope: 'week' | 'month'
  autoStats: Record<string, unknown>
  userFeedback: string
  aiInsight?: string
  reportType?: 'scheduled_template' | 'freeform_query'
  includedNorthStarContext: boolean
  generatedBy: 'manual' | 'scheduled'
  // Set the first time the user actually sees this report's content on the
  // Analytics screen (see markDiagnosticViewed) — drives the unviewed-report
  // badge on the Analytics nav tab. Undefined means never viewed.
  viewedAt?: string
}

// STOA Design System — Part 1. The only two genuine per-item
// categorization concepts that actually exist in the schema (per SPEC.md,
// LifeDomain is literally "the user category within a Space"; Project is
// the other grouping Todos render color by). Space is a top-level
// container, not a category of items within it, and PriorityLevel is
// deliberately function-only (see styles/tokens.ts's priorityDotTone) —
// neither belongs here; see the Part 1 report for why they were left out
// despite being named as examples in the brief.
export type CategoryStyleEntityType = 'lifeDomain' | 'project'

/**
 * An explicit color/icon override for a category, keyed by
 * `${entityType}:${entityId}`. Deliberately does NOT duplicate
 * LifeDomain.color/icon or Project.color as a standing mirror — this row
 * only exists once a user edits or resets a category via Pro Settings (or
 * once Part 2+ starts reading category styling directly from here instead
 * of the native fields). Absence of a row is a valid, common state; see
 * lib/categoryStyle.ts's getEffectiveCategoryStyle for the fallback chain.
 */
export interface CategoryStyle {
  id: string // `${entityType}:${entityId}`
  entityType: CategoryStyleEntityType
  entityId: string
  color: string
  icon: string // lucide-react icon name, e.g. "Folder"
  updatedAt: string
}

export type ReminderEntityType = 'habit' | 'todo'
export type ReminderStateValue = 'sent' | 'acknowledged' | 'snoozed' | 'dismissed' | 'lapsed_for_day'

/** Article 40 — one row per entity per day; a fresh day starts a fresh
 * escalation cycle. `followUpSent` is the hard-cap tracker: once true, no
 * further nudges are ever sent for this entity today, no matter what else
 * happens (snoozing again, dismissing, etc.). */
export interface ReminderState {
  id: string
  entityType: ReminderEntityType
  entityId: string
  date: string // YYYY-MM-DD
  state: ReminderStateValue
  sentAt: string // ISO — anchors the escalation window for the initial reminder
  followUpSent: boolean
  lastActionAt?: string // ISO — last explicit user action (acknowledge/snooze/dismiss)
  snoozeUntil?: string // ISO — only meaningful while state === 'snoozed'
}
