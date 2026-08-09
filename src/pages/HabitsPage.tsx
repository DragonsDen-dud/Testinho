import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useHabitsQuery, useLogsForDate, useHabitLogsForHabits } from '../state/useHabits'
import { useDomains } from '../state/useDomains'
import { createHabit, updateHabit, archiveHabit, deleteHabit, restoreHabit, pauseHabit, resumeHabit } from '../data/habits'
import { showUndoToast } from '../state/toast'
import { HabitForm } from '../components/habits/HabitForm'
import { HabitGrid } from '../components/habits/HabitGrid'
import { HabitGridSkeleton } from '../components/habits/HabitGridSkeleton'
import { JustCompletedMoodPrompt } from '../components/habits/JustCompletedMoodPrompt'
import { HabitDetailSheet } from '../components/habits/HabitDetailSheet'
import { todayKey } from '../lib/date'
import { computeCatchUpDays, countCatchUpPending } from '../lib/habitCatchUp'

export function HabitsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()
  const settings = useAppSettings()
  const { habits, loaded: habitsLoaded } = useHabitsQuery(settings?.activeSpaceId)
  const domains = useDomains(settings?.activeSpaceId)
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

  const doneHabits = habits.filter((h) => logsToday.get(h.id)?.status === 'done')

  // Habit catch-up round — entry-point banner only ever renders when
  // there's something real pending in the lookback window (Article 19
  // tone: state a fact, not a permanent fixture nagging every visit).
  const catchUpLogsByHabit = useHabitLogsForHabits(habits.map((h) => h.id))
  const catchUpDays = computeCatchUpDays(habits, catchUpLogsByHabit)
  const catchUpPendingCount = countCatchUpPending(catchUpDays)

  // STOA-5 Part B — same post-completion mood prompt as Today (see
  // DashboardPage): marking a habit done unmounts its card into the tray,
  // so this is the only place the completion path can be rated at all.
  const [moodPromptHabitId, setMoodPromptHabitId] = useState<string | null>(null)
  function handleLogged(habitId: string) {
    setMoodPromptHabitId(habitId)
  }
  const moodPromptHabit = moodPromptHabitId ? habits.find((h) => h.id === moodPromptHabitId) : undefined

  function closeForm() {
    setCreating(false)
    setQuickCreateTitle(undefined)
    if (params.id) navigate('/habits')
  }

  return (
    // Same widened gutter and max width as Today — the two screens share
    // the grid, so they have to share its measure too.
    <div className="px-3.5 py-4 max-w-lg mx-auto w-full flex flex-col gap-3">
      {/* STOA-7 Part B — same hero mesh treatment as Today, ending before
          the habit list starts. The count is a fact already on this screen,
          not a new metric. The negative top margin cancels the page padding
          *and* the shell's safe-area inset so the mesh reaches the top
          edge, with the inset re-added as padding so the title clears the
          status bar (see AppShell). */}
      <div className="stoa-mesh-hero -mx-3.5 -mt-[calc(1rem+env(safe-area-inset-top))] px-3.5 pb-7 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <h1 className="font-display text-3xl uppercase text-[var(--stoa-text)]">{t('habits.title')}</h1>
        <div className="font-heading text-xs uppercase text-[var(--stoa-text-muted)] mt-1.5">
          {t('habits.heroCount', { done: doneHabits.length, total: habits.length })}
        </div>
      </div>

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

      {/* Same grid as Today — one component, so the two screens can't
          drift into different treatments of the same content. The grid owns
          its own empty state now (with a create action), so the page-level
          EmptyState that used to sit above it would have been a duplicate. */}
      {!habitsLoaded ? (
        <HabitGridSkeleton />
      ) : (
        <HabitGrid
          habits={habits}
          logsToday={logsToday}
          logsByHabit={catchUpLogsByHabit}
          domains={domains}
          onOpenHistory={(habit) => navigate(`/habits/${habit.id}`)}
          onEditHabit={(habit) => navigate(`/habits/${habit.id}/edit`)}
          onCreateHabit={() => setCreating(true)}
          onLogged={handleLogged}
        />
      )}

      {moodPromptHabit && (
        <JustCompletedMoodPrompt
          key={moodPromptHabit.id}
          habit={moodPromptHabit}
          date={todayKey()}
          onDismiss={() => setMoodPromptHabitId(null)}
        />
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
