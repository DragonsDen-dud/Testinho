// Tasks-tab redesign, v5 — Tesla tokens + SpaceX restraint + iOS
// passcode-dot motif + per-instance category color/status border (all
// approved). Stage 2: every handler below is optional so the Stage 1
// static preview (which passes none) keeps rendering exactly as approved
// — real wiring happens in ConnectedTaskCard, this file stays the single
// source of visual truth for both.

import type { CSSProperties, ReactNode } from 'react'
import { accessibleRingColor, accessibleTextColor, priorityDotTone } from '../../../styles/tokens'

export type TaskCardStatus = 'overdue' | 'upcoming' | 'someday' | 'done'

export interface TaskCardSubtask {
  id: string
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
  /** Resolved LifeDomain.color or Project.color (project wins if a task has
   * both) — caller's responsibility, TaskCard stays presentational and
   * doesn't fetch either record itself. Undefined = neutral theme fallback. */
  categoryColor?: string
  /** Tapping the title/body area — opens the edit sheet. */
  onOpen?: () => void
  /** Tapping the main checkbox dot. */
  onToggleChecked?: () => void
  /** Tapping the chevron — expand/collapse the subtask list. */
  onToggleExpanded?: () => void
  /** Tapping one subtask's dot in the expanded list. */
  onToggleSubtask?: (subtaskId: string) => void
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
        border: filled ? 'none' : `1.5px solid var(--color-dot-ring)`,
        boxSizing: 'border-box',
        transition: 'background 200ms var(--ease-dot-fill)',
      }}
    />
  )
}

function SubtaskDots({ subtasks }: { subtasks: TaskCardSubtask[] }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${subtasks.filter((s) => s.done).length} of ${subtasks.length} subtasks done`}>
      {subtasks.map((s) => (
        <Dot key={s.id} filled={s.done} size={7} />
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
  categoryColor,
  onOpen,
  onToggleChecked,
  onToggleExpanded,
  onToggleSubtask,
}: TaskCardProps) {
  const hasSubtasks = (subtasks?.length ?? 0) > 0
  const isOverdue = status === 'overdue'

  // Category color drives the card background directly (arbitrary user
  // hex, not a theme token). --color-ink/--color-dot-ring are overridden
  // locally so title text, the checkbox/subtask dot fill, and the hollow
  // ring all stay legible against it — computed per instance, never
  // assumed light. --color-status-border and --color-accent-* (the
  // priority dot) are NOT touched here: status stays a separate signal
  // from the section wrapper, and the priority dot stays fully independent
  // of category color per this round's explicit instruction.
  const categoryStyle: CSSProperties = categoryColor
    ? ({
        backgroundColor: categoryColor,
        '--color-ink': accessibleTextColor(categoryColor),
        '--color-dot-ring': accessibleRingColor(categoryColor),
      } as CSSProperties)
    : {}

  return (
    <div
      className="bg-surface rounded-card p-4 flex flex-col gap-2.5 card-shadow"
      style={{ border: '2px solid var(--color-status-border)', ...categoryStyle }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={checked}
          aria-label={checked ? 'Mark not done' : 'Mark done'}
          className="mt-0.5 shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onToggleChecked?.()
          }}
        >
          <Dot filled={!!checked} size={24} animate />
        </button>

        <button type="button" className="flex-1 min-w-0 text-left" onClick={onOpen}>
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
        </button>

        {hasSubtasks && (
          <button
            type="button"
            aria-label={subtasksExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            className="-m-2 p-2 text-ink-muted text-xs shrink-0 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpanded?.()
            }}
          >
            {subtasksExpanded ? '⌄' : '›'}
          </button>
        )}
        <PriorityDot sortOrder={prioritySortOrder} />
      </div>

      {hasSubtasks && subtasksExpanded && (
        <div className="pl-9 flex flex-col gap-2 pt-1">
          {subtasks!.map((s) => (
            <button
              key={s.id}
              type="button"
              className="flex items-center gap-2.5 text-left"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSubtask?.(s.id)
              }}
            >
              <Dot filled={s.done} size={16} animate />
              <span
                className="text-task-meta text-ink"
                style={s.done ? { textDecoration: 'line-through', opacity: 0.4 } : { opacity: 0.85 }}
              >
                {s.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
