export type Language = 'ru' | 'en'
export type ThemePreset = 'dark' | 'light' | 'contrast' | 'system'
export type HabitType = 'build' | 'avoid'
export type HabitLogStatus = 'done' | 'not_done' | 'skip'
export type TodoStatus = 'open' | 'done' | 'archived'
export type ScheduleType = 'daily' | 'weekly_n_times' | 'specific_weekdays' | 'custom'

export interface AppSettings {
  id: 'singleton'
  language: Language
  theme: { preset: ThemePreset; accentColor?: string }
  activeSpaceId: string | null
  homeScreenModuleOrder: string[]
  onboardingComplete: boolean
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

export interface TimeBlock {
  id: string
  spaceId: string
  name: string
  sortOrder: number
  approxTimeRange?: string
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
  note?: string
  createdAt: string
  archivedAt?: string
}

export interface HabitLog {
  id: string
  habitId: string
  date: string // YYYY-MM-DD
  status: HabitLogStatus
  value?: number
  note?: string
  mood?: number
}

export interface TodoSubtask {
  id: string
  title: string
  done: boolean
}

export interface Todo {
  id: string
  spaceId: string
  title: string
  description?: string
  dueDate?: string
  priorityLevelId?: string
  domainId?: string
  criticalReminder: boolean
  subtasks?: TodoSubtask[]
  status: TodoStatus
  completedAt?: string
  createdAt: string
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
