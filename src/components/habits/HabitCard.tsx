import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Habit, HabitLog } from '../../db/types'
import { useHabitLogs } from '../../state/useHabits'
import { useTimeBlocks } from '../../state/useTimeBlocks'
import { computeHabitStrength, computeBuildStreak, computeAvoidStreak, isPausedOnDate } from '../../lib/habitStrength'
import { unmetDependencyNames } from '../../lib/habitDependencies'
import { computeWeekdayPattern, computeTimeOfDayPattern } from '../../lib/habitPatterns'
import { computeMoodCorrelation, formatSignedMood } from '../../lib/moodCorrelation'
import { logHabit, logMeasurableEntry, resumeHabit, setHabitLogMood } from '../../data/habits'
import { todayKey, weekdayName } from '../../lib/date'
import { useAppSettings } from '../../state/useAppSettings'
import { ActiveReminderRow } from '../reminders/ActiveReminderRow'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ProgressBar } from '../ui/ProgressBar'

// Article 35 support — 5-point scale mapped to -2..+2, matching the sign
// mood correlation expects (positive = better mood). Purely additive: tapping
// a mood never blocks or re-triggers the check-in save that already happened.
const MOOD_OPTIONS: { value: number; emoji: string }[] = [
  { value: -2, emoji: '😞' },
  { value: -1, emoji: '😕' },
  { value: 0, emoji: '😐' },
  { value: 1, emoji: '🙂' },
  { value: 2, emoji: '😊' },
]

export function HabitCard({
  habit,
  todayLog,
  allHabits = [],
  logsToday = new Map(),
}: {
  habit: Habit
  todayLog?: HabitLog
  allHabits?: Habit[]
  logsToday?: Map<string, HabitLog>
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const allLogs = useHabitLogs(habit.id)
  const timeBlocks = useTimeBlocks(habit.spaceId)
  const [loggingValue, setLoggingValue] = useState(false)
  const [value, setValue] = useState(habit.measurable?.targetValue ?? 0)

  const date = todayKey()
  const strength = computeHabitStrength(habit, allLogs)
  const streak = habit.habitType === 'build' ? computeBuildStreak(habit, allLogs) : computeAvoidStreak(habit, allLogs)
  const paused = isPausedOnDate(habit, date)
  const blockedBy = paused ? [] : unmetDependencyNames(habit, allHabits, logsToday)
  const entryCount = todayLog?.entries?.length ?? 0

  // Articles 26/35 — pure local computation, no AI. Absent entirely (no
  // line rendered) whenever the underlying data doesn't clear each
  // function's own minimum-sample threshold.
  const weekdayPattern = computeWeekdayPattern(habit, allLogs)
  const timeOfDayPattern = computeTimeOfDayPattern(habit, allLogs, timeBlocks)
  const moodCorrelation = computeMoodCorrelation(allLogs)

  const primaryStat =
    habit.habitType === 'avoid' ? (
      <div className="text-sm font-medium">{t('habits.daysCleanLabel', { count: streak })}</div>
    ) : (
      <div className="text-sm font-medium">{strength}% {t('habits.strength').toLowerCase()}</div>
    )
  const secondaryStat =
    habit.habitType === 'avoid' ? (
      <div className="text-xs text-[var(--stoa-text-muted)]">{strength}% {t('habits.strength').toLowerCase()}</div>
    ) : (
      <div className="text-xs text-[var(--stoa-text-muted)]">{t('habits.streakLabel', { count: streak })}</div>
    )

  if (paused) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--stoa-border)] bg-[var(--stoa-surface)]/60 p-3.5 flex items-center justify-between gap-2">
        <button className="text-left" onClick={() => navigate(`/habits/${habit.id}/edit`)}>
          <div className="text-sm font-medium text-[var(--stoa-text-muted)]">{habit.name}</div>
          <div className="text-xs text-[var(--stoa-text-muted)]">
            {t('habits.pausedUntilLabel', { date: habit.pausedUntil })}
          </div>
        </button>
        <Button variant="secondary" onClick={() => resumeHabit(habit.id)}>
          {t('habits.resumeNow')}
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] p-3.5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <button className="text-left" onClick={() => navigate(`/habits/${habit.id}/edit`)}>
          <div className="text-sm font-semibold">{habit.name}</div>
          {primaryStat}
          {secondaryStat}
        </button>
        <div className="w-full max-w-[8rem] mt-1.5">
          <ProgressBar percent={strength} />
        </div>
      </div>

      <ActiveReminderRow entityType="habit" entityId={habit.id} date={date} />

      {(weekdayPattern || timeOfDayPattern || moodCorrelation) && (
        <div className="flex flex-col gap-0.5 -mt-1">
          {weekdayPattern && (
            <div className="text-xs text-[var(--stoa-text-muted)]">
              {t('habits.weakDayLabel', { day: weekdayName(weekdayPattern.weekday, i18n.language) })}
            </div>
          )}
          {timeOfDayPattern && (
            <div className="text-xs text-[var(--stoa-text-muted)]">
              {t('habits.strongTimeLabel', { name: timeOfDayPattern.timeBlockName })}
            </div>
          )}
          {moodCorrelation && (
            <div className="text-xs text-[var(--stoa-text-muted)]">
              {t(habit.habitType === 'avoid' ? 'habits.moodCorrelationAvoid' : 'habits.moodCorrelationBuild', {
                value: formatSignedMood(moodCorrelation.value),
              })}
            </div>
          )}
        </div>
      )}

      {blockedBy.length > 0 ? (
        <div className="text-xs text-[var(--stoa-text-muted)] italic px-1">
          {t('habits.blockedByLabel', { names: blockedBy.join(', ') })}
        </div>
      ) : habit.measurable ? (
        loggingValue ? (
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="flex-1"
              autoFocus
            />
            <span className="text-xs text-[var(--stoa-text-muted)]">{habit.measurable.unit}</span>
            <Button
              onClick={async () => {
                await logMeasurableEntry(habit.id, date, value)
                setLoggingValue(false)
              }}
            >
              {t('common.save')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant={entryCount > 0 ? 'secondary' : 'primary'} className="flex-1" onClick={() => setLoggingValue(true)}>
              {entryCount > 0 ? t('habits.logAnother') : t('habits.logValue')}
            </Button>
            {entryCount > 0 && (
              <span className="text-xs text-[var(--stoa-text-muted)] flex items-center gap-1">
                {t('habits.entriesTodayLabel', { count: entryCount })}
                {todayLog?.bonus && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--stoa-accent)]" />}
              </span>
            )}
          </div>
        )
      ) : (
        <>
          <div className="flex gap-2">
            <Button
              variant={todayLog?.status === 'done' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => logHabit(habit.id, date, 'done')}
            >
              {t('habits.markDone')}
            </Button>
            <Button
              variant={todayLog?.status === 'not_done' ? 'danger' : 'secondary'}
              className="flex-1"
              onClick={() => logHabit(habit.id, date, 'not_done')}
            >
              {t('habits.markNotDone')}
            </Button>
            <Button
              variant={todayLog?.status === 'skip' ? 'secondary' : 'ghost'}
              onClick={() => logHabit(habit.id, date, 'skip')}
            >
              {t('habits.markSkip')}
            </Button>
          </div>

          {todayLog && settings?.moodCaptureEnabled !== false && (
            <div className="flex gap-1.5 items-center -mt-1">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-label={t('habits.moodOptionLabel', { value: m.value })}
                  onClick={() => setHabitLogMood(habit.id, date, todayLog.mood === m.value ? undefined : m.value)}
                  className={`text-base w-7 h-7 rounded-full border transition-transform ${
                    todayLog.mood === m.value
                      ? 'border-[var(--stoa-accent)] scale-110'
                      : 'border-transparent opacity-60'
                  }`}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
