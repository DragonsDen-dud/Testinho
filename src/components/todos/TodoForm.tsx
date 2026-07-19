import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input, Select, TextArea } from '../ui/Input'
import { Button } from '../ui/Button'
import { PhotoAttachmentInput } from '../ui/PhotoAttachmentInput'
import { useDomains } from '../../state/useDomains'
import { usePriorityLevels } from '../../state/useTimeBlocks'
import { useProjects } from '../../state/useProjects'
import type { Todo, TodoSubtask, TodoRecurrenceType } from '../../db/types'
import type { NewTodoInput } from '../../data/todos'
import { updateTodo } from '../../data/todos'
import { newId } from '../../lib/id'
import { AddToCalendarButton } from '../calendar/AddToCalendarButton'
import { buildTodoIcs } from '../../lib/ics'
import { REMINDER_OFFSET_OPTIONS } from '../../lib/reminderTiming'

export function TodoForm({
  spaceId,
  initial,
  initialTitle,
  defaultProjectId,
  onSave,
  onClose,
  onArchive,
  onDelete,
  onMoveToSomeday,
}: {
  spaceId: string
  initial?: Todo
  /** Pre-fills the title field for a new todo (e.g. carried over from the
   * Part 1 compact quick-create's "Open full editor" link) — ignored when
   * editing an existing todo, `initial` always wins. */
  initialTitle?: string
  defaultProjectId?: string
  /** Returns the saved Todo (not void) so this form can show the Article
   * B.2 State 5 post-save "Add to Calendar" confirmation before actually
   * closing, when criticalReminder is set — the caller no longer closes
   * the sheet itself, this form does, once truly done. */
  onSave: (data: NewTodoInput) => Promise<Todo>
  onClose: () => void
  onArchive?: () => void
  onDelete?: () => void
  onMoveToSomeday?: () => void
}) {
  const { t } = useTranslation()
  const domains = useDomains(spaceId)
  const priorities = usePriorityLevels(spaceId)
  const projects = useProjects(spaceId)

  const [title, setTitle] = useState(initial?.title ?? initialTitle ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [photo, setPhoto] = useState<Blob | undefined>(initial?.photo)
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [scheduledTime, setScheduledTime] = useState(initial?.scheduledTime ?? '')
  const [priorityLevelId, setPriorityLevelId] = useState(initial?.priorityLevelId ?? '')
  const [domainId, setDomainId] = useState(initial?.domainId ?? '')
  const [projectId, setProjectId] = useState(initial?.projectId ?? defaultProjectId ?? '')
  const [criticalReminder, setCriticalReminder] = useState(initial?.criticalReminder ?? false)
  // Article B.2 — State 3: a distinct, explicit opt-in, never inferred from
  // scheduledTime's mere presence.
  const [reminderEnabled, setReminderEnabled] = useState(initial?.reminderEnabled ?? false)
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState(initial?.reminderOffsetMinutes ?? 0)
  const [reminderNeedsTimeError, setReminderNeedsTimeError] = useState(false)
  const [subtasks, setSubtasks] = useState<TodoSubtask[]>(initial?.subtasks ?? [])
  const [subtaskDraft, setSubtaskDraft] = useState('')
  const [recurring, setRecurring] = useState(!!initial?.recurrence)
  const [recurrenceType, setRecurrenceType] = useState<TodoRecurrenceType>(initial?.recurrence?.type ?? 'weekly')
  const [recurrenceInterval, setRecurrenceInterval] = useState(initial?.recurrence?.params.interval ?? 1)
  // Article B.2 — State 5: once set, this form shows the "Add to Calendar"
  // confirmation instead of closing immediately, so a checked
  // criticalReminder box is never a silent no-op the user has to remember
  // to come back and act on.
  const [savedTodo, setSavedTodo] = useState<Todo | null>(null)

  function addSubtask() {
    if (!subtaskDraft.trim()) return
    setSubtasks((prev) => [...prev, { id: newId(), title: subtaskDraft.trim(), done: false }])
    setSubtaskDraft('')
  }

  async function submit() {
    if (!title.trim()) return
    if (recurring && !dueDate) return // recurrence needs a due date as its anchor
    if (reminderEnabled && !scheduledTime) {
      setReminderNeedsTimeError(true)
      return
    }
    const data: NewTodoInput = {
      spaceId,
      title: title.trim(),
      description: description.trim() || undefined,
      photo,
      dueDate: dueDate || undefined,
      scheduledTime: scheduledTime || undefined,
      priorityLevelId: priorityLevelId || undefined,
      domainId: domainId || undefined,
      projectId: projectId || undefined,
      criticalReminder,
      reminderEnabled: reminderEnabled || undefined,
      reminderOffsetMinutes: reminderEnabled ? reminderOffsetMinutes : undefined,
      snoozeCount: initial?.snoozeCount,
      calendarExportedAt: initial?.calendarExportedAt,
      subtasks: subtasks.length ? subtasks : undefined,
      recurrence: recurring ? { type: recurrenceType, params: { interval: recurrenceInterval } } : undefined,
    }
    const saved = await onSave(data)
    if (criticalReminder) {
      setSavedTodo(saved)
    } else {
      onClose()
    }
  }

  if (savedTodo) {
    return (
      <Sheet
        title={t('todos.savedConfirmTitle')}
        onClose={onClose}
        footer={<Button className="w-full" onClick={onClose}>{t('common.close')}</Button>}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm">{savedTodo.title}</p>
          <AddToCalendarButton
            build={buildTodoIcs(savedTodo)}
            onExported={() => {
              // Direct update, not another onSave() round-trip — savedTodo
              // already has its real id at this point, and onSave's
              // create/update branching lives in the parent (TodosPage),
              // keyed off page-level state that a second call here
              // wouldn't see, risking a duplicate create instead of a patch.
              updateTodo(savedTodo.id, { calendarExportedAt: new Date().toISOString() })
            }}
          />
        </div>
      </Sheet>
    )
  }

  const footer = (
    <div className="flex gap-2 justify-between flex-wrap">
      {initial && (onArchive || onDelete || onMoveToSomeday) ? (
        <div className="flex gap-2 flex-wrap">
          {onMoveToSomeday && initial.status === 'open' && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onMoveToSomeday()
                onClose()
              }}
            >
              {t('todos.moveToSomeday')}
            </Button>
          )}
          {onArchive && (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (confirm(t('todos.archiveConfirm'))) onArchive()
              }}
            >
              {t('common.archive')}
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (confirm(t('todos.deleteConfirm'))) onDelete()
              }}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" form="todo-form">
          {t('common.save')}
        </Button>
      </div>
    </div>
  )

  return (
    <Sheet title={initial ? t('todos.editTodo') : t('todos.newTodo')} onClose={onClose} footer={footer}>
      <form
        id="todo-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label={t('todos.titleLabel')}>
          <Input
            autoFocus
            placeholder={t('todos.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>

        <Field label={t('todos.description')}>
          <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <PhotoAttachmentInput photo={photo} onChange={setPhoto} />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('todos.dueDate')}>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label={t('todos.scheduledTime')}>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => {
                setScheduledTime(e.target.value)
                if (e.target.value) setReminderNeedsTimeError(false)
              }}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => {
              setReminderEnabled(e.target.checked)
              if (e.target.checked && scheduledTime) setReminderNeedsTimeError(false)
            }}
          />
          {t('todos.addReminder')}
        </label>
        {reminderEnabled && (
          <div className="flex flex-col gap-2 pl-1 border-l-2 border-[var(--stoa-border)] ml-1">
            {reminderNeedsTimeError && <p className="text-xs text-[var(--stoa-danger)]">{t('todos.reminderNeedsTime')}</p>}
            <Field label={t('todos.reminderOffsetLabel')}>
              <Select value={reminderOffsetMinutes} onChange={(e) => setReminderOffsetMinutes(Number(e.target.value))}>
                {REMINDER_OFFSET_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.minutes}>
                    {t(`todos.reminderOffset_${opt.key}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-xs text-[var(--stoa-text-muted)]">{t('todos.reminderForegroundNote')}</p>
          </div>
        )}

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
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          {t('todos.recurring')}
        </label>
        {recurring && (
          <div className="flex flex-col gap-3 pl-1 border-l-2 border-[var(--stoa-border)] ml-1">
            {!dueDate && <p className="text-xs text-[var(--stoa-danger)]">{t('todos.recurrenceNeedsDueDate')}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('todos.recurrenceType')}>
                <Select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value as TodoRecurrenceType)}>
                  <option value="daily">{t('todos.recurrenceDaily')}</option>
                  <option value="weekly">{t('todos.recurrenceWeekly')}</option>
                  <option value="monthly">{t('todos.recurrenceMonthly')}</option>
                  <option value="custom">{t('todos.recurrenceCustom')}</option>
                </Select>
              </Field>
              <Field label={t('todos.recurrenceInterval')}>
                <Input
                  type="number"
                  min={1}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                />
              </Field>
            </div>
          </div>
        )}

        <Field label={t('todos.subtasks')}>
          <div className="flex flex-col gap-2">
            {subtasks.map((s) => (
              <div key={s.id} className="flex gap-2 items-center">
                <span className="flex-1 text-sm">{s.title}</span>
                <button
                  type="button"
                  className="text-xs text-[var(--stoa-danger)]"
                  onClick={() => setSubtasks((prev) => prev.filter((x) => x.id !== s.id))}
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder={t('todos.subtaskPlaceholder')}
                value={subtaskDraft}
                onChange={(e) => setSubtaskDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSubtask()
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addSubtask}>
                {t('common.add')}
              </Button>
            </div>
          </div>
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={criticalReminder}
            onChange={(e) => setCriticalReminder(e.target.checked)}
          />
          {t('todos.criticalReminder')}
        </label>

        {initial && initial.criticalReminder && (
          <AddToCalendarButton
            build={buildTodoIcs(initial)}
            onExported={() => updateTodo(initial.id, { calendarExportedAt: new Date().toISOString() })}
          />
        )}
      </form>
    </Sheet>
  )
}
