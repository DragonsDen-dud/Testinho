import { useTranslation } from 'react-i18next'
import type { DayStripDay } from '../../lib/dayStrip'
import { formatWeekdayShort } from '../../lib/date'

/**
 * The trailing week, as one row that does two jobs.
 *
 * READ: each day is a ring whose sweep is that day's completion, so a
 * glance down the row shows the week's shape without opening Analytics.
 * WRITE: tapping a day points the whole grid at it, so catching up on
 * yesterday is one tap on the screen you are already looking at, rather
 * than a trip to the separate catch-up page.
 *
 * WHY A RING RATHER THAN A BAR. Seven bars in a phone row are ~40px wide
 * each, which is too narrow to read a proportion from. A ring reads at any
 * size, and it leaves the middle free for the date number — so the control
 * is simultaneously a calendar and a progress display without stacking two
 * rows.
 *
 * ARTICLE 6. Nothing here is a score. It reports the same done/scheduled
 * the header already prints, per day, and a rest day is drawn as an empty
 * ring with a muted date rather than as a failure — "nothing was scheduled"
 * must never look like "you did nothing".
 */
export function DayStrip({
  days,
  selected,
  onSelect,
  locale,
}: {
  days: DayStripDay[]
  selected: string
  onSelect: (date: string) => void
  locale: string
}) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-1" role="group" aria-label={t('dashboard.dayStripLabel')}>
      {days.map((day) => {
        const isSelected = day.date === selected
        const pct = Math.round(day.ratio * 100)
        const dayNumber = Number(day.date.slice(8, 10))
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            aria-pressed={isSelected}
            aria-label={
              day.restDay
                ? t('dashboard.dayStripRestDay', { date: day.date })
                : t('dashboard.dayStripDay', { date: day.date, done: day.done, total: day.scheduled })
            }
            className="flex-1 min-w-0 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-colors stoa-focusable"
            style={{
              background: isSelected ? 'var(--stoa-surface)' : undefined,
              boxShadow: isSelected ? 'inset 0 0 0 1px var(--stoa-border)' : undefined,
            }}
          >
            <span className="font-heading text-[9px] uppercase text-[var(--stoa-text-muted)] leading-none">
              {formatWeekdayShort(day.date, locale).slice(0, 2)}
            </span>

            {/* conic-gradient rather than an SVG arc: one element, no
                per-day DOM cost, and it animates as a plain background
                change. The inner disc punches the centre out so the ring
                stays a ring at any size. */}
            <span
              aria-hidden
              className="relative inline-flex items-center justify-center rounded-full"
              style={{
                width: 26,
                height: 26,
                background: day.restDay
                  ? 'transparent'
                  : `conic-gradient(var(--stoa-accent) ${pct}%, var(--stoa-border) 0)`,
                boxShadow: day.restDay ? 'inset 0 0 0 1.5px var(--stoa-border)' : undefined,
              }}
            >
              <span
                className="absolute inset-[2.5px] rounded-full flex items-center justify-center"
                style={{ background: isSelected ? 'var(--stoa-surface)' : 'var(--stoa-bg)' }}
              >
                <span
                  className="text-[10px] tabular-nums leading-none"
                  style={{
                    color: day.isToday ? 'var(--stoa-accent)' : 'var(--stoa-text)',
                    fontWeight: day.isToday || isSelected ? 700 : 400,
                    opacity: day.restDay ? 0.45 : 1,
                  }}
                >
                  {dayNumber}
                </span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
