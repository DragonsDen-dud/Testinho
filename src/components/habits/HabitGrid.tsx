import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Habit, HabitLog, LifeDomain } from '../../db/types'
import { HabitTile } from './HabitTile'
import { QuickValueSheet } from './QuickValueSheet'
import { HabitQuickActions } from './HabitQuickActions'
import { SegmentedTabs } from '../ui/SegmentedTabs'
import { EmptyState } from '../ui/EmptyState'
import { DomainFilter } from './DomainFilter'
import { logHabit, clearHabitLog } from '../../data/habits'
import { showUndoToast } from '../../state/toast'
import { unmetDependencyNames } from '../../lib/habitDependencies'
import { todayKey, formatHumanDate } from '../../lib/date'
import { haptic } from '../../lib/haptics'
import { readUiPref, writeUiPref, GRID_TAB_PREF } from '../../lib/uiPrefs'
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
 *
 * NOW DATE-AWARE. `date` used to be hard-coded to today. It is a prop so the
 * day strip above can point the whole grid at any recent day — reviewing and
 * backfilling yesterday is then the same screen and the same gestures as
 * doing today, rather than a separate catch-up page. Every write below
 * routes through `date`, so nothing silently logs against today while you
 * are looking at Thursday.
 */
export function HabitGrid({
  habits,
  logsToday,
  logsByHabit,
  atRiskHabitId,
  atRiskLabel,
  domains,
  date = todayKey(),
  onOpenHistory,
  onEditHabit,
  onCreateHabit,
  onLogged,
}: {
  /** Already filtered to what this screen should show (e.g. scheduled). */
  habits: Habit[]
  /** Logs for `date`, keyed by habit id. */
  logsToday: Map<string, HabitLog>
  /** Full history per habit, for streaks and the 7-day strip. */
  logsByHabit: Map<string, HabitLog[]>
  /** STOA-4's at-risk surfacing, carried into the grid: the flagged habit
   * sorts first in "to do" and its tile carries the reason. Dropping it
   * with the list would have quietly removed a shipped feature. */
  atRiskHabitId?: string
  atRiskLabel?: string
  /** For the domain filter chips. Omitted → no filter row. */
  domains?: LifeDomain[]
  /** The day the grid is showing. Defaults to today. */
  date?: string
  onOpenHistory: (habit: Habit) => void
  onEditHabit?: (habit: Habit) => void
  onCreateHabit?: () => void
  /** Fired after an explicit completion, so the page can run its
   * post-completion mood prompt exactly as before. */
  onLogged?: (habitId: string) => void
}) {
  const { t, i18n } = useTranslation()
  const isToday = date === todayKey()
  const [tab, setTab] = useState<HabitGridTab>(() =>
    readUiPref(GRID_TAB_PREF, false) ? 'done' : 'todo',
  )
  const [valueEntryFor, setValueEntryFor] = useState<Habit | null>(null)
  const [quickActionsFor, setQuickActionsFor] = useState<Habit | null>(null)
  const [domainId, setDomainId] = useState<string | null>(null)

  const visible = domainId ? habits.filter((h) => h.domainId === domainId) : habits

  const notDone = visible
    .filter((h) => logsToday.get(h.id)?.status !== 'done')
    .sort((a, b) => Number(b.id === atRiskHabitId) - Number(a.id === atRiskHabitId))
  const done = visible.filter((h) => logsToday.get(h.id)?.status === 'done')

  // Land on whichever tab has something in it, but only as an initial
  // default — never fight an explicit choice. `hasChosen` latches on the
  // first real interaction, and the choice is remembered per device so the
  // grid opens where you left it.
  const [hasChosen, setHasChosen] = useState(() => readUiPref(GRID_TAB_PREF, false))
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
    haptic('tap')
    if (current?.status === 'done') {
      await logHabit(habit.id, date, 'not_done')
      return
    }
    await logHabit(habit.id, date, 'done')
    // An accidental tap on a 176px target is a real possibility, and the
    // habit immediately leaves the "to do" tab — so without this the way
    // back is "switch tabs, find it, tap again". Undo restores the exact
    // prior state, including "there was no log at all", which re-tapping
    // does not (that would leave an explicit not_done behind).
    showUndoToast(t('habits.checkedInToast', { name: habit.name }), () => {
      haptic('undo')
      void (current ? logHabit(habit.id, date, current.status) : clearHabitLog(habit.id, date))
    })
    onLogged?.(habit.id)
  }

  return (
    <div className="flex flex-col gap-3">
      {domains && domains.length > 1 && (
        <DomainFilter domains={domains} habits={habits} value={domainId} onChange={setDomainId} />
      )}

      <SegmentedTabs
        value={effectiveTab}
        onChange={(k) => {
          setHasChosen(true)
          writeUiPref(GRID_TAB_PREF, k === 'done')
          setTab(k as HabitGridTab)
        }}
        tabs={[
          { key: 'todo', label: t('habits.tabTodo'), count: notDone.length },
          { key: 'done', label: t('habits.tabDone'), count: done.length },
        ]}
      />

      {/* Viewing a past day is a mode, and a mode needs to announce itself —
          otherwise a check-in lands on a day the user didn't mean. */}
      {!isToday && (
        <p className="text-xs text-[var(--stoa-accent)] px-1">
          {t('habits.viewingDay', { date: formatHumanDate(date, i18n.language) })}
        </p>
      )}

      {shown.length === 0 ? (
        <EmptyState
          text={
            habits.length === 0
              ? t('habits.empty')
              : effectiveTab === 'todo'
                ? t('habits.gridAllDone')
                : t('habits.gridNoneDone')
          }
          action={
            habits.length === 0 && onCreateHabit
              ? { label: t('habits.emptyCta'), onClick: onCreateHabit }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {shown.map((habit) => (
            <HabitTile
              key={habit.id}
              habit={habit}
              todayLog={logsToday.get(habit.id)}
              logs={logsByHabit.get(habit.id) ?? []}
              date={date}
              blocked={unmetDependencyNames(habit, habits, logsToday).join(', ') || undefined}
              atRiskNote={habit.id === atRiskHabitId && effectiveTab === 'todo' ? atRiskLabel : undefined}
              onToggle={() => void toggle(habit)}
              onOpenHistory={() => onOpenHistory(habit)}
              onLongPress={() => {
                haptic('tap')
                setQuickActionsFor(habit)
              }}
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

      {quickActionsFor && (
        <HabitQuickActions
          habit={quickActionsFor}
          date={date}
          log={logsToday.get(quickActionsFor.id)}
          onClose={() => setQuickActionsFor(null)}
          onOpenHistory={() => {
            const habit = quickActionsFor
            setQuickActionsFor(null)
            onOpenHistory(habit)
          }}
          onEdit={() => {
            const habit = quickActionsFor
            setQuickActionsFor(null)
            onEditHabit?.(habit)
          }}
        />
      )}
    </div>
  )
}
