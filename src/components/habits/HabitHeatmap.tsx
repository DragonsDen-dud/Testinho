import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Habit } from '../../db/types'
import { useHabitLogs } from '../../state/useHabits'
import { useDomains } from '../../state/useDomains'
import { useCategoryStyleMap } from '../../state/useCategoryStyles'
import { resolveHabitDomainStyle } from './HabitCategoryBadge'
import { HabitDayEditor } from './HabitDayEditor'
import { buildHabitHeatmap, heatmapWeekCount, type HeatmapCell } from '../../lib/habitHeatmap'
import { isSuccessfulDay } from '../../lib/habitDayState'
import { todayKey, formatHumanDate, formatMonthShort } from '../../lib/date'

const CELL_PX = 13
const CELL_GAP = 3

/**
 * STOA-5 Part C — the HabitKit-style contribution grid, and the visual
 * centerpiece of a habit's detail view.
 *
 * Colored entirely in the habit's *own* resolved category color (via
 * resolveCategoryStyle, same as every other badge in the app) rather than a
 * fixed green ramp: that's what makes months of history read as belonging
 * to this habit, and it's why the palette upgrade in Part A shows up here
 * most strongly. Intensity is opacity over that one hue, so a dense stretch
 * reads as a solid block of the habit's color — the "satisfying blocks of
 * color" the brief asked for — without introducing a second color language.
 *
 * Article 14/27 correctness: a filled cell means "this day went well",
 * which is `done` for a build habit and `done` *or* `clean` (no slip
 * recorded) for an avoid habit. That branch lives in computeHabitDayInfo /
 * isSuccessfulDay, not here, so the grid can't drift from what the streak
 * number beside it counts.
 *
 * Article 6: no totals, no "best month", no records, no milestone
 * treatment. It is a picture of what happened, the same category of output
 * as the week grid it sits above.
 */
export function HabitHeatmap({ habit, allHabits }: { habit: Habit; allHabits: Habit[] }) {
  const { t, i18n } = useTranslation()
  const domains = useDomains(habit.spaceId)
  const styleMap = useCategoryStyleMap()
  const color = resolveHabitDomainStyle(habit.domainId, domains, styleMap).color

  const logs = useHabitLogs(habit.id)
  const today = todayKey()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const weekCount = heatmapWeekCount(habit, today)
  const heatmap = useMemo(() => buildHabitHeatmap(habit, logs, today, weekCount), [habit, logs, today, weekCount])

  // Open on the most recent week, the way a real contribution graph does —
  // the interesting end is the right edge, and starting scrolled left would
  // show an empty pre-history first.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [weekCount])

  const logsByDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs])
  const selectedLog = selectedDate ? logsByDate.get(selectedDate) : undefined

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-heading text-xs text-[var(--stoa-text-muted)] uppercase">
          {t('habits.heatmapTitle')}
        </span>
        <span className="text-[10px] text-[var(--stoa-text-muted)]">
          {t('habits.heatmapRangeWeeks', { count: weekCount })}
        </span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="inline-flex flex-col gap-1 min-w-full">
          {/* Month captions, positioned over the column that opens each
              month — same convention as a GitHub contribution graph. */}
          <div className="relative h-3" style={{ width: heatmap.weeks.length * (CELL_PX + CELL_GAP) }}>
            {heatmap.monthLabels.map((label) => (
              <span
                key={label.month}
                className="absolute top-0 text-[9px] text-[var(--stoa-text-muted)] whitespace-nowrap"
                style={{ left: label.weekIndex * (CELL_PX + CELL_GAP) }}
              >
                {formatMonthShort(`${label.month}-01`, i18n.language)}
              </span>
            ))}
          </div>

          <div className="flex" style={{ gap: CELL_GAP }}>
            {heatmap.weeks.map((week) => (
              <div key={week.startDate} className="flex flex-col" style={{ gap: CELL_GAP }}>
                {week.cells.map((cell) => (
                  <HeatCell
                    key={cell.date}
                    cell={cell}
                    color={color}
                    selected={selectedDate === cell.date}
                    label={cellLabel(cell, t, i18n.language)}
                    onClick={() => setSelectedDate((prev) => (prev === cell.date ? null : cell.date))}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quiet legend — states the encoding rather than scoring it. */}
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--stoa-text-muted)]">
        <span>{t('habits.heatmapLegendLess')}</span>
        {[0, 0.4, 0.7, 1].map((intensity) => (
          <span
            key={intensity}
            aria-hidden
            className="rounded-[3px]"
            style={{ width: 10, height: 10, ...cellPaint(intensity, color, intensity === 0 ? 'missed' : 'done') }}
          />
        ))}
        <span>{t('habits.heatmapLegendMore')}</span>
      </div>

      {selectedDate && (
        <HabitDayEditor
          key={selectedDate}
          habit={habit}
          allHabits={allHabits}
          date={selectedDate}
          log={selectedLog}
          onDone={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}

/** The one place a cell's paint is decided, shared by the grid and the
 * legend so the two can't drift apart. */
function cellPaint(intensity: number, color: string, state: string): CSSProperties {
  if (state === 'inactive') {
    return { background: 'var(--stoa-border)', opacity: 0.25 }
  }
  if (intensity > 0) {
    // Opacity over the habit's own hue — a dense run reads as one solid
    // block of that color, which is the whole point of the grid.
    return { background: color, opacity: 0.25 + intensity * 0.75 }
  }
  if (state === 'not_done') {
    return { background: 'var(--stoa-danger)', opacity: 0.5 }
  }
  if (state === 'skip') {
    return { background: 'transparent', border: '1px dashed var(--stoa-border)' }
  }
  if (state === 'pending') {
    return { background: 'transparent', border: `1px solid ${color}` }
  }
  // 'missed'
  return { background: 'var(--stoa-border)', opacity: 0.55 }
}

function cellLabel(cell: HeatmapCell, t: (key: string) => string, locale: string): string {
  const date = formatHumanDate(cell.date, locale)
  const state = cell.info?.state ?? 'inactive'
  if (state === 'inactive') return date
  const stateKey = isSuccessfulDay(state)
    ? state === 'clean'
      ? 'habits.heatmapStateClean'
      : 'habits.heatmapStateDone'
    : state === 'not_done'
      ? 'habits.heatmapStateNotDone'
      : state === 'skip'
        ? 'habits.heatmapStateSkip'
        : state === 'pending'
          ? 'habits.heatmapStatePending'
          : 'habits.heatmapStateMissed'
  return `${date} — ${t(stateKey)}`
}

function HeatCell({
  cell,
  color,
  selected,
  label,
  onClick,
}: {
  cell: HeatmapCell
  color: string
  selected: boolean
  label: string
  onClick: () => void
}) {
  const state = cell.info?.state ?? 'inactive'
  const style: CSSProperties = {
    width: CELL_PX,
    height: CELL_PX,
    ...cellPaint(cell.intensity, color, state),
  }
  if (selected) {
    style.boxShadow = '0 0 0 1.5px var(--stoa-bg), 0 0 0 3px var(--stoa-accent)'
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={state === 'inactive'}
      onClick={onClick}
      className="rounded-[3px] shrink-0 disabled:pointer-events-none transition-transform duration-100 active:scale-90"
      style={style}
    />
  )
}
