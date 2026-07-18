import type { Habit, Todo, JournalEntry, DiagnosticEntry } from '../db/types'

export interface SearchResults {
  habits: Habit[]
  todos: Todo[]
  journalEntries: JournalEntry[]
  diagnosticEntries: DiagnosticEntry[]
}

function matches(text: string | undefined, needle: string): boolean {
  return !!text && text.toLowerCase().includes(needle)
}

/**
 * Article 48 — pure matching only. Deliberately takes already-fetched
 * arrays rather than querying the database itself, so soft-delete exclusion
 * stays where it already lives: callers pass the results of
 * useHabits/useTodos (both backed by listActiveHabits/listActiveTodos,
 * Article 20), so a search result can't bypass that filter by construction.
 * Journal entries and DiagnosticEntry rows have no deletedAt concept at all
 * (Trash covers Habit/Todo/Project only), so nothing to exclude there.
 */
export function searchAll(
  query: string,
  data: {
    habits: Habit[]
    todos: Todo[]
    journalEntries: JournalEntry[]
    diagnosticEntries: DiagnosticEntry[]
  },
): SearchResults {
  const needle = query.trim().toLowerCase()
  if (!needle) return { habits: [], todos: [], journalEntries: [], diagnosticEntries: [] }

  return {
    habits: data.habits.filter((h) => matches(h.name, needle)),
    todos: data.todos.filter((td) => matches(td.title, needle)),
    journalEntries: data.journalEntries.filter((e) => matches(e.text, needle)),
    diagnosticEntries: data.diagnosticEntries.filter(
      (d) => matches(d.userFeedback, needle) || matches(d.aiInsight, needle),
    ),
  }
}
