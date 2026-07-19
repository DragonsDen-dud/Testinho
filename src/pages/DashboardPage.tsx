import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSettings, updateAppSettings } from '../state/useAppSettings'
import { useSpaces } from '../state/useSpaces'
import { useHabits, useLogsForDate } from '../state/useHabits'
import { useOpenTodosToday } from '../state/useTodos'
import { useConnectivity } from '../state/useConnectivity'
import { HabitCard } from '../components/habits/HabitCard'
import { CompletedHabitRow } from '../components/habits/CompletedHabitRow'
import { ConnectivityPanel } from '../components/dashboard/ConnectivityPanel'
import { BackupReminderBanner } from '../components/dashboard/BackupReminderBanner'
import { TodoItem } from '../components/todos/TodoItem'
import { EmptyState } from '../components/ui/EmptyState'
import { isScheduledOnDate } from '../lib/habitStrength'
import { shouldShowOverdueBanner } from '../lib/overdueBanner'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { isBackupReminderDue } from '../lib/backupReminder'
import { todayKey } from '../lib/date'
import type { Todo } from '../db/types'

// Completion-moment animation duration (Articles 3/6/19 round) — must
// outlast .stoa-check-pop (350ms) + .stoa-checkmark-draw's 80ms delay +
// 250ms draw, with a small margin. useOpenTodosToday's live query would
// otherwise drop a just-checked todo from "today" within a single frame
// of the write resolving, which raced the animation to invisibility (see
// scratchpad frame-by-frame capture: gone by frame 1, ~16ms in).
const TODO_CHECK_GRACE_MS = 650

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
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set())
  const notDoneHabits = todaysHabits.filter((h) => logsToday.get(h.id)?.status !== 'done')
  const doneHabits = todaysHabits.filter((h) => logsToday.get(h.id)?.status === 'done')
  function handleHabitLogged(habitId: string) {
    setJustCompletedIds((prev) => (prev.has(habitId) ? prev : new Set(prev).add(habitId)))
  }
  const { today: todosToday, overdue, loaded: todosLoaded } = useOpenTodosToday(settings?.activeSpaceId)
  const [pendingDoneTodos, setPendingDoneTodos] = useState<Map<string, Todo>>(new Map())
  function handleTodoChecked(todo: Todo) {
    setPendingDoneTodos((prev) => new Map(prev).set(todo.id, { ...todo, status: 'done' }))
    setTimeout(() => {
      setPendingDoneTodos((prev) => {
        if (!prev.has(todo.id)) return prev
        const next = new Map(prev)
        next.delete(todo.id)
        return next
      })
    }, TODO_CHECK_GRACE_MS)
  }
  // Same key as the live list, so React keeps reusing the mounted
  // TodoItem instance (and its local justChecked state) as its `todo`
  // prop swaps from the live "open" object to this done snapshot.
  const visibleTodosToday = [
    ...todosToday,
    ...[...pendingDoneTodos.values()].filter((t) => !todosToday.some((td) => td.id === t.id)),
  ]
  const { statuses: connectivityStatuses, recheck: recheckConnectivity } = useConnectivity()
  const { pullDistance, refreshing, threshold } = usePullToRefresh(recheckConnectivity)
  const backupReminderDue = settings ? isBackupReminderDue(settings, date) : false

  // Article 30 — once per calendar day. Deliberately does NOT latch on a
  // negative result: useOpenTodosToday's live query can resolve once for
  // spaceId=undefined (before settings loads, returning an empty/stale
  // overdue list) before re-resolving again for the real spaceId — "has
  // resolved once" isn't the same as "has settled to the real value". So
  // this only ever locks in when it finds something to show (via the ref);
  // an empty/stale read is silently ignored and re-checked next render
  // rather than being treated as a final "nothing to show" verdict.
  const [showOverdueBanner, setShowOverdueBanner] = useState(false)
  const markedShownRef = useRef(false)
  useEffect(() => {
    if (markedShownRef.current || !settings?.activeSpaceId || !todosLoaded) return
    if (overdue.length > 0 && shouldShowOverdueBanner(settings.overdueBannerLastShownDate, date)) {
      markedShownRef.current = true
      setShowOverdueBanner(true)
      updateAppSettings({ overdueBannerLastShownDate: date })
    }
  }, [settings, todosLoaded, overdue.length, date])

  const order = settings?.homeScreenModuleOrder ?? ['habits', 'todos']

  const sections: Record<string, ReactNode> = {
    habits: (
      <section key="habits" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--stoa-text-muted)]">{t('dashboard.habitsSection')}</h2>
        {todaysHabits.length === 0 ? (
          <EmptyState text={t('dashboard.noHabitsToday')} />
        ) : (
          <>
            {notDoneHabits.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                todayLog={logsToday.get(h.id)}
                allHabits={allHabits}
                logsToday={logsToday}
                onLogged={() => handleHabitLogged(h.id)}
                vibrant
              />
            ))}
            {doneHabits.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                <h3 className="text-xs font-semibold text-[var(--stoa-text-muted)] uppercase tracking-wide">
                  {t('habits.doneTodaySection')}
                </h3>
                {doneHabits.map((h) => (
                  <CompletedHabitRow key={h.id} habit={h} justCompleted={justCompletedIds.has(h.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    ),
    todos: (
      <section key="todos" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--stoa-text-muted)]">{t('dashboard.todosSection')}</h2>
        {visibleTodosToday.length === 0 ? (
          <EmptyState text={t('dashboard.noTodosToday')} />
        ) : (
          <div className="flex flex-col gap-2">
            {visibleTodosToday.map((td) => (
              <TodoItem
                key={td.id}
                todo={td}
                onOpen={() => navigate(`/todos/${td.id}`)}
                onChecked={handleTodoChecked}
                vibrant
              />
            ))}
          </div>
        )}
      </section>
    ),
  }

  return (
    <div className="stoa-vibrant p-4 max-w-md mx-auto w-full flex flex-col gap-5">
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center text-xs text-[var(--stoa-text-muted)] overflow-hidden transition-[height]"
          style={{ height: refreshing ? 28 : Math.min(pullDistance, threshold * 1.5) }}
        >
          {refreshing
            ? t('dashboard.refreshing')
            : pullDistance >= threshold
              ? t('dashboard.releaseToRefresh')
              : t('dashboard.pullToRefresh')}
        </div>
      )}

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

      <ConnectivityPanel statuses={connectivityStatuses} />

      {showOverdueBanner && (
        <div className="rounded-xl bg-[var(--stoa-danger)]/10 border border-[var(--stoa-danger)]/30 px-3.5 py-2.5 text-sm text-[var(--stoa-danger)] flex items-center justify-between gap-2">
          <button className="flex-1 text-left underline-offset-2" onClick={() => navigate('/todos/overdue')}>
            {t('dashboard.overdueBanner', { count: overdue.length })} — {t('dashboard.reviewOverdue')}
          </button>
          <button
            aria-label={t('common.close')}
            className="text-[var(--stoa-danger)]/70 hover:text-[var(--stoa-danger)] px-1"
            onClick={() => setShowOverdueBanner(false)}
          >
            ×
          </button>
        </div>
      )}

      {backupReminderDue && <BackupReminderBanner intervalDays={settings?.backupReminderIntervalDays ?? 30} />}

      {order.map((key) => sections[key]).filter(Boolean)}
    </div>
  )
}
