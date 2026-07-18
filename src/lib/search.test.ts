import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { createHabit, listActiveHabits, deleteHabit as deleteHabitRecord } from '../data/habits'
import { createTodo, listActiveTodos, deleteTodo as deleteTodoRecord } from '../data/todos'
import { createJournalEntry, listJournalEntries } from '../data/journal'
import { searchAll } from './search'
import type { NewHabitInput } from '../data/habits'
import type { NewTodoInput } from '../data/todos'
import type { DiagnosticEntry } from '../db/types'

const SPACE_ID = 'space-1'

beforeEach(async () => {
  await db.habits.clear()
  await db.todos.clear()
  await db.journalEntries.clear()
  await db.diagnosticEntries.clear()
})

describe('searchAll (Article 48)', () => {
  it('returns nothing for an empty query', () => {
    const results = searchAll('', { habits: [], todos: [], journalEntries: [], diagnosticEntries: [] })
    expect(results).toEqual({ habits: [], todos: [], journalEntries: [], diagnosticEntries: [] })
  })

  it('matches case-insensitively across all four entity types', async () => {
    const diag: DiagnosticEntry = {
      id: 'd1',
      spaceId: SPACE_ID,
      periodStart: '2026-07-13',
      periodEnd: '2026-07-19',
      scope: 'week',
      autoStats: {},
      userFeedback: 'felt GREAT about my Mornings this week',
      aiInsight: 'unrelated text',
      includedNorthStarContext: false,
      generatedBy: 'scheduled',
    }
    const results = searchAll('morning', {
      habits: [{ id: 'h1', spaceId: SPACE_ID, name: 'Morning walk', habitType: 'build', schedule: { type: 'daily', params: {} }, reminderTimes: [], criticalReminder: false, createdAt: '' }],
      todos: [{ id: 't1', spaceId: SPACE_ID, title: 'Morning standup notes', criticalReminder: false, status: 'open', createdAt: '' }],
      journalEntries: [{ id: 'j1', spaceId: SPACE_ID, date: '2026-07-18', text: 'a rough Morning today', createdAt: '' }],
      diagnosticEntries: [diag],
    })

    expect(results.habits).toHaveLength(1)
    expect(results.todos).toHaveLength(1)
    expect(results.journalEntries).toHaveLength(1)
    expect(results.diagnosticEntries).toHaveLength(1)
  })

  it('matches a DiagnosticEntry on aiInsight even when userFeedback does not contain the term', () => {
    const diag: DiagnosticEntry = {
      id: 'd1',
      spaceId: SPACE_ID,
      periodStart: '2026-07-13',
      periodEnd: '2026-07-19',
      scope: 'week',
      autoStats: {},
      userFeedback: '',
      aiInsight: 'your strongest streak was on Tuesdays',
      includedNorthStarContext: false,
      generatedBy: 'scheduled',
    }
    const results = searchAll('tuesdays', { habits: [], todos: [], journalEntries: [], diagnosticEntries: [diag] })
    expect(results.diagnosticEntries).toHaveLength(1)
  })

  it('does not match unrelated records', () => {
    const results = searchAll('zzz-no-match', {
      habits: [{ id: 'h1', spaceId: SPACE_ID, name: 'Read', habitType: 'build', schedule: { type: 'daily', params: {} }, reminderTimes: [], criticalReminder: false, createdAt: '' }],
      todos: [],
      journalEntries: [],
      diagnosticEntries: [],
    })
    expect(results.habits).toHaveLength(0)
  })
})

/**
 * Article 48's own verification bar flags this as "the one most likely to
 * have a gap": search must never surface a soft-deleted Habit/Todo. Rather
 * than re-testing searchAll's pure filtering (already covered above), this
 * exercises the real data path SearchPage actually uses — listActiveHabits/
 * listActiveTodos, the same Article 20 functions every other active-item
 * screen goes through — so a regression here would mean the query surface
 * itself started bypassing the exclusion, not just a logic bug in matching.
 */
describe('search respects soft-delete (Article 20 + 48)', () => {
  it('excludes a soft-deleted Habit from search results, while still matching the active one', async () => {
    const input: NewHabitInput = {
      spaceId: SPACE_ID,
      name: 'Duplicate Meditate',
      habitType: 'build',
      schedule: { type: 'daily', params: {} },
      reminderTimes: [],
      criticalReminder: false,
    }
    const active = await createHabit(input)
    const trashed = await createHabit(input)
    await deleteHabitRecord(trashed.id)

    const habits = await listActiveHabits(SPACE_ID)
    const results = searchAll('meditate', { habits, todos: [], journalEntries: [], diagnosticEntries: [] })

    expect(results.habits.map((h) => h.id)).toEqual([active.id])
  })

  it('excludes a soft-deleted Todo from search results, while still matching the active one', async () => {
    const input: NewTodoInput = { spaceId: SPACE_ID, title: 'Duplicate renew visa', criticalReminder: false }
    const active = await createTodo(input)
    const trashed = await createTodo(input)
    await deleteTodoRecord(trashed.id)

    const todos = await listActiveTodos(SPACE_ID)
    const results = searchAll('visa', { habits: [], todos, journalEntries: [], diagnosticEntries: [] })

    expect(results.todos.map((td) => td.id)).toEqual([active.id])
  })

  it('journal entries have no soft-delete concept — a matching entry always surfaces', async () => {
    await createJournalEntry({ spaceId: SPACE_ID, date: '2026-07-18', text: 'unique-marker-xyz reflection' })
    const journalEntries = await listJournalEntries(SPACE_ID)
    const results = searchAll('unique-marker-xyz', { habits: [], todos: [], journalEntries, diagnosticEntries: [] })
    expect(results.journalEntries).toHaveLength(1)
  })
})
