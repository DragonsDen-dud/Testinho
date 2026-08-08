import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Habit, HabitLog } from '../../db/types'
import { HabitTile } from './HabitTile'
import { QuickValueSheet } from './QuickValueSheet'
import { SegmentedTabs } from '../ui/SegmentedTabs'
import { EmptyState } from '../ui/EmptyState'
import { logHabit } from '../../data/habits'
import { unmetDependencyNames } from '../../lib/habitDependencies'
import { todayKey } from '../../lib/date'
import { resolveGridTab, type HabitGridTab } from '../../lib/habitGridTabs'

/**
 * The habit grid — two columns of tiles, split into "to do" and "done" by a
 * segmented control.
 *
 * Shared by Today and the Habits tab deliberately: they show the same
 * things, and leaving one as a list while the other became a grid would
 * read as an unfinished redesign rather than a decision.
 *
 * WHY TABS RATHER THAN TWO STACKED SECTIONS. The previous layout put
 * remaining habits in a list and completed ones in a tray below it, so on a
 * day with several habits the completed set was off-screen and the
 * remaining set was already scrolling. Two tabs over one grid keeps either
 * view to a single screen, which is the whole reason to use tiles at all.
 * "To do" is the default because that is what the screen is for; it flips
 * to "Done" only when nothing is left, so an all-clear day shows the day's
 * work rather than an empty panel.
 */
export function HabitGrid({
  habits,
  logsToday,
  logsByHabit,
  atRiskHabitId,
  atRiskLabel,
  onOpenHistory,
  onLogged,
}: {
  /** Already filtered to what this screen should show (e.g. scheduled today). */
  habits: Habit[]
  logsToday: Map<string, HabitLog>
  /** Full history per habit, for streaks and the 7-day strip. */
  logsByHabit: Map<string, HabitLog[]>
  /** STOA-4's at-risk surfacing, carried into the grid: the flagged habit
   * sorts first in "to do" and its tile carries the reason. Dropping it
   * with the list would have quietly removed a shipped feature. */
  atRiskHabitId?: string
  atRiskLabel?: string
  onOpenHistory: (habit: Habit) => void
  /** Fired after an explicit completion, so the page can run its
   * post-completion mood prompt exactly as before. */
  onLogged?: (habitId: string) => void
}) {
  const { t } = useTranslation()
  const date = todayKey()
  const [tab, setTab] = useState<HabitGridTab>('todo')
  const [valueEntryFor, setValueEntryFor] = useState<Habit | null>(null)

  const notDone = habits
    .filter((h) => logsToday.get(h.id)?.status !== 'done')
    .sort((a, b) => Number(b.id === atRiskHabitId) - Number(a.id === atRiskHabitId))
  const done = habits.filter((h) => logsToday.get(h.id)?.status === 'done')

  // Land on whichever tab has something in it, but only as an initial
  // default — never fight an explicit choice. `hasChosen` latches on the
  // first real interaction.
  const [hasChosen, setHasChosen] = useState(false)
  const effectiveTab = resolveGridTab({
    notDoneCount: notDone.length,
    doneCount: done.length,
    hasChosen,
    chosen: tab,
  })
  const shown = effectiveTab === 'todo' ? notDone : done

  async function toggle(habit: Habit) {
    const current = logsToday.get(habit.id)
    // Measurable habits keep their count: a tap opens value entry rather
    // than writing a bare "done", so a push-up habit still records how many.
    if (habit.measurable) {
      setValueEntryFor(habit)
      return
    }
    if (current?.status === 'done') {
      await logHabit(habit.id, date, 'not_done')
      return
    }
    await logHabit(habit.id, date, 'done')
    onLogged?.(habit.id)
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedTabs
        value={effectiveTab}
        onChange={(k) => {
          setHasChosen(true)
          setTab(k as HabitGridTab)
        }}
        tabs={[
          { key: 'todo', label: t('habits.tabTodo'), count: notDone.length },
          { key: 'done', label: t('habits.tabDone'), count: done.length },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState text={effectiveTab === 'todo' ? t('habits.gridAllDone') : t('habits.gridNoneDone')} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {shown.map((habit) => (
            <HabitTile
              key={habit.id}
              habit={habit}
              todayLog={logsToday.get(habit.id)}
              logs={logsByHabit.get(habit.id) ?? []}
              blocked={unmetDependencyNames(habit, habits, logsToday).join(', ') || undefined}
              atRiskNote={habit.id === atRiskHabitId && effectiveTab === 'todo' ? atRiskLabel : undefined}
              onToggle={() => void toggle(habit)}
              onOpenHistory={() => onOpenHistory(habit)}
            />
          ))}
        </div>
      )}

      {valueEntryFor && (
        <QuickValueSheet
          habit={valueEntryFor}
          date={date}
          currentTotal={(logsToday.get(valueEntryFor.id)?.entries ?? []).reduce((s, e) => s + e.value, 0)}
          onClose={() => setValueEntryFor(null)}
          onSaved={() => {
            onLogged?.(valueEntryFor.id)
            setValueEntryFor(null)
          }}
        />
      )}
    </div>
  )
}
