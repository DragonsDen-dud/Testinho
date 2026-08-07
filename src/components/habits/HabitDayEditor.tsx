import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Habit, HabitLog } from '../../db/types'
import { useLogsForDate } from '../../state/useHabits'
import { unmetDependencyNames } from '../../lib/habitDependencies'
import { logHabit, logMeasurableEntry } from '../../data/habits'
import { formatHumanDate } from '../../lib/date'
import { MOOD_SCALE } from '../../lib/moodScale'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

const MOOD_LOOKUP = new Map(MOOD_SCALE.map((m) => [m.value, m]))

/**
 * The "log or correct one specific day" editor, extracted verbatim from
 * HabitPatternGrid so the new contribution heatmap (STOA-5 Part C) reuses
 * it rather than growing a second, drifting copy — the "flag, don't fork"
 * rule this project already applies to HabitCard/ColorIconBadge variants.
 *
 * Both callers get identical behavior by construction: the same dependency
 * blocking (Article 25), the same measurable-vs-plain branch, and the same
 * logHabit/logMeasurableEntry calls the Habits tab and Catch-up use, so a
 * backdated log from either grid recalculates streaks the same way.
 */
export function HabitDayEditor({
  habit,
  allHabits,
  date,
  log,
  onDone,
}: {
  habit: Habit
  allHabits: Habit[]
  date: string
  log: HabitLog | undefined
  onDone: () => void
}) {
  const { t, i18n } = useTranslation()
  const dependsOn = habit.dependsOnHabitIds ?? []
  const logsOnDate = useLogsForDate(dependsOn, date)
  const blockedBy = unmetDependencyNames(habit, allHabits, logsOnDate)

  return (
    <div className="rounded-card p-3 flex flex-col gap-2" style={{ background: 'var(--color-chip)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--stoa-text-muted)]">{formatHumanDate(date, i18n.language)}</span>
        {log?.mood != null && <MoodReadout mood={log.mood} />}
      </div>

      {log?.note && <div className="text-xs text-[var(--stoa-text)]">{log.note}</div>}

      {blockedBy.length > 0 ? (
        <div className="text-xs text-[var(--stoa-text-muted)]">
          {t('habits.blockedByLabel', { names: blockedBy.join(', ') })}
        </div>
      ) : habit.measurable ? (
        <DayValueEditor
          key={date}
          habitId={habit.id}
          date={date}
          defaultValue={habit.measurable.targetValue}
          unit={habit.measurable.unit}
          onSaved={onDone}
        />
      ) : (
        <div className="flex gap-2">
          <Button
            variant={log?.status === 'done' ? 'primary' : 'secondary'}
            className="flex-1"
            onClick={async () => {
              await logHabit(habit.id, date, 'done')
              onDone()
            }}
          >
            {t('habits.markDone')}
          </Button>
          <Button
            variant={log?.status === 'not_done' ? 'danger' : 'secondary'}
            className="flex-1"
            onClick={async () => {
              await logHabit(habit.id, date, 'not_done')
              onDone()
            }}
          >
            {t('habits.markNotDone')}
          </Button>
          <Button
            variant={log?.status === 'skip' ? 'secondary' : 'ghost'}
            onClick={async () => {
              await logHabit(habit.id, date, 'skip')
              onDone()
            }}
          >
            {t('habits.markSkip')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Read-only echo of a already-logged mood, in the Part B scale's own
 * color — this editor never sets mood (that stays a post-completion tap on
 * the card), it only reports what's there. */
function MoodReadout({ mood }: { mood: number }) {
  const { t } = useTranslation()
  const point = MOOD_LOOKUP.get(mood)
  if (!point) return null
  return (
    <span
      aria-label={t('habits.moodOptionLabel', { value: mood })}
      className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5"
      style={{ background: `${point.color}22`, color: 'var(--stoa-text)' }}
    >
      <span aria-hidden>{point.emoji}</span>
    </span>
  )
}


function DayValueEditor({
  habitId,
  date,
  defaultValue,
  unit,
  onSaved,
}: {
  habitId: string
  date: string
  defaultValue: number
  unit: string
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState(defaultValue)
  return (
    <div className="flex gap-2 items-center">
      <Input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="flex-1" autoFocus />
      <span className="text-xs text-[var(--stoa-text-muted)]">{unit}</span>
      <Button
        onClick={async () => {
          await logMeasurableEntry(habitId, date, value)
          onSaved()
        }}
      >
        {t('common.save')}
      </Button>
    </div>
  )
}
