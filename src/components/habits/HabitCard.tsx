import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Habit, HabitLog } from '../../db/types'
import { useHabitLogs } from '../../state/useHabits'
import { useTimeBlocks } from '../../state/useTimeBlocks'
import { computeBuildStreak, computeAvoidStreak, isPausedOnDate } from '../../lib/habitStrength'
import { unmetDependencyNames } from '../../lib/habitDependencies'
import { computeWeekdayPattern, computeTimeOfDayPattern } from '../../lib/habitPatterns'
import { computeMoodCorrelation, formatSignedMood } from '../../lib/moodCorrelation'
import { formatHabitCadence } from '../../lib/habitCadence'
import { computeHabitHeroValue } from '../../lib/habitHeroValue'
import { logHabit, logMeasurableEntry, resumeHabit, setHabitLogMood, setHabitLogNote, setHabitLogPhoto } from '../../data/habits'
import { todayKey, weekdayName } from '../../lib/date'
import { useAppSettings } from '../../state/useAppSettings'
import { ActiveReminderRow } from '../reminders/ActiveReminderRow'
import { HabitCategoryBadge } from './HabitCategoryBadge'
import { Button } from '../ui/Button'
import { HeroValue } from '../ui/HeroValue'
import { Input, TextArea } from '../ui/Input'
import { MicButton } from '../ui/MicButton'
import { MinimalListRow } from '../ui/MinimalListRow'
import { PhotoAttachmentInput } from '../ui/PhotoAttachmentInput'
import { appendTranscript } from '../../lib/speechRecognition'

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
  onLogged,
  vibrant = false,
}: {
  habit: Habit
  todayLog?: HabitLog
  allHabits?: Habit[]
  logsToday?: Map<string, HabitLog>
  /**
   * Fired only after an explicit "done" completion (the plain Done button,
   * or a measurable-value save) — never for not_done/skip, which don't
   * move a habit into the "done today" tray. Lets the parent page track
   * "just completed in this click" without inferring it from a live-query
   * re-render, which would race Dexie's async resolution.
   */
  onLogged?: () => void
  /** Today-screen-only vibrant treatment (Articles 3/6/19 round) — the
   * Done button becomes the primary-blue CTA before completion and a
   * green success fill (with a one-shot pop) after. False everywhere
   * else, which keeps Habits-tab rendering exactly as before. */
  vibrant?: boolean
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const allLogs = useHabitLogs(habit.id)
  const timeBlocks = useTimeBlocks(habit.spaceId)
  const [loggingValue, setLoggingValue] = useState(false)
  const [value, setValue] = useState(habit.measurable?.targetValue ?? 0)

  const date = todayKey()
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

  // Part 2 row spec: one subtitle line, priority paused > blocked > cadence
  // (whichever is most actionable today beats the plain schedule text).
  // Habit Strength% no longer renders on the collapsed row at all — the
  // brief's row spec names exactly 4 elements (badge/title/subtitle/hero)
  // and "only one element per row gets visual weight"; strength stays
  // fully visible in the untouched Detail View a tap away.
  const cadence = formatHabitCadence(habit, t, i18n.language)
  const subtitle = paused
    ? t('habits.pausedUntilLabel', { date: habit.pausedUntil })
    : blockedBy.length > 0
      ? t('habits.blockedByLabel', { names: blockedBy.join(', ') })
      : cadence
  const hero = computeHabitHeroValue(habit, todayLog, streak, t)

  const row = (
    <MinimalListRow
      variant="flat"
      badge={<HabitCategoryBadge habit={habit} />}
      title={habit.name}
      subtitle={subtitle}
      onClick={() => navigate(`/habits/${habit.id}`)}
      trailing={
        <div className="flex flex-col items-end">
          <HeroValue>{hero.value}</HeroValue>
          <span className="text-[10px] text-[var(--stoa-text-muted)] uppercase tracking-wide">{hero.caption}</span>
        </div>
      }
    />
  )

  if (paused) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 opacity-55">{row}</div>
        <Button variant="secondary" className="shrink-0" onClick={() => resumeHabit(habit.id)}>
          {t('habits.resumeNow')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {row}
      <div className="pl-12 flex flex-col gap-3">
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

        {blockedBy.length > 0 ? null : habit.measurable ? (
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
                vibrant={vibrant}
                onClick={async () => {
                  await logMeasurableEntry(habit.id, date, value)
                  setLoggingValue(false)
                  onLogged?.()
                }}
              >
                {t('common.save')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant={entryCount > 0 ? 'secondary' : 'primary'}
                vibrant={vibrant}
                className="flex-1"
                onClick={() => setLoggingValue(true)}
              >
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
                variant={todayLog?.status === 'done' ? (vibrant ? 'success' : 'primary') : 'secondary'}
                vibrant={vibrant}
                className="flex-1"
                onClick={async () => {
                  await logHabit(habit.id, date, 'done')
                  onLogged?.()
                }}
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

            {todayLog && (
              <HabitLogNoteField
                key={todayLog.id}
                habitId={habit.id}
                date={date}
                initialNote={todayLog.note}
                initialPhoto={todayLog.photo}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Article 10 target surface (HabitLog.note) — no such UI existed before this
 * pass, so this is new scaffolding, same progressive-disclosure shape as the
 * mood row above it: appears once a check-in exists, never blocks it.
 * Keyed by `todayLog.id` on the call site so a new log (new day, or a
 * cleared/re-logged entry) remounts this with a fresh buffer instead of
 * showing stale text from a previous log.
 */
function HabitLogNoteField({
  habitId,
  date,
  initialNote,
  initialPhoto,
}: {
  habitId: string
  date: string
  initialNote?: string
  initialPhoto?: Blob
}) {
  const { t, i18n } = useTranslation()
  const [note, setNote] = useState(initialNote ?? '')
  const [photo, setPhoto] = useState<Blob | undefined>(initialPhoto)

  return (
    <div className="flex flex-col gap-1.5 -mt-1">
      <div className="flex gap-2 items-start">
        <TextArea
          rows={1}
          placeholder={t('habits.checkInNotePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => setHabitLogNote(habitId, date, note.trim() || undefined)}
          className="flex-1 text-xs py-1.5"
        />
        <MicButton
          lang={i18n.language}
          onTranscript={(transcript) =>
            setNote((prev) => {
              const merged = appendTranscript(prev, transcript)
              // A transcript is a discrete, complete event (unlike an
              // in-progress keystroke) — persist it immediately rather than
              // waiting for blur, matching the mood row's immediate-save
              // behavior right above.
              void setHabitLogNote(habitId, date, merged.trim() || undefined)
              return merged
            })
          }
        />
      </div>
      <PhotoAttachmentInput
        photo={photo}
        onChange={(next) => {
          setPhoto(next)
          void setHabitLogPhoto(habitId, date, next)
        }}
      />
    </div>
  )
}
