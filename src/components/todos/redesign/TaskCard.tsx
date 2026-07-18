// Stage 1 of the Tasks-tab redesign (see conversation brief): a pure
// presentational card. It takes fully-formed display props, not live Todo/
// Dexie data — no swipe, no click handlers, no mutations. That wiring is
// Stage 2. Kept in redesign/ so it doesn't collide with the real TodoItem
// until this design is approved and TodoItem is migrated onto it.

import type { ReactNode } from 'react'
import { priorityFallbackColor } from '../../../styles/tokens'

export type TaskCardStatus = 'overdue' | 'upcoming' | 'someday' | 'done'

export interface TaskCardSubtask {
  title: string
  done: boolean
}

export interface TaskCardChip {
  label: string
  color?: string
}

export interface TaskCardProps {
  title: string
  status: TaskCardStatus
  dueLabel?: string
  hasRecurrence?: boolean
  priorityLabel?: string
  prioritySortOrder?: number
  projectChip?: TaskCardChip
  subtasks?: TaskCardSubtask[]
  subtasksExpanded?: boolean
  checked?: boolean
}

const STATUS_COLOR: Record<TaskCardStatus, string> = {
  overdue: 'var(--color-overdue)',
  upcoming: 'var(--color-upcoming)',
  someday: 'var(--color-someday)',
  done: 'var(--color-complete)',
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3 checkmark-spring" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ProgressRing({ fraction }: { fraction: number }) {
  const r = 8
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 -rotate-90 shrink-0">
      <circle cx="10" cy="10" r={r} fill="none" stroke="var(--stoa-border)" strokeWidth={2.5} />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="var(--color-complete)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - fraction)}
        style={{ transition: `stroke-dashoffset 320ms var(--spring-standard)` }}
      />
    </svg>
  )
}

function Chip({ children, dotColor }: { children: ReactNode; dotColor?: string }) {
  return (
    <span className="inline-flex items-center gap-1 shrink-0 rounded-chip px-2 py-1 text-task-meta text-[var(--stoa-text)]/60 bg-[var(--stoa-border)]/50">
      {dotColor && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />}
      {children}
    </span>
  )
}

export function TaskCard({
  title,
  status,
  dueLabel,
  hasRecurrence,
  priorityLabel,
  prioritySortOrder = 0,
  projectChip,
  subtasks,
  subtasksExpanded,
  checked,
}: TaskCardProps) {
  const priorityColor = priorityFallbackColor(prioritySortOrder)
  const doneCount = subtasks?.filter((s) => s.done).length ?? 0
  const totalCount = subtasks?.length ?? 0
  const hasSubtasks = totalCount > 0

  return (
    <div className="relative overflow-hidden rounded-card elevation-resting">
      <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: priorityColor }} />
      <div className="flex flex-col gap-2.5 pl-5 pr-4 py-3.5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
            style={{
              borderColor: checked ? 'var(--color-complete)' : 'var(--stoa-border)',
              background: checked ? 'var(--color-complete)' : 'transparent',
              color: 'var(--stoa-bg)',
            }}
          >
            {checked && <CheckIcon />}
          </span>

          <div className="flex-1 min-w-0">
            <div
              className="text-task-title text-[var(--stoa-text)] truncate"
              style={checked ? { textDecoration: 'line-through', opacity: 0.4 } : undefined}
            >
              {hasRecurrence && <span className="mr-1 text-[var(--stoa-text)]/60">↻</span>}
              {title}
            </div>

            <div className="chip-row flex items-center gap-1.5 mt-1.5 overflow-x-auto flex-nowrap">
              {dueLabel && (
                <span
                  className="shrink-0 text-task-meta"
                  style={{ color: status === 'overdue' ? 'var(--color-overdue)' : 'color-mix(in srgb, var(--stoa-text) 60%, transparent)' }}
                >
                  {status === 'overdue' ? `Overdue · ${dueLabel}` : dueLabel}
                </span>
              )}
              {priorityLabel && <Chip dotColor={priorityColor}>{priorityLabel}</Chip>}
              {hasSubtasks && <Chip>{doneCount}/{totalCount}</Chip>}
              {projectChip && <Chip dotColor={projectChip.color ?? 'var(--stoa-accent)'}>{projectChip.label}</Chip>}
            </div>
          </div>

          {hasSubtasks && (
            <span aria-hidden className="mt-1 shrink-0 text-[var(--stoa-text)]/40 text-xs">
              {subtasksExpanded ? '⌄' : '›'}
            </span>
          )}
        </div>

        {hasSubtasks && subtasksExpanded && (
          <div
            className="pl-9 flex flex-col gap-2 overflow-hidden"
            style={{ transition: `max-height 320ms var(--ease-gentle)` }}
          >
            <div className="flex items-center gap-2 text-task-meta text-[var(--stoa-text)]/60">
              <ProgressRing fraction={totalCount ? doneCount / totalCount : 0} />
              {doneCount} of {totalCount} done
            </div>
            {subtasks!.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor: s.done ? 'var(--color-complete)' : 'var(--stoa-border)',
                    background: s.done ? 'var(--color-complete)' : 'transparent',
                  }}
                >
                  {s.done && (
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="var(--stoa-bg)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span
                  className="text-task-meta text-[var(--stoa-text)]"
                  style={s.done ? { textDecoration: 'line-through', opacity: 0.4 } : { opacity: 0.85 }}
                >
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { STATUS_COLOR }
