import { useTranslation } from 'react-i18next'
import type { Todo } from '../../db/types'
import { markTodoDone, reopenTodo, rescheduleTodo } from '../../data/todos'
import { todayKey } from '../../lib/date'
import { usePriorityLevels } from '../../state/useTimeBlocks'
import { useProject } from '../../state/useProjects'
import { RescheduleMenu } from './RescheduleMenu'
import { ActiveReminderRow } from '../reminders/ActiveReminderRow'

export function TodoItem({ todo, onOpen }: { todo: Todo; onOpen: () => void }) {
  const { t, i18n } = useTranslation()
  const priorities = usePriorityLevels(todo.spaceId)
  const priority = priorities.find((p) => p.id === todo.priorityLevelId)
  const project = useProject(todo.projectId)
  const isOverdue = !!todo.dueDate && todo.dueDate < todayKey() && todo.status === 'open'
  const doneSubtasks = todo.subtasks?.filter((s) => s.done).length ?? 0

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3">
      <div className="flex items-start gap-3">
        <button
          aria-label={todo.status === 'done' ? t('todos.reopen') : t('todos.markDone')}
          onClick={() => (todo.status === 'done' ? reopenTodo(todo.id) : markTodoDone(todo.id))}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            todo.status === 'done' ? 'bg-[var(--stoa-accent)] border-[var(--stoa-accent)]' : 'border-[var(--stoa-border)]'
          }`}
        >
          {todo.status === 'done' && <span className="text-[var(--stoa-bg)] text-xs">✓</span>}
        </button>
        <button className="flex-1 text-left" onClick={onOpen}>
          <div className={`text-sm font-medium ${todo.status === 'done' ? 'line-through text-[var(--stoa-text-muted)]' : ''}`}>
            {todo.recurrence && <span className="mr-1 text-[var(--stoa-text-muted)]">↻</span>}
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
            {priority && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--stoa-border)]/50 text-[var(--stoa-text-muted)]">
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
      {todo.dueDate && todo.status === 'open' && (
        <div className="pl-8">
          <ActiveReminderRow entityType="todo" entityId={todo.id} date={todo.dueDate} />
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
