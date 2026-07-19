import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { usePriorityLevels } from '../../state/useTimeBlocks'
import { todayKey } from '../../lib/date'
import type { Todo } from '../../db/types'

/** Article 31 — "Start doing this" requires both fields before promoting out of Someday. */
export function SomedayPromoteForm({
  todo,
  onPromote,
  onClose,
}: {
  todo: Todo
  onPromote: (dueDate: string, priorityLevelId: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const priorities = usePriorityLevels(todo.spaceId)
  const [dueDate, setDueDate] = useState(todayKey())
  const [priorityLevelId, setPriorityLevelId] = useState('')

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="secondary" onClick={onClose}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" form="someday-promote-form" disabled={!dueDate || !priorityLevelId}>
        {t('todos.startDoingThis')}
      </Button>
    </div>
  )

  return (
    <Sheet title={t('todos.startDoingThis')} onClose={onClose} footer={footer}>
      <form
        id="someday-promote-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!dueDate || !priorityLevelId) return
          onPromote(dueDate, priorityLevelId)
        }}
      >
        <p className="text-sm text-[var(--stoa-text-muted)]">{todo.title}</p>
        <Field label={t('todos.dueDate')}>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </Field>
        <Field label={t('todos.priority')}>
          <Select value={priorityLevelId} onChange={(e) => setPriorityLevelId(e.target.value)} required>
            <option value="" disabled>
              {t('todos.priorityRequired')}
            </option>
            {priorities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Sheet>
  )
}
