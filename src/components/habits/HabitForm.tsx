import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '../ui/Sheet'
import { Field, Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { ColorIconBadge } from '../ui/ColorIconBadge'
import { IconPicker } from '../ui/IconPicker'
import { useDomains } from '../../state/useDomains'
import { useTimeBlocks } from '../../state/useTimeBlocks'
import { useCategoryStyleMap } from '../../state/useCategoryStyles'
import { wouldCreateCycle } from '../../lib/habitDependencies'
import { todayKey } from '../../lib/date'
import { AskAiHabitPanel } from './AskAiHabitPanel'
import { AddToCalendarButton } from '../calendar/AddToCalendarButton'
import { ExportHabitCsvButton } from './ExportHabitCsvButton'
import { buildHabitIcs } from '../../lib/ics'
import { resolveHabitDomainStyle } from './HabitCategoryBadge'
import { useAppSettings } from '../../state/useAppSettings'
import { visibleHabitFieldOrder, type HabitFieldKey } from '../../lib/habitFields'
import type { Habit, HabitType, ScheduleType } from '../../db/types'
import type { NewHabitInput } from '../../data/habits'

const WEEKDAY_KEYS = [0, 1, 2, 3, 4, 5, 6]

export function HabitForm({
  spaceId,
  initial,
  initialTitle,
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
  /** Pre-fills the name field for a new habit (e.g. carried over from the
   * Part 1 compact quick-create's "Open full editor" link) — ignored when
   * editing an existing habit, `initial` always wins. */
  initialTitle?: string
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
  const styleMap = useCategoryStyleMap()
  const settings = useAppSettings()

  const [name, setName] = useState(initial?.name ?? initialTitle ?? '')
  const [habitType, setHabitType] = useState<HabitType>(initial?.habitType ?? 'build')
  const [domainId, setDomainId] = useState(initial?.domainId ?? '')
  const [timeBlockId, setTimeBlockId] = useState(initial?.timeBlockId ?? '')
  // Habits 2.0 Part A — pre-selects whatever this habit's badge would show
  // today (its explicit icon if it has one, else the domain-resolved
  // icon), and re-syncs to the domain's resolved icon as the Domain field
  // changes, UNTIL the user actually taps a different icon themselves —
  // at that point their explicit pick sticks regardless of further domain
  // changes. `iconTouched` starts true for an existing habit that already
  // has its own `icon` (editing it shouldn't silently re-sync away from a
  // deliberate prior choice just because the sheet re-renders).
  const [icon, setIcon] = useState(
    () => initial?.icon ?? resolveHabitDomainStyle(initial?.domainId, domains, styleMap).icon,
  )
  const [iconTouched, setIconTouched] = useState(!!initial?.icon)
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
  const [pauseUntilDraft, setPauseUntilDraft] = useState('')

  // domains/styleMap deliberately left out of the dependency array — this
  // only needs to react to the user changing the Domain field itself;
  // re-running on every live-query tick (e.g. a Pro Settings edit landing
  // while this sheet happens to be open) would fight a still-untouched
  // selection in a confusing way without the user having done anything in
  // this form.
  useEffect(() => {
    if (iconTouched) return
    setIcon(resolveHabitDomainStyle(domainId, domains, styleMap).icon)
  }, [domainId, iconTouched]) // eslint-disable-line react-hooks/exhaustive-deps

  const isPaused = !!(initial?.pausedFrom && initial?.pausedUntil)
  const candidateDependencies = allHabits.filter((h) => h.id !== initial?.id)
  const previewColor = resolveHabitDomainStyle(domainId, domains, styleMap).color

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
      // Only persisted once the user actually taps a different icon
      // (iconTouched) — saving the pre-selected domain default
      // unconditionally would freeze it against future domain-level
      // changes (a Pro Settings edit or reset to that domain) for a habit
      // whose icon was never actually chosen, silently undoing "existing
      // habits are unaffected" for every *new* habit that just accepts
      // the default. Untouched, it stays undefined and keeps dynamically
      // resolving from the domain, exactly like a pre-Part-A habit.
      icon: iconTouched ? icon : undefined,
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
    }
    onSave(data)
  }

  // Part 3b — each configurable field as one self-contained block, keyed by
  // the same catalog Settings reorders. A block that renders `null` (pause
  // on a brand-new habit, dependencies with no other habit to depend on) is
  // absent for its own pre-existing reason, independently of visibility.
  const fieldBlocks: Record<HabitFieldKey, ReactNode> = {
    domain: (
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
    ),
    timeBlock: (
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
    ),
    icon: (
      <Field label={t('habits.icon')}>
        <div className="flex flex-col gap-3">
          <div className="flex justify-center">
            <ColorIconBadge color={previewColor} icon={icon} size="detail" />
          </div>
          <IconPicker
            value={icon}
            color={previewColor}
            onChange={(next) => {
              setIcon(next)
              setIconTouched(true)
            }}
          />
        </div>
      </Field>
    ),
    schedule: (
      <>
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
      </>
    ),
    measurable: (
      <>
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
      </>
    ),
    reminderTimes: (
      <Field label={t('habits.reminderTimes')}>
        <div className="flex flex-col gap-2">
          {reminderTimes.map((time, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                type="time"
                value={time}
                onChange={(e) => setReminderTimes((prev) => prev.map((t2, idx) => (idx === i ? e.target.value : t2)))}
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
    ),
    criticalReminder: (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={criticalReminder} onChange={(e) => setCriticalReminder(e.target.checked)} />
        {t('habits.criticalReminder')}
      </label>
    ),
    stake: (
      <>
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
      </>
    ),
    dependsOn:
      candidateDependencies.length > 0 ? (
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
      ) : null,
    pause:
      initial && (onPause || onResume) ? (
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
      ) : null,
    // STOA-5 — the top-level Habit.note field was removed (dead: written
    // here, never read anywhere). The catalog key survives because it still
    // controls something real: whether the detail view shows the latest
    // *check-in* note (HabitLog.note). Keeping the key rather than renaming
    // it means an existing habitFieldConfig keeps working untouched.
    note: null,
  }

  const fieldOrder = visibleHabitFieldOrder(settings?.habitFieldConfig)

  const footer = (
    <div className="flex gap-2 justify-between">
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
        <Button type="submit" form="habit-form">
          {t('common.save')}
        </Button>
      </div>
    </div>
  )

  return (
    <Sheet title={initial ? t('habits.editHabit') : t('habits.newHabit')} onClose={onClose} footer={footer}>
      <form
        id="habit-form"
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

        {/* Part 3b — everything below Name/Type renders in the order, and
            with the visibility, Denys sets in Settings → Habit fields. A
            hidden field is simply not rendered; its state is still seeded
            from the habit and still submitted, so hiding "Stake" on a habit
            that has one preserves that stake untouched. Name and Type are
            deliberately not in the catalog (see lib/habitFields.ts). */}
        {fieldOrder.map((key) => (
          <div key={key} className="contents">
            {fieldBlocks[key]}
          </div>
        ))}

        {initial && initial.criticalReminder && <AddToCalendarButton build={buildHabitIcs(initial)} />}

        {initial && <ExportHabitCsvButton habit={initial} />}

        {initial && <AskAiHabitPanel habit={initial} />}
      </form>
    </Sheet>
  )
}
