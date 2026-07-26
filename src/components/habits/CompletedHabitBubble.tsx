import { RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHabitLogs } from '../../state/useHabits'
import { logHabit } from '../../data/habits'
import { computeBuildStreak, computeAvoidStreak } from '../../lib/habitStrength'
import { justCrossedTier } from '../../lib/streakVisual'
import { addDays, todayKey } from '../../lib/date'
import { StreakFlame } from './StreakFlame'
import { HabitCategoryBadge } from './HabitCategoryBadge'
import type { Habit } from '../../db/types'

/**
 * "Done today" tray tile (Habits 2.0 Part B, formerly CompletedHabitRow) —
 * a home-screen-app-icon-style bubble: the habit's own real ColorIconBadge
 * (same resolver as everywhere else, via HabitCategoryBadge) sized up to
 * 'tray', name below, streak tier kept as a small adjacent caption under
 * that rather than fused into the badge itself — the badge's one corner
 * indicator slot is already spoken for by the build/avoid glyph, and
 * stacking a second meaning into that same corner at 44px would leave
 * neither legible.
 *
 * Self-fetches logs like HabitCard does, so its streak number is always
 * correct independent of what the parent page happened to pass down.
 * `justCompleted` is driven entirely by HabitCard's onLogged callback — an
 * explicit user click — never inferred from a render/diff, so a habit that
 * was already done earlier today (e.g. after a page reload) never replays
 * the collapse or milestone animation.
 *
 * Habits 2.0 Part C — undo affordance: a small corner button, separate
 * from the tap-through-to-detail target, calling the exact same
 * logHabit(..., 'not_done') HabitCard's own "Not done" button already
 * calls (no new completion logic). Placed opposite corner from
 * HabitCategoryBadge's build/avoid indicator (bottom-right) so the two
 * never collide. Fire-and-forget on click, same as HabitCard's own
 * "Not done" button — no onLogged-style callback exists for leaving the
 * tray, only for entering it.
 */
export function CompletedHabitBubble({ habit, justCompleted = false }: { habit: Habit; justCompleted?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const allLogs = useHabitLogs(habit.id)
  const today = todayKey()
  const yesterday = addDays(today, -1)

  const streakFn = habit.habitType === 'build' ? computeBuildStreak : computeAvoidStreak
  const days = streakFn(habit, allLogs)
  // The streak as of yesterday — i.e. before today's completion — used only
  // to detect a tier crossing on this specific action, never persisted.
  const daysBefore = streakFn(habit, allLogs, yesterday)
  const crossedTier = justCompleted && justCrossedTier(daysBefore, days)

  return (
    // The inner button repeats w-16 rather than inheriting it from this
    // outer div: items-center (needed so the undo button's absolute
    // -top-1/-left-1 offset stays anchored to the badge, not to whatever
    // width a long habit name would otherwise stretch this div to) sizes
    // flex children to their own content, not the container's width — so
    // without its own explicit w-16, the inner button (and the name
    // label's w-full inside it) would grow past 64px for any name longer
    // than that, overflowing into a neighboring bubble instead of
    // truncating (found via this round's Today-redesign verification,
    // comparing against CompletedTaskBubble's simpler single-element
    // structure, which never had this extra nesting level to break).
    <div
      className={`relative flex flex-col items-center gap-1 w-16 shrink-0 ${
        justCompleted ? (crossedTier ? 'habit-collapse-in-milestone' : 'habit-collapse-in') : ''
      }`}
    >
      <button type="button" onClick={() => navigate(`/habits/${habit.id}`)} className="flex flex-col items-center gap-1 w-16">
        <HabitCategoryBadge habit={habit} size="tray" />
        <span className="text-[11px] font-medium text-[var(--stoa-text-muted)] text-center truncate w-full">
          {habit.name}
        </span>
        <StreakFlame days={days} milestoneAnimate={crossedTier} />
      </button>
      <button
        type="button"
        aria-label={t('habits.undoCompletion')}
        onClick={() => logHabit(habit.id, today, 'not_done')}
        className="absolute -top-1 -left-1 flex items-center justify-center rounded-full w-5 h-5 bg-[var(--stoa-bg)] border border-[var(--stoa-border)] text-[var(--stoa-text-muted)]"
      >
        <RotateCcw size={11} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}
