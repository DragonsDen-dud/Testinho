import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSettings } from '../state/useAppSettings'
import { useOverdueTodos } from '../state/useTodos'
import { bulkRescheduleTodos, rescheduleTodo } from '../data/todos'
import { TodoItem } from '../components/todos/TodoItem'
import { RescheduleMenu } from '../components/todos/RescheduleMenu'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { addDays, todayKey } from '../lib/date'

export function OverdueTriagePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const overdue = useOverdueTodos(settings?.activeSpaceId)
  const [handlingOneByOne, setHandlingOneByOne] = useState(false)

  async function bulkReschedule(newDueDate: string) {
    await bulkRescheduleTodos(
      overdue.map((t) => t.id),
      newDueDate,
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <h1 className="text-lg font-semibold">{t('todos.overdueTriageTitle')}</h1>
        <div className="w-10" />
      </div>

      {overdue.length === 0 ? (
        <EmptyState text={t('todos.overdueTriageEmpty')} />
      ) : (
        <>
          <p className="text-sm text-[var(--stoa-text-muted)]">
            {t('dashboard.overdueBanner', { count: overdue.length })}
          </p>

          {!handlingOneByOne && (
            <div className="flex flex-col gap-2">
              <Button onClick={() => bulkReschedule(todayKey())}>{t('todos.rescheduleAllToday')}</Button>
              <Button variant="secondary" onClick={() => bulkReschedule(addDays(todayKey(), 1))}>
                {t('todos.rescheduleAllTomorrow')}
              </Button>
              <Button variant="ghost" onClick={() => setHandlingOneByOne(true)}>
                {t('todos.handleOneByOne')}
              </Button>
            </div>
          )}

          {handlingOneByOne && (
            <div className="flex flex-col gap-2">
              {overdue.map((td) => (
                <div key={td.id} className="flex flex-col gap-2">
                  <TodoItem todo={td} onOpen={() => navigate(`/todos/${td.id}/edit`)} />
                  <RescheduleMenu onReschedule={(newDueDate) => rescheduleTodo(td.id, newDueDate)} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
