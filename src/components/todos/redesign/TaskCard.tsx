// Stage 1 of the Tasks-tab redesign, v5 — Tesla tokens + SpaceX restraint
// + iOS passcode-dot motif (supersedes the v4 Mission Control version of
// this file entirely). Pure presentational: fully-formed display props,
// no live Todo/Dexie data, no swipe, no click handlers. Stage 2 wires it
// up to real state.

import type { ReactNode } from 'react'
import { priorityDotTone } from '../../../styles/tokens'

export type TaskCardStatus = 'overdue' | 'upcoming' | 'someday' | 'done'

export interface TaskCardSubtask {
  title: string
  done: boolean
}

export interface TaskCardProps {
  title: string
  status: TaskCardStatus
  dueLabel?: string
  hasRecurrence?: boolean
  prioritySortOrder?: number
  projectLabel?: string
  subtasks?: TaskCardSubtask[]
  subtasksExpanded?: boolean
  checked?: boolean
}

const TONE_COLOR: Record<'alert' | 'info', string> = {
  alert: 'var(--color-accent-alert)',
  info: 'var(--color-accent-info)',
}

// The single filled/unfilled dot, reused at three sizes: the main
// checkbox (24px), the subtask-row dots (8px), and the expanded subtask
// checkboxes (16px). Filled = solid ink, exactly like a passcode dot —
// no checkmark glyph, the fill itself is the completion signal.
function Dot({ filled, size, animate }: { filled: boolean; size: number; animate?: boolean }) {
  return (
    <span
      aria-hidden
      className={filled && animate ? 'dot-fill' : undefined}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: filled ? 'var(--color-ink)' : 'transparent',
        border: filled ? 'none' : `1.5px solid var(--color-hairline)`,
        boxSizing: 'border-box',
        transition: 'background 200ms var(--ease-dot-fill)',
      }}
    />
  )
}

function SubtaskDots({ subtasks }: { subtasks: TaskCardSubtask[] }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${subtasks.filter((s) => s.done).length} of ${subtasks.length} subtasks done`}>
      {subtasks.map((s, i) => (
        <Dot key={i} filled={s.done} size={7} />
      ))}
    </span>
  )
}

function PriorityDot({ sortOrder }: { sortOrder: number }) {
  const tone = priorityDotTone(sortOrder)
  if (tone === 'neutral') {
    return <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-hairline)' }} />
  }
  return <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: TONE_COLOR[tone] }} />
}

function Chip({ children, alert }: { children: ReactNode; alert?: boolean }) {
  return (
    <span
      className="text-task-meta rounded-pill px-2.5 py-1 shrink-0"
      style={{
        background: alert ? 'rgba(224, 30, 44, 0.1)' : 'var(--color-chip)',
        color: alert ? 'var(--color-accent-alert)' : 'var(--color-ink-muted)',
      }}
    >
      {children}
    </span>
  )
}

export function TaskCard({
  title,
  status,
  dueLabel,
  hasRecurrence,
  prioritySortOrder = 0,
  projectLabel,
  subtasks,
  subtasksExpanded,
  checked,
}: TaskCardProps) {
  const hasSubtasks = (subtasks?.length ?? 0) > 0
  const isOverdue = status === 'overdue'

  return (
    <div className="bg-surface rounded-card p-4 flex flex-col gap-2.5 card-shadow">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={checked}
          aria-label={checked ? 'Mark not done' : 'Mark done'}
          className="mt-0.5 shrink-0"
        >
          <Dot filled={!!checked} size={24} animate />
        </button>

        <div className="flex-1 min-w-0">
          <div
            className="text-task-title text-ink truncate"
            style={checked ? { textDecoration: 'line-through', opacity: 0.4 } : undefined}
          >
            {hasRecurrence && <span className="mr-1 text-ink-muted">↻</span>}
            {title}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {dueLabel && <Chip alert={isOverdue}>{isOverdue ? `Overdue · ${dueLabel}` : dueLabel}</Chip>}
            {hasSubtasks && <SubtaskDots subtasks={subtasks!} />}
            {projectLabel && <Chip>{projectLabel}</Chip>}
          </div>
        </div>

        {hasSubtasks && (
          <span aria-hidden className="mt-1 text-ink-muted text-xs shrink-0">
            {subtasksExpanded ? '⌄' : '›'}
          </span>
        )}
        <PriorityDot sortOrder={prioritySortOrder} />
      </div>

      {hasSubtasks && subtasksExpanded && (
        <div className="pl-9 flex flex-col gap-2 pt-1">
          {subtasks!.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Dot filled={s.done} size={16} />
              <span
                className="text-task-meta text-ink"
                style={s.done ? { textDecoration: 'line-through', opacity: 0.4 } : { opacity: 0.85 }}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
