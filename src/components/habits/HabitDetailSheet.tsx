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
import type { Habit } from '../../db/types'

/**
 * Read-only summary reached by tapping a habit's card in the list — the
 * full HabitForm (with every input field) is now reached only via the
 * explicit "Edit" button below, never by the card tap itself. Quick
 * actions (Done/Not done/Skip, mood, note) stay on HabitCard directly,
 * untouched by this addition — this is purely an alternate "look, don't
 * touch" path alongside them, not a replacement.
 */
export function HabitDetailSheet({ habit, onClose, onEdit }: { habit: Habit; onClose: () => void; onEdit: () => void }) {
  const { t, i18n } = useTranslation()
  const domains = useDomains(habit.spaceId)
  const timeBlocks = useTimeBlocks(habit.spaceId)
  const allLogs = useHabitLogs(habit.id)

  const domain = domains.find((d) => d.id === habit.domainId)
  const timeBlock = timeBlocks.find((tb) => tb.id === habit.timeBlockId)
  const strength = computeHabitStrength(habit, allLogs)
  const streak = habit.habitType === 'build' ? computeBuildStreak(habit, allLogs) : computeAvoidStreak(habit, allLogs)

  const latestNoteLog = [...allLogs].filter((l) => l.note?.trim()).sort((a, b) => b.date.localeCompare(a.date))[0]

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

        <div className="flex flex-wrap gap-2">
          {domain && (
            <InfoChip>
              {domain.icon} {domain.name}
            </InfoChip>
          )}
          {timeBlock && <InfoChip>{timeBlock.name}</InfoChip>}
          <InfoChip>{formatHabitCadence(habit, t, i18n.language)}</InfoChip>
          {habit.stake && (
            <InfoChip>
              <Flag size={12} strokeWidth={1.75} aria-hidden /> {t('habits.hasStakeChip')}
            </InfoChip>
          )}
          {habit.criticalReminder && (
            <InfoChip>
              <CalendarCheck size={12} strokeWidth={1.75} aria-hidden /> {t('habits.hasCalendarBackupChip')}
            </InfoChip>
          )}
        </div>

        {latestNoteLog?.note && (
          <div className="rounded-card p-3 text-sm text-ink" style={{ background: 'var(--color-chip)' }}>
            <div className="text-xs text-ink-muted mb-1">{t('habits.latestNoteLabel')}</div>
            {latestNoteLog.note}
          </div>
        )}
      </div>
    </Sheet>
  )
}
