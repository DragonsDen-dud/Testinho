import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useHabits, useLogsForDate } from '../state/useHabits'
import { createHabit, updateHabit, archiveHabit } from '../data/habits'
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

  const editingHabit = params.id ? habits.find((h) => h.id === params.id) : undefined
  const formOpen = creating || (!!params.id && !!editingHabit)

  function closeForm() {
    setCreating(false)
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
          <HabitCard key={habit.id} habit={habit} todayLog={logsToday.get(habit.id)} />
        ))}
      </div>

      {formOpen && settings?.activeSpaceId && (
        <HabitForm
          spaceId={settings.activeSpaceId}
          initial={editingHabit}
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
        />
      )}
    </div>
  )
}
