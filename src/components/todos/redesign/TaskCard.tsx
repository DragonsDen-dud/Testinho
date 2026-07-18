// Stage 1 of the Tasks-tab redesign, v4 "Mission Control" direction (see
// conversation brief — supersedes the earlier Liquid Glass version of this
// file entirely). Pure presentational: fully-formed display props, no
// live Todo/Dexie data, no swipe, no click handlers. Stage 2 wires it up.

import { priorityStatusColor, STATUS_LED_COLOR_VAR } from '../../../styles/tokens'

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
  priorityLabel?: string
  prioritySortOrder?: number
  projectLabel?: string
  subtasks?: TaskCardSubtask[]
  subtasksExpanded?: boolean
  checked?: boolean
}

function StatusDot({ sortOrder }: { sortOrder: number }) {
  const led = priorityStatusColor(sortOrder)
  const color = STATUS_LED_COLOR_VAR[led]
  return (
    <span
      aria-hidden
      className="w-2 h-2 rounded-full shrink-0"
      style={{ background: color, boxShadow: `0 0 4px ${color}` }}
    />
  )
}

function Field({ label, value, mono, alert }: { label: string; value: string; mono?: boolean; alert?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-mc-label uppercase text-white/40 shrink-0" style={alert ? { color: 'var(--color-status-critical)' } : undefined}>
        {label}
      </span>
      <span
        className="text-mc-value text-white/85 truncate"
        style={{
          fontFamily: mono ? 'var(--font-mc-mono)' : undefined,
          color: alert ? 'var(--color-status-critical)' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}

function SegmentedBar({ fraction, segments = 8 }: { fraction: number; segments?: number }) {
  const filled = Math.round(fraction * segments)
  return (
    <div className="flex items-center gap-[2px]" aria-hidden>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className="h-1 flex-1 rounded-[1px]"
          style={{
            background: i < filled ? 'rgba(255,255,255,0.7)' : 'var(--color-hairline)',
            transition: `background 200ms var(--mc-ease-snap)`,
          }}
        />
      ))}
    </div>
  )
}

function Checkbox({ checked, size }: { checked?: boolean; size: number }) {
  return (
    <span
      aria-hidden
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        border: `1.5px solid ${checked ? 'var(--color-status-go)' : 'var(--color-hairline)'}`,
        background: checked ? 'var(--color-status-go)' : 'transparent',
      }}
    >
      {checked && (
        <svg
          viewBox="0 0 24 24"
          className="mc-check-in"
          style={{ width: size * 0.6, height: size * 0.6 }}
          fill="none"
          stroke="#000"
          strokeWidth={4}
          strokeLinecap="square"
          strokeLinejoin="miter"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
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
  projectLabel,
  subtasks,
  subtasksExpanded,
  checked,
}: TaskCardProps) {
  const doneCount = subtasks?.filter((s) => s.done).length ?? 0
  const totalCount = subtasks?.length ?? 0
  const hasSubtasks = totalCount > 0
  const hasSecondaryRow = !!projectLabel || hasSubtasks
  const isOverdue = status === 'overdue'

  return (
    <div
      className="bg-panel rounded-panel px-4 py-3 flex flex-col gap-2"
      style={{
        border: '1px solid var(--color-hairline)',
        borderTopColor: isOverdue ? 'var(--color-status-critical)' : undefined,
        borderTopWidth: isOverdue ? '2px' : undefined,
      }}
    >
      <div className="flex items-center gap-2.5">
        <Checkbox checked={checked} size={18} />
        <span
          className="flex-1 text-mc-title text-white truncate"
          style={checked ? { textDecoration: 'line-through', opacity: 0.4 } : undefined}
        >
          {hasRecurrence && <span className="mr-1 text-white/40">↻</span>}
          {title}
        </span>
        {hasSubtasks && (
          <span aria-hidden className="text-white/35 text-xs shrink-0">
            {subtasksExpanded ? '⌄' : '›'}
          </span>
        )}
        <StatusDot sortOrder={prioritySortOrder} />
      </div>

      {(dueLabel || priorityLabel) && (
        <div className="flex items-center gap-4 pl-[26px]">
          {dueLabel && <Field label={isOverdue ? 'OVERDUE' : 'DUE'} value={dueLabel} mono alert={isOverdue} />}
          {priorityLabel && <Field label="PRIORITY" value={priorityLabel.toUpperCase()} />}
        </div>
      )}

      {hasSecondaryRow && (
        <>
          <div style={{ borderTop: '1px solid var(--color-hairline)' }} className="ml-[26px]" />
          <div className="flex items-center gap-4 pl-[26px]">
            {projectLabel && <Field label="PROJECT" value={projectLabel.toUpperCase()} />}
            {hasSubtasks && <Field label="SUBTASKS" value={`${String(doneCount).padStart(2, '0')}/${String(totalCount).padStart(2, '0')}`} mono />}
          </div>
        </>
      )}

      {hasSubtasks && subtasksExpanded && (
        <div className="pl-[26px] flex flex-col gap-2 pt-1">
          <SegmentedBar fraction={totalCount ? doneCount / totalCount : 0} />
          <div className="flex flex-col gap-1.5">
            {subtasks!.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox checked={s.done} size={14} />
                <span
                  className="text-mc-value text-white/80"
                  style={s.done ? { textDecoration: 'line-through', opacity: 0.4 } : undefined}
                >
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
