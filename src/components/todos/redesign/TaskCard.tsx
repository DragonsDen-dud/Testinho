// Tasks-tab redesign, Part 3 of the design system rollout — Tesla tokens
// + CoinKeeper/Structured badge-based identity, replacing the prior
// Stage 1/2 full-card category-color-background treatment. Every handler
// below is optional so a static preview (passing none) still renders —
// real wiring happens in ConnectedTaskCard, this file stays the single
// source of visual truth for both.

import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight, Repeat, Bookmark, Flag } from 'lucide-react'
import { HeroValue } from '../../ui/HeroValue'
import { MinimalListRow } from '../../ui/MinimalListRow'
import { DueDateChip } from '../../ui/DueDateChip'
import type { DueDateInfo } from '../../../lib/dueDateChip'

export type TaskCardStatus = 'overdue' | 'upcoming' | 'someday' | 'done'
export type TaskCardPriorityTier = 'high' | 'medium' | 'none'

export interface TaskCardSubtask {
  id: string
  title: string
  done: boolean
}

export interface TaskCardProps {
  title: string
  status: TaskCardStatus
  /** Pre-resolved badge (TaskCategoryBadge) — TaskCard stays agnostic of
   * Project/LifeDomain data resolution, same separation HabitCard/
   * HabitCategoryBadge established in Part 2. */
  badge: ReactNode
  priorityTier: TaskCardPriorityTier
  /** The priority level's own name (e.g. "High"), used only as the
   * priority icon's aria-label — never rendered as color. */
  priorityLabel?: string
  hasRecurrence?: boolean
  /** Pre-translated aria-labels for the recurrence/someday icons — TaskCard
   * has no i18n hookup of its own (matching the pre-Part-3 convention of
   * every other label here being computed by ConnectedTaskCard). */
  recurrenceLabel?: string
  somedayLabel?: string
  /** One pre-resolved subtitle line (priority: overdue/due info not
   * already shown in the trailing slot > project name) — see
   * ConnectedTaskCard for the precedence logic. */
  subtitle?: string
  subtasks?: TaskCardSubtask[]
  subtasksExpanded?: boolean
  /** Only meaningful when subtasks is empty — when subtasks exist, the
   * trailing slot always shows the subtask ratio (section 2's own
   * decision tree ranks subtasks above a due chip), and due info moves
   * into `subtitle` as plain text instead. */
  dueInfo?: DueDateInfo
  checked?: boolean
  /** Resolved category color (whatever the badge itself is using) — the
   * optional CoinKeeper-esque touch of tinting the checkbox with it once
   * checked, per section 6. Falls back to plain ink if omitted. */
  checkColor?: string
  onOpen?: () => void
  onToggleChecked?: () => void
  onToggleExpanded?: () => void
  onToggleSubtask?: (subtaskId: string) => void
}

// Reused at three sizes: the main checkbox (24px), the subtask-row dots
// (8px), and the expanded subtask checkboxes (16px). Filled = solid —
// no checkmark glyph, the fill itself is the completion signal, same as
// before this round; only the filled color source changed (see
// `checkColor` above).
function Dot({ filled, size, color }: { filled: boolean; size: number; color?: string }) {
  return (
    <span
      aria-hidden
      className={filled ? 'dot-fill' : undefined}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: filled ? (color ?? 'var(--color-ink)') : 'transparent',
        border: filled ? 'none' : '1.5px solid var(--color-dot-ring)',
        boxSizing: 'border-box',
        transition: 'background 200ms var(--ease-dot-fill)',
      }}
    />
  )
}

export function TaskCard({
  title,
  status,
  badge,
  priorityTier,
  priorityLabel,
  hasRecurrence,
  recurrenceLabel,
  somedayLabel,
  subtitle,
  subtasks,
  subtasksExpanded,
  dueInfo,
  checked,
  checkColor,
  onOpen,
  onToggleChecked,
  onToggleExpanded,
  onToggleSubtask,
}: TaskCardProps) {
  const hasSubtasks = (subtasks?.length ?? 0) > 0
  const doneCount = subtasks?.filter((s) => s.done).length ?? 0
  const isSomeday = status === 'someday'
  // Someday and completed share Habits' paused-row treatment exactly: one
  // uniform opacity across badge+text+trailing, not styled independently.
  const dimmed = isSomeday || checked

  // A nested flex child breaks the outer truncate span's text-overflow
  // (ellipsis only applies to a box's own inline content, not a nested
  // flex container's descendant text) — so truncation has to happen on
  // this inner text span itself, which needs its own min-w-0 to be
  // allowed to shrink below its content's natural width inside the flex
  // row around it. The icons stay natural-width/shrink-0 siblings.
  const titleWithIcons = (
    <span className="flex items-center gap-1 min-w-0 w-full">
      {hasRecurrence && <Repeat size={12} strokeWidth={2.25} className="text-ink-muted shrink-0" aria-label={recurrenceLabel} />}
      {isSomeday && <Bookmark size={12} strokeWidth={2.25} className="text-ink-muted shrink-0" aria-label={somedayLabel} />}
      <span
        className={`truncate min-w-0 ${checked ? 'line-through' : ''}`}
        style={priorityTier === 'high' ? { fontWeight: 600 } : undefined}
      >
        {title}
      </span>
    </span>
  )

  const trailing = hasSubtasks ? (
    <button
      type="button"
      aria-label={subtasksExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
      className="flex items-center gap-1"
      onClick={(e) => {
        e.stopPropagation()
        onToggleExpanded?.()
      }}
    >
      <span className="flex flex-col items-end">
        <HeroValue>{`${doneCount}/${subtasks!.length}`}</HeroValue>
      </span>
      {subtasksExpanded ? (
        <ChevronDown size={14} className="text-ink-muted shrink-0" aria-hidden />
      ) : (
        <ChevronRight size={14} className="text-ink-muted shrink-0" aria-hidden />
      )}
    </button>
  ) : dueInfo ? (
    <DueDateChip label={dueInfo.label} tone={dueInfo.tone} />
  ) : (
    // Reserved width, no content — the leading checkbox already provides
    // a full tap-to-complete affordance for every row (kept unchanged,
    // see below), so an empty trailing slot doesn't need a second,
    // redundant tap target here; it only needs to not misalign rows that
    // do have a chip/ratio.
    <span className="inline-block w-px" aria-hidden />
  )

  return (
    // bg-canvas has to stay at full opacity on THIS outer box — it's the
    // opaque backing SwipeableCard relies on to fully hide the swipe
    // actions underneath while closed. Applying the dim here instead
    // (opacity affects the whole box, background included) would make
    // that backing translucent and let the action buttons bleed through
    // even at rest — the actual dimming lives on the inner wrapper below,
    // which carries no background of its own.
    <div className="rounded-card bg-canvas">
      <div style={dimmed ? { opacity: 0.55 } : undefined}>
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            aria-pressed={checked}
            aria-label={checked ? 'Mark not done' : 'Mark done'}
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggleChecked?.()
            }}
          >
            <Dot filled={!!checked} size={24} color={checkColor} />
          </button>

          {/* Fixed-width slot regardless of whether a flag renders, so badges
              still line up vertically between a high/medium-priority row and
              a no-priority one. */}
          <span
            className="w-[14px] shrink-0 flex items-center justify-center text-ink"
            aria-hidden={!priorityLabel || priorityTier === 'none'}
            aria-label={priorityTier !== 'none' ? priorityLabel : undefined}
          >
            {priorityTier !== 'none' && (
              <Flag size={14} strokeWidth={2} fill={priorityTier === 'high' ? 'currentColor' : 'none'} />
            )}
          </span>

          <MinimalListRow variant="flat" badge={badge} title={titleWithIcons} subtitle={subtitle} onClick={onOpen} trailing={trailing} />
        </div>

        {hasSubtasks && subtasksExpanded && (
          <div className="pl-[4.25rem] pr-3 pb-2 flex flex-col gap-2">
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
                <Dot filled={s.done} size={16} />
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
    </div>
  )
}
