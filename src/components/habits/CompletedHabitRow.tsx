import { useNavigate } from 'react-router-dom'
import { useHabitLogs } from '../../state/useHabits'
import { computeBuildStreak, computeAvoidStreak } from '../../lib/habitStrength'
import { justCrossedTier } from '../../lib/streakVisual'
import { addDays, todayKey } from '../../lib/date'
import { StreakFlame } from './StreakFlame'
import type { Habit } from '../../db/types'

/**
 * Compact "done today" tray row (Section 4). Self-fetches logs like
 * HabitCard does, so its streak number is always correct independent of
 * what the parent page happened to pass down.
 *
 * `justCompleted` is driven entirely by HabitCard's onLogged callback — an
 * explicit user click — never inferred from a render/diff, so a habit that
 * was already done earlier today (e.g. after a page reload) never replays
 * the collapse or milestone animation.
 */
export function CompletedHabitRow({ habit, justCompleted = false }: { habit: Habit; justCompleted?: boolean }) {
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
      className={`w-full flex items-center justify-between gap-2 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)]/70 px-3.5 py-2 text-left ${
        justCompleted ? (crossedTier ? 'habit-collapse-in-milestone' : 'habit-collapse-in') : ''
      }`}
    >
      <span className="text-sm font-medium text-[var(--stoa-text-muted)] truncate">{habit.name}</span>
      <StreakFlame days={days} milestoneAnimate={crossedTier} />
    </button>
  )
}
