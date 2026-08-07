import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, Flag } from 'lucide-react'
import { Sheet } from '../ui/Sheet'
import { InfoChip } from '../ui/InfoChip'
import { ProgressBar } from '../ui/ProgressBar'
import { Button } from '../ui/Button'
import { useDomains } from '../../state/useDomains'
import { useTimeBlocks } from '../../state/useTimeBlocks'
import { useHabitLogs } from '../../state/useHabits'
import { computeHabitStrength, computeBuildStreak, computeAvoidStreak } from '../../lib/habitStrength'
import { formatHabitCadence } from '../../lib/habitCadence'
import { HabitPatternGrid } from './HabitPatternGrid'
import { useAppSettings } from '../../state/useAppSettings'
import { visibleHabitFieldOrder, isHabitFieldVisible, type HabitFieldKey } from '../../lib/habitFields'
import type { Habit } from '../../db/types'

/**
 * Summary reached by tapping a habit's card in the list — the full
 * HabitForm (with every input field) is reached only via the explicit
 * "Edit" button below, never by the card tap itself. Quick actions for
 * *today* (Done/Not done/Skip, mood, note) stay on HabitCard directly,
 * untouched by this addition.
 *
 * The HabitPatternGrid below is no longer purely "look, don't touch" —
 * Denys asked for the ability to tap any recent day's circle and log/edit
 * it right here, so this sheet now has two write paths of its own (any
 * day via the grid) alongside HabitCard's (today only), both funneling
 * into the exact same logHabit/logMeasurableEntry functions.
 */
export function HabitDetailSheet({
  habit,
  allHabits,
  onClose,
  onEdit,
}: {
  habit: Habit
  allHabits: Habit[]
  onClose: () => void
  onEdit: () => void
}) {
  const { t, i18n } = useTranslation()
  const settings = useAppSettings()
  const domains = useDomains(habit.spaceId)
  const timeBlocks = useTimeBlocks(habit.spaceId)
  const allLogs = useHabitLogs(habit.id)

  const domain = domains.find((d) => d.id === habit.domainId)
  const timeBlock = timeBlocks.find((tb) => tb.id === habit.timeBlockId)
  const strength = computeHabitStrength(habit, allLogs)
  const streak = habit.habitType === 'build' ? computeBuildStreak(habit, allLogs) : computeAvoidStreak(habit, allLogs)

  const latestNoteLog = [...allLogs].filter((l) => l.note?.trim()).sort((a, b) => b.date.localeCompare(a.date))[0]

  const chips: Partial<Record<HabitFieldKey, ReactNode>> = {
    domain: domain ? (
      <InfoChip key="domain">
        {domain.icon} {domain.name}
      </InfoChip>
    ) : null,
    timeBlock: timeBlock ? <InfoChip key="timeBlock">{timeBlock.name}</InfoChip> : null,
    schedule: <InfoChip key="schedule">{formatHabitCadence(habit, t, i18n.language)}</InfoChip>,
    stake: habit.stake ? (
      <InfoChip key="stake">
        <Flag size={12} strokeWidth={1.75} aria-hidden /> {t('habits.hasStakeChip')}
      </InfoChip>
    ) : null,
    criticalReminder: habit.criticalReminder ? (
      <InfoChip key="criticalReminder">
        <CalendarCheck size={12} strokeWidth={1.75} aria-hidden /> {t('habits.hasCalendarBackupChip')}
      </InfoChip>
    ) : null,
  }
  const fieldConfig = settings?.habitFieldConfig
  const chipOrder = visibleHabitFieldOrder(fieldConfig).filter((key) => chips[key])
  const noteVisible = isHabitFieldVisible(fieldConfig, 'note')

  const primaryLabel =
    habit.habitType === 'avoid' ? t('habits.daysCleanLabel', { count: streak }) : `${strength}% ${t('habits.strength').toLowerCase()}`
  const secondaryLabel =
    habit.habitType === 'avoid' ? `${strength}% ${t('habits.strength').toLowerCase()}` : t('habits.streakLabel', { count: streak })

  return (
    <Sheet
      title={habit.name}
      onClose={onClose}
      footer={
        <Button className="w-full" onClick={onEdit}>
          {t('common.edit')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-2xl font-semibold text-ink">{primaryLabel}</div>
            <div className="text-xs text-ink-muted">{secondaryLabel}</div>
          </div>
          <div className="w-24 shrink-0">
            <ProgressBar percent={strength} />
          </div>
        </div>

        <HabitPatternGrid habit={habit} allHabits={allHabits} />

        {/* Part 3b — the same per-install field visibility/order config the
            edit form uses, applied to this view's chips. Keys with no chip
            representation here (icon, measurable, reminderTimes,
            dependsOn, pause) simply have no entry in the map and are
            skipped; the Habit Strength/streak hero and the pattern grid
            above are not configurable fields and are never affected. */}
        {chipOrder.length > 0 && <div className="flex flex-wrap gap-2">{chipOrder.map((key) => chips[key])}</div>}

        {noteVisible && latestNoteLog?.note && (
          <div className="rounded-card p-3 text-sm text-ink" style={{ background: 'var(--color-chip)' }}>
            <div className="text-xs text-ink-muted mb-1">{t('habits.latestNoteLabel')}</div>
            {latestNoteLog.note}
          </div>
        )}
      </div>
    </Sheet>
  )
}
