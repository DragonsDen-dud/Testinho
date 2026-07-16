import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSettings } from '../state/useAppSettings'
import { useHabits } from '../state/useHabits'
import { useTodos } from '../state/useTodos'
import { useTimeBlocks } from '../state/useTimeBlocks'
import { usePlanEntry } from '../state/usePlanEntry'
import { savePlanEntry } from '../data/planEntries'
import { TextArea } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { addDays, todayKey, formatHumanDate } from '../lib/date'
import { isScheduledOnDate } from '../lib/habitStrength'

export function PlanningPage() {
  const { t, i18n } = useTranslation()
  const settings = useAppSettings()
  const [date, setDate] = useState(todayKey())
  const habits = useHabits(settings?.activeSpaceId)
  const timeBlocks = useTimeBlocks(settings?.activeSpaceId)
  const todos = useTodos(settings?.activeSpaceId).filter((td) => td.status === 'open')
  const planEntry = usePlanEntry(settings?.activeSpaceId, date, 'day')

  // Article 29 — todos with a scheduledTime for this date, alongside habits
  // grouped by TimeBlock. TimeBlock only carries a freeform approxTimeRange
  // string, not a structured start time, so a single minute-precise merged
  // timeline isn't mechanically possible with the current data model; these
  // render as two adjacent groups instead (see PR notes).
  const habitsOnDate = habits.filter((h) => isScheduledOnDate(h, date))
  const habitsByTimeBlock = timeBlocks
    .map((tb) => ({ timeBlock: tb, habits: habitsOnDate.filter((h) => h.timeBlockId === tb.id) }))
    .filter((group) => group.habits.length > 0)
  const unblockedHabits = habitsOnDate.filter((h) => !h.timeBlockId)
  const scheduledTodos = todos
    .filter((td) => td.dueDate === date && td.scheduledTime)
    .sort((a, b) => (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? ''))

  const [content, setContent] = useState('')
  const [linkedHabitIds, setLinkedHabitIds] = useState<string[]>([])
  const [linkedTodoIds, setLinkedTodoIds] = useState<string[]>([])

  useEffect(() => {
    setContent(planEntry?.content ?? '')
    setLinkedHabitIds(planEntry?.linkedHabitIds ?? [])
    setLinkedTodoIds(planEntry?.linkedTodoIds ?? [])
  }, [planEntry?.id, date])

  async function save() {
    if (!settings?.activeSpaceId) return
    await savePlanEntry({
      spaceId: settings.activeSpaceId,
      date,
      scope: 'day',
      content,
      linkedHabitIds,
      linkedTodoIds,
    })
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{t('planning.title')}</h1>

      <div className="flex items-center justify-between">
        <button className="text-sm text-[var(--stoa-text-muted)] px-2" onClick={() => setDate((d) => addDays(d, -1))}>
          ←
        </button>
        <span className="text-sm font-medium">
          {date === todayKey() ? t('common.today') : formatHumanDate(date, i18n.language)}
        </span>
        <button className="text-sm text-[var(--stoa-text-muted)] px-2" onClick={() => setDate((d) => addDays(d, 1))}>
          →
        </button>
      </div>

      <TextArea
        rows={5}
        placeholder={t('planning.planPlaceholder')}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {(habitsByTimeBlock.length > 0 || unblockedHabits.length > 0 || scheduledTodos.length > 0) && (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium text-[var(--stoa-text-muted)]">{t('planning.timelineTitle')}</div>

          {habitsByTimeBlock.map(({ timeBlock, habits: blockHabits }) => (
            <div key={timeBlock.id} className="flex flex-col gap-1">
              <div className="text-xs font-semibold text-[var(--stoa-accent)]">{timeBlock.name}</div>
              {blockHabits.map((h) => (
                <div key={h.id} className="text-sm pl-2">
                  {h.name}
                </div>
              ))}
            </div>
          ))}

          {unblockedHabits.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold text-[var(--stoa-text-muted)]">{t('planning.noTimeBlock')}</div>
              {unblockedHabits.map((h) => (
                <div key={h.id} className="text-sm pl-2">
                  {h.name}
                </div>
              ))}
            </div>
          )}

          {scheduledTodos.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold text-[var(--stoa-accent)]">{t('todos.scheduledTime')}</div>
              {scheduledTodos.map((td) => (
                <div key={td.id} className="text-sm pl-2 flex gap-2">
                  <span className="text-[var(--stoa-text-muted)] tabular-nums">{td.scheduledTime}</span>
                  {td.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {habits.length > 0 && (
        <div>
          <div className="text-xs font-medium text-[var(--stoa-text-muted)] mb-2">{t('planning.linkedHabits')}</div>
          <div className="flex flex-col gap-1.5">
            {habits.map((h) => (
              <label key={h.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={linkedHabitIds.includes(h.id)}
                  onChange={(e) =>
                    setLinkedHabitIds((prev) =>
                      e.target.checked ? [...prev, h.id] : prev.filter((id) => id !== h.id),
                    )
                  }
                />
                {h.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {todos.length > 0 && (
        <div>
          <div className="text-xs font-medium text-[var(--stoa-text-muted)] mb-2">{t('planning.linkedTodos')}</div>
          <div className="flex flex-col gap-1.5">
            {todos.map((td) => (
              <label key={td.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={linkedTodoIds.includes(td.id)}
                  onChange={(e) =>
                    setLinkedTodoIds((prev) =>
                      e.target.checked ? [...prev, td.id] : prev.filter((id) => id !== td.id),
                    )
                  }
                />
                {td.title}
              </label>
            ))}
          </div>
        </div>
      )}

      <Button onClick={save}>{t('planning.save')}</Button>
    </div>
  )
}
