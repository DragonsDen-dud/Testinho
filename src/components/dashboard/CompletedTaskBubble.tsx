import { useNavigate } from 'react-router-dom'
import { TaskCategoryBadge } from '../todos/redesign/TaskCategoryBadge'
import type { Todo } from '../../db/types'

/**
 * Today redesign round — Module 2's task tile, extending Habits 2.0 Part
 * B's home-screen-app-icon bubble language to completed tasks: the task's
 * own real TaskCategoryBadge at the same 'tray' size, name below. No
 * streak caption (tasks have no streak concept) and no undo corner
 * control (Habits 2.0 Part C's undo button was scoped to habits only;
 * not requested for tasks this round) — tapping the bubble still reaches
 * TodoDetailSheet, same as everywhere else a task is tapped.
 */
export function CompletedTaskBubble({ todo, justCompleted = false }: { todo: Todo; justCompleted?: boolean }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/todos/${todo.id}`)}
      className={`flex flex-col items-center gap-1 w-16 shrink-0 ${justCompleted ? 'habit-collapse-in' : ''}`}
    >
      <TaskCategoryBadge todo={todo} size="tray" />
      <span className="text-[11px] font-medium text-[var(--stoa-text-muted)] text-center truncate w-full">
        {todo.title}
      </span>
    </button>
  )
}
