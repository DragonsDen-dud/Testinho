import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useHabits, useLogsForDate } from '../state/useHabits'
import { createHabit, updateHabit, archiveHabit, deleteHabit, restoreHabit, pauseHabit, resumeHabit } from '../data/habits'
import { showUndoToast } from '../state/toast'
import { HabitForm } from '../components/habits/HabitForm'
import { HabitCard } from '../components/habits/HabitCard'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { todayKey } from '../lib/date'

export function HabitsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const settings = useAppSettings()
  const habits = useHabits(settings?.activeSpaceId)
  const logsToday = useLogsForDate(
    habits.map((h) => h.id),
    todayKey(),
  )
  const [creating, setCreating] = useState(false)
  const [quickCreateTitle, setQuickCreateTitle] = useState<string | undefined>(undefined)
  const [searchParams, setSearchParams] = useSearchParams()

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

  const editingHabit = params.id ? habits.find((h) => h.id === params.id) : undefined
  const formOpen = creating || (!!params.id && !!editingHabit)

  function closeForm() {
    setCreating(false)
    setQuickCreateTitle(undefined)
    if (params.id) navigate('/habits')
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('habits.title')}</h1>
        <Button onClick={() => setCreating(true)}>+ {t('habits.newHabit')}</Button>
      </div>

      {habits.length === 0 && <EmptyState text={t('habits.empty')} />}

      <div className="flex flex-col gap-3">
        {habits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} todayLog={logsToday.get(habit.id)} allHabits={habits} logsToday={logsToday} />
        ))}
      </div>

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
