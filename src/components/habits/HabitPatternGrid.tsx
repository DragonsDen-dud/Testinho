import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import * as LucideIcons from 'lucide-react'
import { Folder, type LucideIcon } from 'lucide-react'
import type { Habit } from '../../db/types'
import { useHabitLogs } from '../../state/useHabits'
import { useDomains } from '../../state/useDomains'
import { useCategoryStyleMap } from '../../state/useCategoryStyles'
import { resolveHabitDomainStyle } from './HabitCategoryBadge'
import { HabitDayEditor } from './HabitDayEditor'
import { computeHabitDayInfo, isSuccessfulDay, type HabitDayState } from '../../lib/habitDayState'
import { todayKey, addDays, weekdayOf, weekBoundsOf, monthBoundsOf, formatWeekdayShort } from '../../lib/date'
import { accessibleTextColor } from '../../styles/tokens'

function datesInWeek(today: string): string[] {
  const { start } = weekBoundsOf(today)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

function datesInMonth(today: string): string[] {
  const { start, end } = monthBoundsOf(today)
  const dates: string[] = []
  let cursor = start
  while (cursor <= end) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

/** Blank leading cells so day 1 lands under its real weekday, Monday-start. */
function leadingBlanksInMonth(today: string): number {
  const { start } = monthBoundsOf(today)
  const dow = weekdayOf(start) // 0=Sun..6=Sat
  return dow === 0 ? 6 : dow - 1
}

function weekdayHeaderLabels(locale: string): string[] {
  const { start } = weekBoundsOf(todayKey())
  return Array.from({ length: 7 }, (_, i) => formatWeekdayShort(addDays(start, i), locale))
}

/**
 * Tap-any-day completion pattern, reached from HabitDetailSheet — the
 * generalization Denys asked for after the black-screen fix: a 7-day strip
 * by default (current calendar week, Mon-Sun), expandable to the current
 * month, using the habit's own real badge color+icon (never a hardcoded
 * hue) so a done day reads as "that habit's own icon, filled in" rather
 * than a generic checkmark. Tapping any non-inactive day (including an
 * already-logged one, to allow correcting it) opens an inline editor for
 * that specific date — Done/Not done/Skip for a plain habit, or a number
 * entry for a measurable one, calling the exact same logHabit/
 * logMeasurableEntry functions the Habits tab and Catch-up already use, so
 * a backdated log here recalculates streaks identically to any other path.
 *
 * This is the fix for the gap Denys hit where Catch-up couldn't restore a
 * measurable habit's lost values (it deliberately excludes measurable
 * habits — see habitCatchUp.ts): here, a measurable day gets the same
 * number-entry affordance a plain habit gets Done/Not done, for any day in
 * the visible week/month, not just Catch-up's 7-day pending window.
 *
 * Deliberately no prev/next month navigation this round — only the current
 * month is reachable via "Show month". Restoring data further back than
 * that isn't possible from this screen yet; flagged as a known limitation,
 * not an oversight.
 */
export function HabitPatternGrid({ habit, allHabits }: { habit: Habit; allHabits: Habit[] }) {
  const { t, i18n } = useTranslation()
  const domains = useDomains(habit.spaceId)
  const styleMap = useCategoryStyleMap()
  const domainStyle = resolveHabitDomainStyle(habit.domainId, domains, styleMap)
  const icon = habit.icon ?? domainStyle.icon

  const logs = useHabitLogs(habit.id)
  const logsByDate = new Map(logs.map((l) => [l.date, l]))
  const today = todayKey()

  const [expanded, setExpanded] = useState(false)
  const [editingDate, setEditingDate] = useState<string | null>(null)

  const dates = expanded ? datesInMonth(today) : datesInWeek(today)
  const editingLog = editingDate ? logsByDate.get(editingDate) : undefined

  function toggleDate(date: string) {
    setEditingDate((prev) => (prev === date ? null : date))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--stoa-text-muted)] uppercase tracking-wide">
          {expanded ? t('habits.patternMonthLabel') : t('habits.patternWeekLabel')}
        </span>
        <button
          type="button"
          className="text-xs font-medium underline underline-offset-2 text-[var(--stoa-text-muted)]"
          onClick={() => {
            setExpanded((e) => !e)
            setEditingDate(null)
          }}
        >
          {expanded ? t('habits.patternShowWeek') : t('habits.patternShowMonth')}
        </button>
      </div>

      {expanded && (
        <div className="grid grid-cols-7 gap-1 px-1">
          {weekdayHeaderLabels(i18n.language).map((wd, i) => (
            <span key={i} className="text-[10px] text-center text-[var(--stoa-text-muted)]">
              {wd}
            </span>
          ))}
        </div>
      )}

      <div className={expanded ? 'grid grid-cols-7 gap-y-2 gap-x-1 place-items-center' : 'flex justify-between'}>
        {expanded &&
          Array.from({ length: leadingBlanksInMonth(today) }).map((_, i) => <span key={`blank-${i}`} aria-hidden />)}
        {dates.map((date) => {
          const info = computeHabitDayInfo(habit, logsByDate.get(date), date, today)
          return (
            <DayCircle
              key={date}
              size={expanded ? 30 : 36}
              state={info.state}
              value={info.value}
              color={domainStyle.color}
              icon={icon}
              dayNumber={Number(date.slice(8, 10))}
              label={expanded ? '' : formatWeekdayShort(date, i18n.language)}
              active={editingDate === date}
              onClick={() => toggleDate(date)}
            />
          )
        })}
      </div>

      {/* STOA-5 — the inline day editor moved to HabitDayEditor so this
          grid and the new contribution heatmap share one implementation
          rather than two that drift. Behavior is unchanged. */}
      {editingDate && (
        <HabitDayEditor
          key={editingDate}
          habit={habit}
          allHabits={allHabits}
          date={editingDate}
          log={editingLog}
          onDone={() => setEditingDate(null)}
        />
      )}
    </div>
  )
}

function DayCircle({
  state,
  color,
  icon: iconName,
  value,
  dayNumber,
  label,
  size,
  active,
  onClick,
}: {
  state: HabitDayState
  color: string
  icon: string
  value?: number
  dayNumber: number
  label: string
  size: number
  active: boolean
  onClick: () => void
}) {
  const Icon: LucideIcon = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName] ?? Folder
  // Article 14/27 — 'clean' (an avoid habit's day with no slip recorded)
  // fills exactly like 'done', which is what computeAvoidStreak already
  // counts. Before STOA-5 those days rendered as plain missed circles,
  // contradicting the "N days clean" number shown right above this grid.
  const filled = isSuccessfulDay(state)

  const circleStyle: CSSProperties = { width: size, height: size }
  if (filled) {
    circleStyle.background = color
  } else if (state === 'not_done') {
    circleStyle.background = 'var(--stoa-danger-tint)'
    circleStyle.border = '1.5px solid var(--stoa-danger)'
  } else if (state === 'skip') {
    circleStyle.borderStyle = 'dashed'
    circleStyle.borderWidth = 1.5
    circleStyle.borderColor = 'var(--stoa-border)'
  } else if (state === 'pending') {
    circleStyle.border = '1.5px solid var(--stoa-accent)'
  } else if (state === 'missed') {
    circleStyle.border = '1.5px solid var(--stoa-border)'
  } else {
    circleStyle.opacity = 0.35
  }
  if (active) {
    circleStyle.boxShadow = '0 0 0 2px var(--stoa-bg), 0 0 0 4px var(--stoa-accent)'
  }

  const showValue = value !== undefined

  return (
    <button
      type="button"
      disabled={state === 'inactive'}
      onClick={onClick}
      aria-label={String(dayNumber)}
      className="flex flex-col items-center gap-1 shrink-0 disabled:pointer-events-none"
    >
      <span className="relative inline-flex items-center justify-center rounded-full shrink-0" style={circleStyle}>
        {showValue ? (
          <span className="text-[11px] font-semibold" style={{ color: accessibleTextColor(color) }}>
            {value}
          </span>
        ) : filled ? (
          <Icon size={Math.round(size * 0.52)} color={accessibleTextColor(color)} strokeWidth={2} aria-hidden />
        ) : (
          <span className="text-[10px]" style={{ color: 'var(--stoa-text-muted)' }}>
            {dayNumber}
          </span>
        )}
      </span>
      {label && <span className="text-[10px] text-[var(--stoa-text-muted)]">{label}</span>}
    </button>
  )
}
