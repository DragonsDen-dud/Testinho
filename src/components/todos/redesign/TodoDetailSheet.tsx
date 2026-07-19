import { useTranslation } from 'react-i18next'
import { CalendarCheck } from 'lucide-react'
import { Sheet } from '../../ui/Sheet'
import { InfoChip } from '../../ui/InfoChip'
import { Button } from '../../ui/Button'
import { usePriorityLevels } from '../../../state/useTimeBlocks'
import { useProject } from '../../../state/useProjects'
import { useDomains } from '../../../state/useDomains'
import { todayKey } from '../../../lib/date'
import { todoMetadataPieces } from '../../../lib/todoMetadata'
import type { Todo } from '../../../db/types'

/**
 * Read-only summary reached by tapping a task's card in the list — the
 * full TodoForm is now reached only via the explicit "Edit" button below,
 * never by the card tap itself. Quick actions (checkbox, swipe-complete/
 * reschedule/delete) stay directly on the card, untouched — this is an
 * alternate "look, don't touch" path alongside them, not a replacement.
 */
export function TodoDetailSheet({ todo, onClose, onEdit }: { todo: Todo; onClose: () => void; onEdit: () => void }) {
  const { t, i18n } = useTranslation()
  const priorities = usePriorityLevels(todo.spaceId)
  const priority = priorities.find((p) => p.id === todo.priorityLevelId)
  const project = useProject(todo.projectId)
  const domains = useDomains(todo.spaceId)
  const domain = domains.find((d) => d.id === todo.domainId)
  const metadata = todoMetadataPieces(todo)

  const isOverdue = todo.status === 'open' && !!todo.dueDate && todo.dueDate < todayKey()
  const dueLabel = todo.dueDate
    ? `${new Date(todo.dueDate).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}${
        todo.scheduledTime ? ` · ${todo.scheduledTime}` : ''
      }`
    : t('todos.noDueDate')

  const doneSubtasks = todo.subtasks?.filter((s) => s.done).length ?? 0
  const totalSubtasks = todo.subtasks?.length ?? 0

  const reminderLabel = metadata.reminderAtDueTime
    ? t('todos.reminderTag')
    : metadata.reminderTime
      ? t('todos.reminderTagWithTime', { time: metadata.reminderTime })
      : undefined
  const snoozeLabel = metadata.snoozeCount > 0 ? t('todos.snoozedCount', { count: metadata.snoozeCount }) : undefined

  return (
    <Sheet
      title={todo.title}
      onClose={onClose}
      footer={
        <Button className="w-full" onClick={onEdit}>
          {t('common.edit')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className={`text-2xl font-semibold ${isOverdue ? '' : 'text-ink'}`} style={isOverdue ? { color: 'var(--color-accent-alert)' } : undefined}>
            {isOverdue ? `${t('todos.overdue')} · ${dueLabel}` : dueLabel}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {priority && <InfoChip>{priority.name}</InfoChip>}
          {project && !project.deletedAt && <InfoChip>{project.name}</InfoChip>}
          {!project && domain && (
            <InfoChip>
              {domain.icon} {domain.name}
            </InfoChip>
          )}
          {reminderLabel && <InfoChip>{reminderLabel}</InfoChip>}
          {snoozeLabel && <InfoChip>{snoozeLabel}</InfoChip>}
          {metadata.showCalendarTag && (
            <InfoChip>
              <CalendarCheck size={12} strokeWidth={1.75} aria-hidden /> {t('todos.calendarExportedTag')}
            </InfoChip>
          )}
        </div>

        {totalSubtasks > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-xs text-ink-muted">{t('todos.subtasksDoneCount', { done: doneSubtasks, total: totalSubtasks })}</div>
            <div className="flex flex-col gap-1">
              {todo.subtasks!.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: s.done ? 'var(--color-ink)' : 'transparent',
                      border: s.done ? 'none' : '1.5px solid var(--color-dot-ring)',
                    }}
                  />
                  <span className={`text-sm ${s.done ? 'text-ink-muted line-through' : 'text-ink'}`}>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
