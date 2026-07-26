import { useNavigate } from 'react-router-dom'
import { useHabitLogs } from '../../state/useHabits'
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
 */
export function CompletedHabitBubble({ habit, justCompleted = false }: { habit: Habit; justCompleted?: boolean }) {
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
    <button
      type="button"
      onClick={() => navigate(`/habits/${habit.id}`)}
      className={`flex flex-col items-center gap-1 w-16 shrink-0 ${
        justCompleted ? (crossedTier ? 'habit-collapse-in-milestone' : 'habit-collapse-in') : ''
      }`}
    >
      <HabitCategoryBadge habit={habit} size="tray" />
      <span className="text-[11px] font-medium text-[var(--stoa-text-muted)] text-center truncate w-full">
        {habit.name}
      </span>
      <StreakFlame days={days} milestoneAnimate={crossedTier} />
    </button>
  )
}
