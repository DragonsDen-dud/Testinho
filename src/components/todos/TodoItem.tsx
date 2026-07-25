import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, Repeat } from 'lucide-react'
import type { Todo } from '../../db/types'
import { markTodoDone, reopenTodo, rescheduleTodo } from '../../data/todos'
import { todayKey } from '../../lib/date'
import { todoReminderTriggerDateKey } from '../../lib/reminderTiming'
import { todoMetadataPieces } from '../../lib/todoMetadata'
import { usePriorityLevels } from '../../state/useTimeBlocks'
import { useProject } from '../../state/useProjects'
import { priorityDotTone } from '../../styles/tokens'
import { RescheduleMenu } from './RescheduleMenu'
import { ActiveReminderRow } from '../reminders/ActiveReminderRow'

/**
 * Today-screen-only vibrant treatment (Articles 3/6/19 round). `false`
 * everywhere else, which keeps Habits/Tasks-tab rendering exactly as it
 * was before this round.
 */
export function TodoItem({
  todo,
  onOpen,
  vibrant = false,
  onChecked,
}: {
  todo: Todo
  onOpen: () => void
  vibrant?: boolean
  /**
   * Fired synchronously, before markTodoDone, only from the checkbox's own
   * explicit click — lets a vibrant-mode parent (Today) keep rendering this
   * row for a moment after it drops out of the "open" list, so the
   * completion animation actually gets a chance to play instead of racing
   * an unmount that otherwise wins by the very next frame.
   */
  onChecked?: (todo: Todo) => void
}) {
  const { t, i18n } = useTranslation()
  const priorities = usePriorityLevels(todo.spaceId)
  const priority = priorities.find((p) => p.id === todo.priorityLevelId)
  const priorityTone = priority ? priorityDotTone(priority.sortOrder) : 'neutral'
  const project = useProject(todo.projectId)
  const isOverdue = !!todo.dueDate && todo.dueDate < todayKey() && todo.status === 'open'
  const doneSubtasks = todo.subtasks?.filter((s) => s.done).length ?? 0
  // Local, click-driven only (never derived from todo.status) so the
  // completion animation never replays for a todo already done before
  // this page load — same gating discipline as HabitCard's justPopped.
  const [justChecked, setJustChecked] = useState(false)

  // Article B.3 — [Due] · [Reminder offset] · [Snooze count] · [Calendar tag]
  const metadata = todoMetadataPieces(todo)
  const reminderLabel = metadata.reminderAtDueTime
    ? t('todos.reminderTag')
    : metadata.reminderTime
      ? t('todos.reminderTagWithTime', { time: metadata.reminderTime })
      : undefined
  const snoozeLabel = metadata.snoozeCount > 0 ? t('todos.snoozedCount', { count: metadata.snoozeCount }) : undefined
  const reminderStateDate =
    todo.reminderEnabled && todo.dueDate && todo.scheduledTime
      ? todoReminderTriggerDateKey(todo.dueDate, todo.scheduledTime, todo.reminderOffsetMinutes ?? 0)
      : todo.dueDate

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3">
      <div className="flex items-start gap-3">
        <button
          aria-label={todo.status === 'done' ? t('todos.reopen') : t('todos.markDone')}
          onClick={() => {
            if (todo.status === 'done') {
              reopenTodo(todo.id)
            } else {
              setJustChecked(true)
              onChecked?.(todo)
              markTodoDone(todo.id)
            }
          }}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            todo.status === 'done'
              ? vibrant
                ? 'bg-[var(--stoa-success)] border-[var(--stoa-success)]'
                : 'bg-[var(--stoa-accent)] border-[var(--stoa-accent)]'
              : 'border-[var(--stoa-border)]'
          } ${vibrant && justChecked ? 'stoa-check-pop' : ''}`}
        >
          {todo.status === 'done' && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke={vibrant ? 'white' : 'var(--stoa-bg)'}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={vibrant && justChecked ? 'stoa-checkmark-draw' : undefined}
              />
            </svg>
          )}
        </button>
        <button className="flex-1 text-left" onClick={onOpen}>
          <div className={`text-sm font-medium ${todo.status === 'done' ? 'line-through text-[var(--stoa-text-muted)]' : ''}`}>
            {todo.recurrence && (
              <span className="mr-1 text-[var(--stoa-text-muted)] inline-flex align-text-bottom">
                <Repeat size={12} strokeWidth={1.75} />
              </span>
            )}
            {todo.title}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap items-center">
            {todo.dueDate && (
              <span className={`text-xs ${isOverdue ? 'text-[var(--stoa-danger)]' : 'text-[var(--stoa-text-muted)]'}`}>
                {isOverdue ? t('todos.overdue') + ': ' : ''}
                {new Date(todo.dueDate).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                {todo.scheduledTime ? ` · ${todo.scheduledTime}` : ''}
              </span>
            )}
            {reminderLabel && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--stoa-border)]/50 text-[var(--stoa-text-muted)]">
                {reminderLabel}
              </span>
            )}
            {snoozeLabel && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--stoa-border)]/50 text-[var(--stoa-text-muted)]">
                {snoozeLabel}
              </span>
            )}
            {metadata.showCalendarTag && (
              <span aria-label={t('todos.calendarExportedTag')} className="text-[var(--stoa-text-muted)]">
                <CalendarCheck size={12} strokeWidth={1.75} />
              </span>
            )}
            {priority && (
              <span
                className={
                  vibrant && priorityTone !== 'neutral'
                    ? 'text-xs px-1.5 py-0.5 rounded'
                    : 'text-xs px-1.5 py-0.5 rounded bg-[var(--stoa-border)]/50 text-[var(--stoa-text-muted)]'
                }
                style={
                  vibrant && priorityTone === 'alert'
                    ? { background: 'var(--stoa-danger-tint)', color: 'var(--stoa-danger)' }
                    : vibrant && priorityTone === 'info'
                      ? { background: 'var(--stoa-primary-tint)', color: 'var(--stoa-primary-text)' }
                      : undefined
                }
              >
                {priority.name}
              </span>
            )}
            {todo.subtasks && todo.subtasks.length > 0 && (
              <span className="text-xs text-[var(--stoa-text-muted)]">
                {doneSubtasks}/{todo.subtasks.length}
              </span>
            )}
            {todo.projectId && project && !project.deletedAt && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--stoa-border)]/50 text-[var(--stoa-text-muted)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: project.color ?? 'var(--stoa-accent)' }} />
                {project.name}
              </span>
            )}
            {todo.projectId && project?.deletedAt && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-dashed border-[var(--stoa-text-muted)] text-[var(--stoa-text-muted)] italic">
                {t('projects.deletedBadge')}
              </span>
            )}
          </div>
        </button>
      </div>
      {reminderStateDate && todo.status === 'open' && (
        <div className="pl-8">
          <ActiveReminderRow entityType="todo" entityId={todo.id} date={reminderStateDate} />
        </div>
      )}
      {isOverdue && (
        <div className="pl-8">
          <RescheduleMenu onReschedule={(newDueDate) => rescheduleTodo(todo.id, newDueDate)} />
        </div>
      )}
    </div>
  )
}
