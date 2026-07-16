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
  }
  await db.appSettings.put(defaults)
  return defaults
}
