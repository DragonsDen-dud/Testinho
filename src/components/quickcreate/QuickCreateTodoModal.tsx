// Part 1 — compact quick-create for Todo. Calls the exact same
// createTodo() the full TodoForm uses (see the parallel note in
// QuickCreateHabitModal.tsx — same rule, separate branch, not a shared
// generic form pretending to handle both entity types).

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { MicButton } from '../ui/MicButton'
import { AddToCalendarButton } from '../calendar/AddToCalendarButton'
import { useDomains } from '../../state/useDomains'
import { usePriorityLevels } from '../../state/useTimeBlocks'
import { useProjects } from '../../state/useProjects'
import { useTodos } from '../../state/useTodos'
import { createTodo, updateTodo, type NewTodoInput } from '../../data/todos'
import { mostRecentDomainId, midTierPriorityLevel } from '../../lib/quickCreateDefaults'
import { parseVoiceQuickCreate } from '../../lib/voiceQuickParse'
import { appendTranscript } from '../../lib/speechRecognition'
import { buildTodoIcs } from '../../lib/ics'
import type { Todo } from '../../db/types'

export function QuickCreateTodoModal({
  spaceId,
  onClose,
  onOpenFullEditor,
}: {
  spaceId: string
  onClose: () => void
  onOpenFullEditor: (initialTitle: string) => void
}) {
  const { t, i18n } = useTranslation()
  const domains = useDomains(spaceId)
  const priorities = usePriorityLevels(spaceId)
  const projects = useProjects(spaceId)
  const todos = useTodos(spaceId)

  const [title, setTitle] = useState('')
  const [domainId, setDomainId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priorityLevelId, setPriorityLevelId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [criticalReminder, setCriticalReminder] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [saved, setSaved] = useState<Todo | null>(null)

  // See the parallel note in QuickCreateHabitModal.tsx — useDomains/
  // usePriorityLevels/useTodos are async Dexie live queries, so the smart
  // default is applied the first moment real data is observed rather than
  // in a useMemo on mount (which would race the query and capture "no
  // data yet" as the default).
  const domainDefaultApplied = useRef(false)
  useEffect(() => {
    if (domainDefaultApplied.current || todos.length === 0) return
    domainDefaultApplied.current = true
    setDomainId(mostRecentDomainId(todos) ?? '')
  }, [todos])

  const priorityDefaultApplied = useRef(false)
  useEffect(() => {
    if (priorityDefaultApplied.current || priorities.length === 0) return
    priorityDefaultApplied.current = true
    setPriorityLevelId(midTierPriorityLevel(priorities)?.id ?? '')
  }, [priorities])

  function handleTranscript(transcript: string) {
    const result = parseVoiceQuickCreate(transcript, domains)
    setTitle((prev) => (prev.trim() ? appendTranscript(prev, result.title) : result.title))
    if (result.domain) setDomainId(result.domain.id)
    if (result.dueDate) setDueDate(result.dueDate)
    if (result.scheduledTime) setScheduledTime(result.scheduledTime)
    if (result.calendarIntent) setCriticalReminder(true)
    if (result.domain || result.dueDate || result.scheduledTime || result.calendarIntent) setMoreOpen(true)
  }

  async function submit() {
    if (!title.trim()) return
    const data: NewTodoInput = {
      spaceId,
      title: title.trim(),
      domainId: domainId || undefined,
      projectId: projectId || undefined,
      priorityLevelId: priorityLevelId || undefined,
      dueDate: dueDate || undefined,
      scheduledTime: scheduledTime || undefined,
      criticalReminder,
    }
    const todo = await createTodo(data)
    if (criticalReminder && todo.dueDate) {
      setSaved(todo)
    } else {
      onClose()
    }
  }

  if (saved) {
    return (
      <Sheet
        title={t('quickCreate.savedTitle')}
        onClose={onClose}
        footer={<Button className="w-full" onClick={onClose}>{t('common.close')}</Button>}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--stoa-text-muted)]">{t('quickCreate.savedBody', { name: saved.title })}</p>
          <AddToCalendarButton
            build={buildTodoIcs(saved)}
            onExported={() => updateTodo(saved.id, { calendarExportedAt: new Date().toISOString() })}
          />
        </div>
      </Sheet>
    )
  }

  const domainLabel = domains.find((d) => d.id === domainId)?.name
  const whenLabel = dueDate ? `${dueDate}${scheduledTime ? ` · ${scheduledTime}` : ''}` : undefined

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="secondary" onClick={onClose}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" form="quick-create-todo-form" disabled={!title.trim()}>
        {t('common.save')}
      </Button>
    </div>
  )

  return (
    <Sheet title={t('todos.newTodo')} onClose={onClose} footer={footer}>
      <form
        id="quick-create-todo-form"
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex gap-2 items-center">
          <Input
            autoFocus
            placeholder={t('todos.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
            required
          />
          <MicButton lang={i18n.language} onTranscript={handleTranscript} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip label={domainLabel ?? t('quickCreate.categoryPrompt')} selected={!!domainLabel} onClick={() => setMoreOpen(true)} />
          <Chip label={whenLabel ?? t('quickCreate.whenPrompt')} selected={!!whenLabel} onClick={() => setMoreOpen(true)} />
          {criticalReminder && <Chip label={t('quickCreate.calendarChip')} selected onClick={() => setMoreOpen(true)} />}
        </div>

        <button
          type="button"
          className="text-xs text-[var(--stoa-accent)] self-start"
          onClick={() => setMoreOpen((v) => !v)}
        >
          {moreOpen ? t('quickCreate.hideDetails') : t('quickCreate.moreDetails')}
        </button>

        {moreOpen && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('todos.dueDate')}>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
              <Field label={t('todos.scheduledTime')}>
                <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
              </Field>
            </div>
            <Field label={t('todos.priority')}>
              <Select value={priorityLevelId} onChange={(e) => setPriorityLevelId(e.target.value)}>
                <option value="">{t('common.none')}</option>
                {priorities.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('todos.domain')}>
                <Select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
                  <option value="">{t('common.none')}</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('todos.project')}>
                <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">{t('common.none')}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={criticalReminder} onChange={(e) => setCriticalReminder(e.target.checked)} />
              {t('todos.criticalReminder')}
            </label>
          </div>
        )}

        <button
          type="button"
          className="text-xs text-[var(--stoa-text-muted)] underline underline-offset-2 self-start"
          onClick={() => onOpenFullEditor(title)}
        >
          {t('quickCreate.openFullEditor')}
        </button>
      </form>
    </Sheet>
  )
}
