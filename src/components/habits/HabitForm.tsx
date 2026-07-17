import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input, Select, TextArea } from '../ui/Input'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { useDomains } from '../../state/useDomains'
import { useTimeBlocks } from '../../state/useTimeBlocks'
import { wouldCreateCycle } from '../../lib/habitDependencies'
import { todayKey } from '../../lib/date'
import { AskAiHabitPanel } from './AskAiHabitPanel'
import { AddToCalendarButton } from '../calendar/AddToCalendarButton'
import { buildHabitIcs } from '../../lib/ics'
import type { Habit, HabitType, ScheduleType } from '../../db/types'
import type { NewHabitInput } from '../../data/habits'

const WEEKDAY_KEYS = [0, 1, 2, 3, 4, 5, 6]

export function HabitForm({
  spaceId,
  initial,
  allHabits = [],
  onSave,
  onClose,
  onArchive,
  onDelete,
  onPause,
  onResume,
}: {
  spaceId: string
  initial?: Habit
  allHabits?: Habit[]
  onSave: (data: NewHabitInput) => void
  onClose: () => void
  onArchive?: () => void
  onDelete?: () => void
  onPause?: (until: string) => void
  onResume?: () => void
}) {
  const { t, i18n } = useTranslation()
  const domains = useDomains(spaceId)
  const timeBlocks = useTimeBlocks(spaceId)

  const [name, setName] = useState(initial?.name ?? '')
  const [habitType, setHabitType] = useState<HabitType>(initial?.habitType ?? 'build')
  const [domainId, setDomainId] = useState(initial?.domainId ?? '')
  const [timeBlockId, setTimeBlockId] = useState(initial?.timeBlockId ?? '')
  const [scheduleType, setScheduleType] = useState<ScheduleType>(initial?.schedule.type ?? 'daily')
  const [weekdays, setWeekdays] = useState<number[]>(initial?.schedule.params.weekdays ?? [1, 2, 3, 4, 5])
  const [timesPerWeek, setTimesPerWeek] = useState(initial?.schedule.params.n ?? 3)
  const [measurable, setMeasurable] = useState(!!initial?.measurable)
  const [targetValue, setTargetValue] = useState(initial?.measurable?.targetValue ?? 1)
  const [unit, setUnit] = useState(initial?.measurable?.unit ?? '')
  const [reminderTimes, setReminderTimes] = useState<string[]>(initial?.reminderTimes ?? [])
  const [criticalReminder, setCriticalReminder] = useState(initial?.criticalReminder ?? false)
  const [stakeEnabled, setStakeEnabled] = useState(!!initial?.stake)
  const [stakeTriggerType, setStakeTriggerType] = useState(
    initial?.stake?.triggerType ?? 'streak_breaks_n_times',
  )
  const [stakeTriggerValue, setStakeTriggerValue] = useState(initial?.stake?.triggerValue ?? 3)
  const [stakePenaltyText, setStakePenaltyText] = useState(initial?.stake?.penaltyText ?? '')
  const [dependsOnHabitIds, setDependsOnHabitIds] = useState<string[]>(initial?.dependsOnHabitIds ?? [])
  const [dependencyError, setDependencyError] = useState<string | null>(null)
  const [note, setNote] = useState(initial?.note ?? '')
  const [pauseUntilDraft, setPauseUntilDraft] = useState('')

  const isPaused = !!(initial?.pausedFrom && initial?.pausedUntil)
  const candidateDependencies = allHabits.filter((h) => h.id !== initial?.id)

  const weekdayFormatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  function weekdayLabel(dow: number) {
    // 2024-01-07 is a Sunday, so adding dow gives the matching weekday name.
    return weekdayFormatter.format(new Date(2024, 0, 7 + dow))
  }

  function submit() {
    if (!name.trim()) return
    if (initial && dependsOnHabitIds.length > 0 && wouldCreateCycle(initial.id, dependsOnHabitIds, allHabits)) {
      setDependencyError(t('habits.dependencyCycleError'))
      return
    }
    setDependencyError(null)
    const data: NewHabitInput = {
      spaceId,
      name: name.trim(),
      habitType,
      domainId: domainId || undefined,
      timeBlockId: timeBlockId || undefined,
      schedule: {
        type: scheduleType,
        params:
          scheduleType === 'specific_weekdays'
            ? { weekdays }
            : scheduleType === 'weekly_n_times'
              ? { n: timesPerWeek }
              : {},
      },
      measurable: measurable ? { targetValue, unit: unit.trim() } : undefined,
      reminderTimes,
      criticalReminder,
      stake: stakeEnabled
        ? { triggerType: stakeTriggerType, triggerValue: stakeTriggerValue, penaltyText: stakePenaltyText.trim() }
        : undefined,
      dependsOnHabitIds: dependsOnHabitIds.length ? dependsOnHabitIds : undefined,
      note: note.trim() || undefined,
    }
    onSave(data)
  }

  return (
    <Sheet title={initial ? t('habits.editHabit') : t('habits.newHabit')} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label={t('habits.name')}>
          <Input
            autoFocus
            placeholder={t('habits.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <Field label={t('habits.type')}>
          <div className="flex gap-2">
            <Chip label={t('habits.typeBuild')} selected={habitType === 'build'} onClick={() => setHabitType('build')} />
            <Chip label={t('habits.typeAvoid')} selected={habitType === 'avoid'} onClick={() => setHabitType('avoid')} />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('habits.domain')}>
            <Select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
              <option value="">{t('common.none')}</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('habits.timeBlock')}>
            <Select value={timeBlockId} onChange={(e) => setTimeBlockId(e.target.value)}>
              <option value="">{t('common.none')}</option>
              {timeBlocks.map((tb) => (
                <option key={tb.id} value={tb.id}>
                  {tb.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t('habits.schedule')}>
          <Select value={scheduleType} onChange={(e) => setScheduleType(e.target.value as ScheduleType)}>
            <option value="daily">{t('habits.scheduleDaily')}</option>
            <option value="specific_weekdays">{t('habits.scheduleSpecificWeekdays')}</option>
            <option value="weekly_n_times">{t('habits.scheduleWeeklyNTimes')}</option>
            <option value="custom">{t('habits.scheduleCustom')}</option>
          </Select>
        </Field>

        {scheduleType === 'specific_weekdays' && (
          <Field label={t('habits.weekdaysLabel')}>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_KEYS.map((dow) => (
                <Chip
                  key={dow}
                  label={weekdayLabel(dow)}
                  selected={weekdays.includes(dow)}
                  onClick={() =>
                    setWeekdays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]))
                  }
                />
              ))}
            </div>
          </Field>
        )}

        {scheduleType === 'weekly_n_times' && (
          <Field label={t('habits.timesPerWeek')}>
            <Input
              type="number"
              min={1}
              max={7}
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(Number(e.target.value))}
            />
          </Field>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={measurable} onChange={(e) => setMeasurable(e.target.checked)} />
          {t('habits.measurable')}
        </label>
        {measurable && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('habits.targetValue')}>
              <Input
                type="number"
                min={0}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
              />
            </Field>
            <Field label={t('habits.unit')}>
              <Input placeholder={t('habits.unitPlaceholder')} value={unit} onChange={(e) => setUnit(e.target.value)} />
            </Field>
          </div>
        )}

        <Field label={t('habits.reminderTimes')}>
          <div className="flex flex-col gap-2">
            {reminderTimes.map((time, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  type="time"
                  value={time}
                  onChange={(e) =>
                    setReminderTimes((prev) => prev.map((t2, idx) => (idx === i ? e.target.value : t2)))
                  }
                />
                <button
                  type="button"
                  className="text-xs text-[var(--stoa-danger)]"
                  onClick={() => setReminderTimes((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-xs text-[var(--stoa-accent)] self-start"
              onClick={() => setReminderTimes((prev) => [...prev, '09:00'])}
            >
              + {t('habits.addReminder')}
            </button>
          </div>
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={criticalReminder}
            onChange={(e) => setCriticalReminder(e.target.checked)}
          />
          {t('habits.criticalReminder')}
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={stakeEnabled} onChange={(e) => setStakeEnabled(e.target.checked)} />
          {t('habits.stakeEnable')}
        </label>
        {stakeEnabled && (
          <div className="flex flex-col gap-3 pl-1 border-l-2 border-[var(--stoa-border)] ml-1">
            <Field label={t('habits.stake')}>
              <Select
                value={stakeTriggerType}
                onChange={(e) => setStakeTriggerType(e.target.value as typeof stakeTriggerType)}
              >
                <option value="streak_breaks_n_times">{t('habits.stakeTriggerStreak')}</option>
                <option value="strength_below_threshold">{t('habits.stakeTriggerStrength')}</option>
              </Select>
            </Field>
            <Field label={t('common.optional')}>
              <Input
                type="number"
                min={0}
                value={stakeTriggerValue}
                onChange={(e) => setStakeTriggerValue(Number(e.target.value))}
              />
            </Field>
            <Field label={t('habits.stakePenaltyText')}>
              <Input value={stakePenaltyText} onChange={(e) => setStakePenaltyText(e.target.value)} />
            </Field>
          </div>
        )}

        {candidateDependencies.length > 0 && (
          <Field label={t('habits.dependsOn')}>
            <div className="flex flex-col gap-1.5">
              {candidateDependencies.map((h) => (
                <label key={h.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={dependsOnHabitIds.includes(h.id)}
                    onChange={(e) => {
                      setDependencyError(null)
                      setDependsOnHabitIds((prev) =>
                        e.target.checked ? [...prev, h.id] : prev.filter((id) => id !== h.id),
                      )
                    }}
                  />
                  {h.name}
                </label>
              ))}
            </div>
            {dependencyError && <p className="text-xs text-[var(--stoa-danger)] mt-1">{dependencyError}</p>}
          </Field>
        )}

        {initial && (onPause || onResume) && (
          <Field label={t('habits.pause')}>
            {isPaused ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-[var(--stoa-text-muted)]">
                  {t('habits.pausedUntilLabel', { date: initial.pausedUntil })}
                </span>
                {onResume && (
                  <Button type="button" variant="secondary" onClick={onResume}>
                    {t('habits.resumeNow')}
                  </Button>
                )}
              </div>
            ) : (
              onPause && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    min={todayKey()}
                    value={pauseUntilDraft}
                    onChange={(e) => setPauseUntilDraft(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!pauseUntilDraft}
                    onClick={() => onPause(pauseUntilDraft)}
                  >
                    {t('habits.pauseAction')}
                  </Button>
                </div>
              )
            )}
          </Field>
        )}

        <Field label={t('habits.note')}>
          <TextArea
            placeholder={t('habits.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </Field>

        {initial && initial.criticalReminder && <AddToCalendarButton build={buildHabitIcs(initial)} />}

        {initial && <AskAiHabitPanel habit={initial} />}

        <div className="flex gap-2 justify-between mt-2">
          {initial && (onArchive || onDelete) ? (
            <div className="flex gap-2">
              {onArchive && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    if (confirm(t('habits.archiveConfirm'))) onArchive()
                  }}
                >
                  {t('common.archive')}
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    if (confirm(t('habits.deleteConfirm'))) onDelete()
                  }}
                >
                  {t('common.delete')}
                </Button>
              )}
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </div>
      </form>
    </Sheet>
  )
}
