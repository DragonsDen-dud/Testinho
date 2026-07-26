// Wires the presentational TaskCard (+ SwipeableCard) to real Todo data
// and mutations. This is the replacement for TodoItem.tsx in the
// redesigned Tasks tab; TaskCard itself stays presentational-only.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Todo } from '../../../db/types'
import { TaskCard, type TaskCardStatus, type TaskCardPriorityTier } from './TaskCard'
import { TaskCategoryBadge } from './TaskCategoryBadge'
import { SwipeableCard } from './SwipeableCard'
import { usePriorityLevels } from '../../../state/useTimeBlocks'
import { useProject } from '../../../state/useProjects'
import { useDomains } from '../../../state/useDomains'
import { useCategoryStyleMap } from '../../../state/useCategoryStyles'
import { resolveTaskCategoryStyle } from '../../../lib/taskCategoryStyle'
import { computeDueDateInfo } from '../../../lib/dueDateChip'
import { priorityDotTone } from '../../../styles/tokens'
import { markTodoDone, reopenTodo, rescheduleTodo, deleteTodo, restoreTodo, toggleSubtask } from '../../../data/todos'
import { showUndoToast } from '../../../state/toast'
import { todayKey } from '../../../lib/date'
import { todoReminderTriggerDateKey } from '../../../lib/reminderTiming'
import { RescheduleMenu } from '../RescheduleMenu'
import { ActiveReminderRow } from '../../reminders/ActiveReminderRow'

// priorityDotTone's 3-tier split (Part 1, tokens.ts) is reused for WHICH
// icon variant to show — never its associated color (TONE_COLOR stays
// unused/removed here entirely; see Part 3 brief's repeated "never color
// for priority" rule).
const TIER_BY_TONE: Record<ReturnType<typeof priorityDotTone>, TaskCardPriorityTier> = {
  alert: 'high',
  info: 'medium',
  neutral: 'none',
}

export function ConnectedTaskCard({
  todo,
  onOpen,
  onChecked,
}: {
  todo: Todo
  onOpen: () => void
  /**
   * Today-redesign round — fired synchronously, before markTodoDone, only
   * from an explicit "not done -> done" click. Mirrors the exact contract
   * the pre-redesign TodoItem.tsx already used for this same purpose (see
   * its own comment): lets a parent that renders a "done today" tray
   * (Dashboard) know a completion just happened, without inferring it from
   * a live-query re-render. Never fired for a reopen. Optional and unused
   * by TodosPage's own rendering, which never passes it.
   */
  onChecked?: (todo: Todo) => void
}) {
  const { t, i18n } = useTranslation()
  const priorities = usePriorityLevels(todo.spaceId)
  const priority = priorities.find((p) => p.id === todo.priorityLevelId)
  const project = useProject(todo.projectId)
  const domains = useDomains(todo.spaceId)
  const domain = domains.find((d) => d.id === todo.domainId)
  const styleMap = useCategoryStyleMap()
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

  // A task with priorityLevelId unset (priority is optional on creation —
  // only SomedayPromoteForm actually requires choosing one) must map to
  // 'none', not fall through priorityDotTone's own `sortOrder ?? 0`
  // default, which resolves to its "alert"/highest tier. That default
  // existed for a plain colored dot where it barely read as a signal;
  // surfaced here as a bold flag + bold title, it would visibly claim
  // "high priority" for a task that was never given one at all — a real,
  // pre-existing computation gap this round's icon treatment makes
  // impossible not to notice, fixed here rather than carried forward.
  const priorityTier: TaskCardPriorityTier = priority ? TIER_BY_TONE[priorityDotTone(priority.sortOrder)] : 'none'
  const hasSubtasks = (todo.subtasks?.length ?? 0) > 0
  const dueInfo = todo.dueDate ? computeDueDateInfo(todo.dueDate, todo.scheduledTime, i18n.language, t) : undefined

  // Subtitle priority: overdue/due info > project name — but only when
  // that due info isn't ALREADY shown in the trailing slot. Subtasks
  // claim the trailing slot for their ratio (section 2 ranks them above
  // a due chip), so a task with subtasks shows due info as plain
  // subtitle text instead; a task without subtasks already shows its due
  // info via the DueDateChip, so the subtitle falls through to the
  // project/domain name instead of repeating it. "Subtask count" never
  // separately reaches the subtitle — whenever subtasks exist, the
  // trailing ratio already shows it.
  const projectLabel = project?.name ?? domain?.name
  const subtitle = hasSubtasks ? (dueInfo?.label ?? projectLabel) : projectLabel

  const categoryStyle = resolveTaskCategoryStyle(project, domain, styleMap)

  async function handleToggleChecked() {
    if (isDone) {
      await reopenTodo(todo.id)
    } else {
      onChecked?.(todo)
      await markTodoDone(todo.id)
    }
  }

  async function handleDelete() {
    await deleteTodo(todo.id)
    showUndoToast(t('common.deletedToast'), () => restoreTodo(todo.id))
  }

  // ActiveReminderRow's lookup key is the reminder's own trigger day, which
  // an offset can push earlier than dueDate itself — never the raw
  // dueDate, or a "1 day before" reminder that already fired wouldn't be
  // found (see the parallel note in TodoItem.tsx).
  const reminderStateDate =
    todo.reminderEnabled && todo.dueDate && todo.scheduledTime
      ? todoReminderTriggerDateKey(todo.dueDate, todo.scheduledTime, todo.reminderOffsetMinutes ?? 0)
      : todo.dueDate

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
          badge={<TaskCategoryBadge todo={todo} />}
          priorityTier={priorityTier}
          priorityLabel={priority?.name}
          hasRecurrence={!!todo.recurrence}
          recurrenceLabel={t('todos.recurring')}
          somedayLabel={t('todos.statusSomeday')}
          subtitle={subtitle}
          subtasks={todo.subtasks}
          subtasksExpanded={expanded}
          dueInfo={hasSubtasks ? undefined : dueInfo}
          checked={isDone}
          checkColor={categoryStyle.color}
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

      {reminderStateDate && todo.status === 'open' && (
        <ActiveReminderRow entityType="todo" entityId={todo.id} date={reminderStateDate} />
      )}
    </div>
  )
}
