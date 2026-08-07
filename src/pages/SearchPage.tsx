import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useHabits } from '../state/useHabits'
import { useTodos } from '../state/useTodos'
import { useJournalEntries } from '../state/useJournal'
import { useDiagnosticEntries } from '../state/useDiagnostics'
import { searchAll } from '../lib/search'
import { isTasksPlanningEnabled } from '../lib/featureFlags'
import { Input } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { formatHumanDate, todayKey } from '../lib/date'

export function SearchPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const spaceId = settings?.activeSpaceId

  // Article 48 — habits/todos come from the same listActive*-backed hooks
  // every other screen uses, so soft-deleted records are excluded by
  // construction rather than by a search-specific filter that could drift.
  const habits = useHabits(spaceId)
  // Habits Refocus round — tasks drop out of search results while the flag
  // is off, since their detail route redirects to Today: a result that
  // can't be opened is worse than no result. The Todo rows themselves are
  // untouched in the database and searchable again the moment the flag
  // flips back.
  const rawTodos = useTodos(spaceId)
  const todos = isTasksPlanningEnabled(settings) ? rawTodos : []
  const journalEntries = useJournalEntries(spaceId)
  const diagnosticEntries = useDiagnosticEntries(spaceId)

  const [query, setQuery] = useState('')
  const results = searchAll(query, { habits, todos, journalEntries, diagnosticEntries })
  const hasQuery = query.trim().length > 0
  const hasResults =
    results.habits.length > 0 ||
    results.todos.length > 0 ||
    results.journalEntries.length > 0 ||
    results.diagnosticEntries.length > 0

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{t('search.title')}</h1>

      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('search.placeholder')}
      />

      {hasQuery && !hasResults && <EmptyState text={t('search.noResults')} />}

      {results.habits.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('search.habitsSection')}</h2>
          {results.habits.map((h) => (
            <button
              key={h.id}
              className="text-left text-sm rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-2.5"
              onClick={() => navigate(`/habits/${h.id}`)}
            >
              {h.name}
            </button>
          ))}
        </section>
      )}

      {results.todos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('search.todosSection')}</h2>
          {results.todos.map((td) => (
            <button
              key={td.id}
              className="text-left text-sm rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-2.5"
              onClick={() => navigate(`/todos/${td.id}`)}
            >
              {td.title}
            </button>
          ))}
        </section>
      )}

      {results.journalEntries.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('search.journalSection')}</h2>
          {results.journalEntries.map((entry) => (
            <button
              key={entry.id}
              className="text-left text-sm rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-2.5 flex flex-col gap-0.5"
              onClick={() => navigate(`/journal?entry=${entry.id}`)}
            >
              <span className="text-xs text-[var(--stoa-text-muted)]">
                {entry.date === todayKey() ? t('common.today') : formatHumanDate(entry.date, i18n.language)}
              </span>
              <span className="line-clamp-2">{entry.text}</span>
            </button>
          ))}
        </section>
      )}

      {results.diagnosticEntries.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('search.diagnosticsSection')}</h2>
          {results.diagnosticEntries.map((entry) => (
            <button
              key={entry.id}
              className="text-left text-sm rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-2.5 flex flex-col gap-0.5"
              onClick={() => navigate(`/diagnostics/${entry.id}`)}
            >
              <span className="text-xs text-[var(--stoa-text-muted)]">
                {formatHumanDate(entry.periodStart, i18n.language)} – {formatHumanDate(entry.periodEnd, i18n.language)}
              </span>
              <span className="line-clamp-2">{entry.userFeedback || entry.aiInsight}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  )
}
