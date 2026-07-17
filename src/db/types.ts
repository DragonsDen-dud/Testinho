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

export interface AppSettings {
  id: 'singleton'
  language: Language
  theme: { preset: ThemePreset; accentColor?: string }
  activeSpaceId: string | null
  homeScreenModuleOrder: string[]
  onboardingComplete: boolean
  trashRetentionDays: number
  overdueBannerLastShownDate?: string
  timeBlockRangeHintDismissed?: boolean
}

export interface Space {
  id: string
  name: string
  icon: string
  color: string
  sortOrder: number
  createdAt: string
  archivedAt?: string
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
  timeBlockId?: string
  schedule: HabitSchedule
  measurable?: { targetValue: number; unit: string }
  reminderTimes: string[]
  criticalReminder: boolean
  stake?: HabitStake
  dependsOnHabitIds?: string[]
  pausedFrom?: string
  pausedUntil?: string
  note?: string
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
  subtasks?: TodoSubtask[]
  recurrence?: TodoRecurrence // Article 28 — regenerates on completion, not a Habit
  status: TodoStatus
  completedAt?: string
  createdAt: string
  deletedAt?: string
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
}

/** Articles 12/16/26/35 — autoStats is populated locally (no AI) so the
 * future Scheduled AI Report step can reference these as given facts
 * instead of re-deriving them. Nothing else here is wired up yet. */
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
}
