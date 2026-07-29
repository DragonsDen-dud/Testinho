import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useHabits, useLogsForDate, useHabitLogsForHabits } from '../state/useHabits'
import { createHabit, updateHabit, archiveHabit, deleteHabit, restoreHabit, pauseHabit, resumeHabit } from '../data/habits'
import { showUndoToast } from '../state/toast'
import { HabitForm } from '../components/habits/HabitForm'
import { HabitCard } from '../components/habits/HabitCard'
import { CompletedHabitBubble } from '../components/habits/CompletedHabitBubble'
import { HabitDetailSheet } from '../components/habits/HabitDetailSheet'
import { EmptyState } from '../components/ui/EmptyState'
import { todayKey } from '../lib/date'
import { computeCatchUpDays, countCatchUpPending } from '../lib/habitCatchUp'

export function HabitsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()
  const settings = useAppSettings()
  const habits = useHabits(settings?.activeSpaceId)
  const logsToday = useLogsForDate(
    habits.map((h) => h.id),
    todayKey(),
  )
  const [creating, setCreating] = useState(false)
  const [quickCreateTitle, setQuickCreateTitle] = useState<string | undefined>(undefined)
  const [searchParams, setSearchParams] = useSearchParams()
  // Tracks habits completed by an explicit click *in this session*, so the
  // one-shot collapse/milestone animation only ever plays for the action
  // that caused it — never replayed for a habit already done earlier today
  // on page load/reload (see HabitCard's onLogged contract).
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set())

  // A tap on a habit card lands on /habits/:id (read-only Detail View,
  // below) — /habits/:id/edit is reached only via that view's explicit
  // "Edit" button, never directly from the list anymore.
  const isEditRoute = location.pathname.endsWith('/edit')

  // Article 49 — the quick-add FAB navigates here with ?new=1 rather than
  // opening the form itself, so this is the same "New habit" flow whether
  // reached from this page's own button or from any other screen. `title`
  // additionally carries over whatever was typed into the Part 1 compact
  // quick-create modal before the user chose "Open full editor", so
  // switching to the full form doesn't lose it.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreating(true)
      setQuickCreateTitle(searchParams.get('title') ?? undefined)
      setSearchParams((prev) => {
        prev.delete('new')
        prev.delete('title')
        return prev
      })
    }
  }, [searchParams, setSearchParams])

  const viewingHabit = params.id && !isEditRoute ? habits.find((h) => h.id === params.id) : undefined
  const editingHabit = params.id && isEditRoute ? habits.find((h) => h.id === params.id) : undefined
  const formOpen = creating || (!!params.id && isEditRoute && !!editingHabit)

  const notDoneHabits = habits.filter((h) => logsToday.get(h.id)?.status !== 'done')
  const doneHabits = habits.filter((h) => logsToday.get(h.id)?.status === 'done')

  // Habit catch-up round — entry-point banner only ever renders when
  // there's something real pending in the lookback window (Article 19
  // tone: state a fact, not a permanent fixture nagging every visit).
  const catchUpLogsByHabit = useHabitLogsForHabits(habits.map((h) => h.id))
  const catchUpDays = computeCatchUpDays(habits, catchUpLogsByHabit)
  const catchUpPendingCount = countCatchUpPending(catchUpDays)

  function handleLogged(habitId: string) {
    setJustCompletedIds((prev) => (prev.has(habitId) ? prev : new Set(prev).add(habitId)))
  }

  function closeForm() {
    setCreating(false)
    setQuickCreateTitle(undefined)
    if (params.id) navigate('/habits')
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-3">
      <h1 className="text-lg font-semibold">{t('habits.title')}</h1>

      {catchUpPendingCount > 0 && (
        <div className="rounded-xl bg-[var(--stoa-accent-soft)] px-3.5 py-2.5 text-sm flex items-center justify-between gap-2">
          <span className="flex-1">{t('habits.catchUpBannerCount', { count: catchUpPendingCount })}</span>
          <button
            type="button"
            className="text-xs font-medium underline underline-offset-2 shrink-0"
            onClick={() => navigate('/habits/catch-up')}
          >
            {t('habits.catchUpBannerCta')}
          </button>
        </div>
      )}

      {habits.length === 0 && <EmptyState text={t('habits.empty')} />}

      <div className="flex flex-col gap-4">
        {notDoneHabits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            todayLog={logsToday.get(habit.id)}
            allHabits={habits}
            logsToday={logsToday}
            onLogged={() => handleLogged(habit.id)}
          />
        ))}
      </div>

      {doneHabits.length > 0 && (
        <div className="flex flex-col gap-2 bg-canvas rounded-card p-3">
          <h2 className="text-xs font-semibold text-[var(--stoa-text-muted)] uppercase tracking-wide px-1">
            {t('habits.doneTodaySection')}
          </h2>
          <div className="flex flex-wrap gap-x-3 gap-y-4 px-1 pt-1">
            {doneHabits.map((habit) => (
              <CompletedHabitBubble key={habit.id} habit={habit} justCompleted={justCompletedIds.has(habit.id)} />
            ))}
          </div>
        </div>
      )}

      {viewingHabit && (
        <HabitDetailSheet
          habit={viewingHabit}
          allHabits={habits}
          onClose={() => navigate('/habits')}
          onEdit={() => navigate(`/habits/${viewingHabit.id}/edit`)}
        />
      )}

      {formOpen && settings?.activeSpaceId && (
        <HabitForm
          spaceId={settings.activeSpaceId}
          initial={editingHabit}
          initialTitle={quickCreateTitle}
          allHabits={habits}
          onClose={closeForm}
          onSave={async (data) => {
            if (editingHabit) {
              await updateHabit(editingHabit.id, data)
            } else {
              await createHabit(data)
            }
            closeForm()
          }}
          onArchive={
            editingHabit
              ? async () => {
                  await archiveHabit(editingHabit.id)
                  closeForm()
                }
              : undefined
          }
          onDelete={
            editingHabit
              ? async () => {
                  const id = editingHabit.id
                  await deleteHabit(id)
                  closeForm()
                  // Article 50 — same restoreHabit Trash already uses, so
                  // Undo produces an identical result to a manual restore.
                  showUndoToast(t('common.deletedToast'), () => restoreHabit(id))
                }
              : undefined
          }
          onPause={
            editingHabit
              ? async (until) => {
                  await pauseHabit(editingHabit.id, until)
                }
              : undefined
          }
          onResume={
            editingHabit
              ? async () => {
                  await resumeHabit(editingHabit.id)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
