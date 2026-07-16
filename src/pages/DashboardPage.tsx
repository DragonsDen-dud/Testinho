import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useSpaces } from '../state/useSpaces'
import { useHabits, useLogsForDate } from '../state/useHabits'
import { useOpenTodosToday } from '../state/useTodos'
import { HabitCard } from '../components/habits/HabitCard'
import { TodoItem } from '../components/todos/TodoItem'
import { EmptyState } from '../components/ui/EmptyState'
import { isScheduledOnDate } from '../lib/habitStrength'
import { todayKey } from '../lib/date'

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const spaces = useSpaces()
  const activeSpace = spaces.find((s) => s.id === settings?.activeSpaceId)
  const allHabits = useHabits(settings?.activeSpaceId)
  const date = todayKey()
  const todaysHabits = allHabits.filter((h) => isScheduledOnDate(h, date))
  // Fetched for all habits, not just today's — a dependency can point at a
  // habit that isn't itself scheduled today, and its completion still needs
  // to resolve correctly (Article 25).
  const logsToday = useLogsForDate(
    allHabits.map((h) => h.id),
    date,
  )
  const { today: todosToday, overdue } = useOpenTodosToday(settings?.activeSpaceId)

  const order = settings?.homeScreenModuleOrder ?? ['habits', 'todos']

  const sections: Record<string, ReactNode> = {
    habits: (
      <section key="habits" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--stoa-text-muted)]">{t('dashboard.habitsSection')}</h2>
        {todaysHabits.length === 0 ? (
          <EmptyState text={t('dashboard.noHabitsToday')} />
        ) : (
          todaysHabits.map((h) => (
            <HabitCard key={h.id} habit={h} todayLog={logsToday.get(h.id)} allHabits={allHabits} logsToday={logsToday} />
          ))
        )}
      </section>
    ),
    todos: (
      <section key="todos" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--stoa-text-muted)]">{t('dashboard.todosSection')}</h2>
        {todosToday.length === 0 ? (
          <EmptyState text={t('dashboard.noTodosToday')} />
        ) : (
          <div className="flex flex-col gap-2">
            {todosToday.map((td) => (
              <TodoItem key={td.id} todo={td} onOpen={() => navigate(`/todos/${td.id}/edit`)} />
            ))}
          </div>
        )}
      </section>
    ),
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t('dashboard.title')}</h1>
          {activeSpace && (
            <div className="text-xs text-[var(--stoa-text-muted)]">
              {activeSpace.icon} {activeSpace.name}
            </div>
          )}
        </div>
      </div>

      {overdue.length > 0 && (
        <button
          className="rounded-xl bg-[var(--stoa-danger)]/10 border border-[var(--stoa-danger)]/30 px-3.5 py-2.5 text-sm text-[var(--stoa-danger)] flex items-center justify-between"
          onClick={() => navigate('/todos')}
        >
          <span>{t('dashboard.overdueBanner', { count: overdue.length })}</span>
          <span className="underline">{t('dashboard.reviewOverdue')}</span>
        </button>
      )}

      {order.map((key) => sections[key]).filter(Boolean)}
    </div>
  )
}
