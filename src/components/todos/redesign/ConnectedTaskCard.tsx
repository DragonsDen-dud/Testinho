// Stage 2 — wires the presentational TaskCard (+ SwipeableCard) to real
// Todo data and mutations. This is the replacement for TodoItem.tsx in the
// redesigned Tasks tab; TaskCard itself stays presentational-only.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Todo } from '../../../db/types'
import { TaskCard, type TaskCardStatus } from './TaskCard'
import { SwipeableCard } from './SwipeableCard'
import { usePriorityLevels } from '../../../state/useTimeBlocks'
import { useProject } from '../../../state/useProjects'
import { useDomains } from '../../../state/useDomains'
import { markTodoDone, reopenTodo, rescheduleTodo, deleteTodo, restoreTodo, toggleSubtask } from '../../../data/todos'
import { showUndoToast } from '../../../state/toast'
import { todayKey } from '../../../lib/date'
import { RescheduleMenu } from '../RescheduleMenu'
import { ActiveReminderRow } from '../../reminders/ActiveReminderRow'

export function ConnectedTaskCard({ todo, onOpen }: { todo: Todo; onOpen: () => void }) {
  const { t, i18n } = useTranslation()
  const priorities = usePriorityLevels(todo.spaceId)
  const priority = priorities.find((p) => p.id === todo.priorityLevelId)
  const project = useProject(todo.projectId)
  const domains = useDomains(todo.spaceId)
  const domain = domains.find((d) => d.id === todo.domainId)
  const [expanded, setExpanded] = useState(false)
  const [reschedulingOpen, setReschedulingOpen] = useState(false)

  const isDone = todo.status === 'done'
  const status: TaskCardStatus =
    todo.status === 'done'
      ? 'done'
      : todo.status === 'someday'
        ? 'someday'
        : todo.dueDate && todo.dueDate < todayKey()
          ? 'overdue'
          : 'upcoming'

  const dueLabel = todo.dueDate
    ? `${new Date(todo.dueDate).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}${
        todo.scheduledTime ? ` · ${todo.scheduledTime}` : ''
      }`
    : undefined

  // Project.color wins over LifeDomain.color if the task has both set —
  // falls through to the domain's color if the project didn't set its own,
  // rather than treating "project present, no color" as "show neutral".
  const categoryColor = project?.color ?? domain?.color
  const projectLabel = project?.name ?? domain?.name

  async function handleToggleChecked() {
    if (isDone) await reopenTodo(todo.id)
    else await markTodoDone(todo.id)
  }

  async function handleDelete() {
    await deleteTodo(todo.id)
    showUndoToast(t('common.deletedToast'), () => restoreTodo(todo.id))
  }

  return (
    <div className="flex flex-col gap-2">
      <SwipeableCard
        disabled={reschedulingOpen}
        completeLabel={isDone ? t('todos.reopen') : t('todos.markDone')}
        onComplete={handleToggleChecked}
        onReschedule={() => setReschedulingOpen(true)}
        onDelete={handleDelete}
      >
        <TaskCard
          title={todo.title}
          status={status}
          dueLabel={dueLabel}
          hasRecurrence={!!todo.recurrence}
          prioritySortOrder={priority?.sortOrder ?? 0}
          projectLabel={projectLabel}
          categoryColor={categoryColor}
          subtasks={todo.subtasks}
          subtasksExpanded={expanded}
          checked={isDone}
          onOpen={onOpen}
          onToggleChecked={handleToggleChecked}
          onToggleExpanded={() => setExpanded((v) => !v)}
          onToggleSubtask={(subtaskId) => toggleSubtask(todo, subtaskId)}
        />
      </SwipeableCard>

      {reschedulingOpen && (
        <div className="px-1">
          <RescheduleMenu
            startOpen
            onCancel={() => setReschedulingOpen(false)}
            onReschedule={(newDueDate) => {
              rescheduleTodo(todo.id, newDueDate)
              setReschedulingOpen(false)
            }}
          />
        </div>
      )}

      {todo.dueDate && todo.status === 'open' && <ActiveReminderRow entityType="todo" entityId={todo.id} date={todo.dueDate} />}
    </div>
  )
}
