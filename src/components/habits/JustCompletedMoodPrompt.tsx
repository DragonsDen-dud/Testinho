import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { Habit } from '../../db/types'
import { useHabitLogs } from '../../state/useHabits'
import { setHabitLogMood } from '../../data/habits'
import { MOOD_SCALE, shouldPromptMood } from '../../lib/moodScale'

/**
 * STOA-5 Part B — the mood prompt for the case that actually matters:
 * immediately after a habit is marked **done**.
 *
 * This exists because of a real gap found during this round's live pass.
 * The in-card mood row (HabitCard) only renders while the card itself is on
 * screen — and marking a habit done moves it straight into the "Done today"
 * tray, unmounting the card. So mood capture was only ever reachable for a
 * habit logged not_done or skip: the completion path, by far the most
 * common one, could never be rated at all. Article 35's mood correlation
 * was quietly starved of exactly the data it needs most.
 *
 * The shape follows the brief and the EMA research behind it:
 *  - it appears *after* the check-in is already saved, never before, so the
 *    completion action itself is untouched and instant;
 *  - one row, five taps, no second question;
 *  - dismissible with one tap, and ignoring it entirely costs nothing —
 *    there is no confirm step and nothing is lost by never touching it;
 *  - it respects shouldPromptMood, so a habit Denys never rates stops
 *    being asked about rather than nagging harder.
 */
export function JustCompletedMoodPrompt({
  habit,
  date,
  onDismiss,
}: {
  habit: Habit
  date: string
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const logs = useHabitLogs(habit.id)
  const [picked, setPicked] = useState<number | null>(null)

  const todayLog = logs.find((l) => l.date === date)
  // Don't ask again about a day that's already rated, and honour the
  // reduce-don't-nag policy.
  if (todayLog?.mood != null && picked === null) return null
  if (!shouldPromptMood(logs, date)) return null

  return (
    <div className="flex items-center gap-2 rounded-card px-3 py-2" style={{ background: 'var(--color-chip)' }}>
      <span className="text-xs text-[var(--stoa-text-muted)] flex-1 min-w-0 truncate">
        {t('habits.moodPromptAfterDone', { name: habit.name })}
      </span>
      <div className="flex gap-1 shrink-0">
        {MOOD_SCALE.map((m) => {
          const selected = picked === m.value
          return (
            <button
              key={m.value}
              type="button"
              aria-label={t('habits.moodOptionLabel', { value: m.value })}
              aria-pressed={selected}
              onClick={() => {
                setPicked(m.value)
                // Fire-and-forget: this is a post-hoc update to a log that
                // is already saved, so nothing here is awaited on any path
                // the user is waiting for.
                void setHabitLogMood(habit.id, date, m.value)
              }}
              className={`text-base w-7 h-7 rounded-full border-2 transition-transform duration-150 active:scale-90 ${
                selected ? 'scale-110' : 'opacity-60'
              }`}
              style={{
                borderColor: selected ? m.color : 'transparent',
                background: selected ? `${m.color}26` : 'transparent',
              }}
            >
              {m.emoji}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onDismiss}
        className="shrink-0 text-[var(--stoa-text-muted)] w-6 h-6 flex items-center justify-center"
      >
        <X size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
