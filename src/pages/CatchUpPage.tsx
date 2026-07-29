import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppSettings } from '../state/useAppSettings'
import { useHabits, useHabitLogsForHabits } from '../state/useHabits'
import { logHabit } from '../data/habits'
import { unmetDependencyNames } from '../lib/habitDependencies'
import { computeCatchUpDays } from '../lib/habitCatchUp'
import { formatHumanDate } from '../lib/date'
import { HabitCategoryBadge } from '../components/habits/HabitCategoryBadge'
import { MinimalListRow } from '../components/ui/MinimalListRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import type { Habit, HabitLog } from '../db/types'

/**
 * Habit catch-up round — a dedicated screen (not a Sheet), matching
 * OverdueTriagePage's existing shape for "here's a backlog, resolve each
 * item" rather than inventing a new pattern. Reachable only via the
 * Habits tab's own entry-point banner, which only renders when
 * computeCatchUpDays actually finds something pending — this page itself
 * still handles being opened with nothing pending (e.g. after resolving
 * the last item) by falling back to the same EmptyState the rest of the
 * app uses, rather than assuming the banner always gated entry.
 */
export function CatchUpPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const habits = useHabits(settings?.activeSpaceId)
  const logsByHabit = useHabitLogsForHabits(habits.map((h) => h.id))
  const days = computeCatchUpDays(habits, logsByHabit)

  function logsForDate(date: string): Map<string, HabitLog> {
    const map = new Map<string, HabitLog>()
    for (const [habitId, logs] of logsByHabit) {
      const entry = logs.find((l) => l.date === date)
      if (entry) map.set(habitId, entry)
    }
    return map
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--stoa-text-muted)]">
          ← {t('common.back')}
        </button>
        <h1 className="text-lg font-semibold">{t('habits.catchUpTitle')}</h1>
        <div className="w-10" />
      </div>

      {days.length === 0 ? (
        <EmptyState text={t('habits.catchUpEmpty')} />
      ) : (
        <div className="flex flex-col gap-5">
          {days.map(({ date, habits: pendingHabits }) => {
            const logsThatDate = logsForDate(date)
            return (
              <div key={date} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold text-[var(--stoa-text-muted)] uppercase tracking-wide px-1">
                  {formatHumanDate(date, i18n.language)}
                </h2>
                <div className="flex flex-col gap-3">
                  {pendingHabits.map((habit: Habit) => {
                    const blockedBy = unmetDependencyNames(habit, habits, logsThatDate)
                    return (
                      <div key={habit.id} className="flex flex-col gap-2">
                        <MinimalListRow
                          variant="flat"
                          badge={<HabitCategoryBadge habit={habit} />}
                          title={habit.name}
                          subtitle={blockedBy.length > 0 ? t('habits.blockedByLabel', { names: blockedBy.join(', ') }) : undefined}
                        />
                        {blockedBy.length === 0 && (
                          <div className="pl-12 flex gap-2">
                            <Button variant="secondary" className="flex-1" onClick={() => logHabit(habit.id, date, 'done')}>
                              {t('habits.markDone')}
                            </Button>
                            <Button variant="secondary" className="flex-1" onClick={() => logHabit(habit.id, date, 'not_done')}>
                              {t('habits.markNotDone')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
