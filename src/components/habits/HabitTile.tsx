import { useTranslation } from 'react-i18next'
import { Check, History, SkipForward, StickyNote, TrendingDown } from 'lucide-react'
import { useLongPress } from '../../lib/useLongPress'
import type { Habit, HabitLog } from '../../db/types'
import { HabitVisual } from './HabitVisual'
import { useBlobUrl } from '../../lib/useBlobUrl'
import { resolveHabitDomainStyle } from './HabitCategoryBadge'
import { useDomains } from '../../state/useDomains'
import { useCategoryStyleMap } from '../../state/useCategoryStyles'
import { computeHabitDayInfo, isSuccessfulDay } from '../../lib/habitDayState'
import { computeBuildStreak, computeAvoidStreak } from '../../lib/habitStrength'
import { accessibleTextColor, gradientFromColor } from '../../styles/tokens'
import { addDays, todayKey } from '../../lib/date'

/** How many trailing days the mini strip shows. Seven reads as "this week"
 * without needing a label, and fits the tile width at a legible dot size. */
const STRIP_DAYS = 7

/**
 * One habit, as a big tile in the Today/Habits grid.
 *
 * REPLACES THE LIST ROW. Reference point is Streaks — the Apple Design
 * Award winner already cited in this project's earlier briefs — where the
 * whole day is a grid of large tap targets that fill in as you complete
 * them, rather than a scrolling list of rows with buttons. What that buys,
 * concretely: the day fits on one screen, completion is one tap anywhere on
 * a ~170px target instead of a precise hit on a small button, and progress
 * is legible from across the room. STOA's own language supplies the rest —
 * the habit's gradient (STOA-7), its drawn icon (STOA-8), Manrope/Unbounded
 * type (STOA-7).
 *
 * THE WHOLE TILE IS THE CHECK-IN. Tapping the body logs the day; tapping it
 * again undoes it. That keeps the Fogg ability constraint this project has
 * held since STOA-4 (completion stays a sub-5-second, one-tap action) while
 * making the target roughly 25× larger than the old row button.
 *
 * HISTORY IS THE ONE COMPETING ACTION, so it gets its own explicit corner
 * button rather than sharing the tap. It opens the detail sheet with the
 * contribution heatmap — the "control the history more easily" ask — and
 * the tile additionally carries a 7-day strip so the recent past is visible
 * without opening anything at all.
 *
 * Article 6: the tile shows what happened (streak count, recent days). No
 * points, no score, no reward for completing — the visual change on
 * completion is state feedback, the same category as the existing tray.
 */
export function HabitTile({
  habit,
  todayLog,
  logs,
  onToggle,
  onOpenHistory,
  onLongPress,
  date = todayKey(),
  blocked,
  atRiskNote,
}: {
  habit: Habit
  todayLog: HabitLog | undefined
  /** This habit's full log history — used for the streak and the strip. */
  logs: HabitLog[]
  /** Fired on a body tap. The parent owns the actual write so measurable
   * habits can divert to a value entry instead of a plain toggle. */
  onToggle: () => void
  onOpenHistory: () => void
  /** Press-and-hold — opens the quick-actions sheet. Optional so the tile
   * still works anywhere that doesn't offer them. */
  onLongPress?: () => void
  /** The day this tile represents. Defaults to today; the grid passes the
   * day strip's selection so the strip and the streak agree. */
  date?: string
  /** Article 25 — an unmet dependency disables the check-in, with a reason. */
  blocked?: string
  /** STOA-4's at-risk statement, shown as a plain fact on the tile. Article
   * 6: a description of what happened, never a score or a penalty. */
  atRiskNote?: string
}) {
  const { t } = useTranslation()
  const domains = useDomains(habit.spaceId)
  const styleMap = useCategoryStyleMap()
  const style = resolveHabitDomainStyle(habit.domainId, domains, styleMap)
  const color = style.color

  const done = todayLog?.status === 'done'
  const skipped = todayLog?.status === 'skip'
  const hasNote = !!todayLog?.note?.trim()
  const ink = accessibleTextColor(color)
  const press = useLongPress(() => onLongPress?.(), onToggle)

  // A photo the user chose earns the whole tile rather than a 46px plate:
  // it is the most specific thing they could have said about this habit,
  // and at plate size a photo is unrecognisable anyway. Emoji and drawn
  // icons keep the plate — they are symbols, and a full-bleed symbol is
  // just a large symbol.
  const photoUrl = useBlobUrl(habit.image)
  const photoTile = !!photoUrl

  // On a photo tile everything sits on a dark scrim, so the ink is white
  // regardless of done-ness — the habit's own contrast pair only applies
  // when the habit's own colour is what's behind the text.
  const textInk = photoTile ? '#ffffff' : done ? ink : 'var(--stoa-text)'
  const mutedInk = photoTile ? 'rgba(255,255,255,0.82)' : done ? ink : 'var(--stoa-text-muted)'
  const markInk = photoTile ? '#ffffff' : ink

  const streak = habit.habitType === 'build' ? computeBuildStreak(habit, logs, date) : computeAvoidStreak(habit, logs, date)

  // Measurable habits keep their count (Denys's explicit call) — the tile
  // shows progress toward the target instead of a bare check.
  const target = habit.measurable?.targetValue
  const loggedValue = (todayLog?.entries ?? []).reduce((sum, e) => sum + e.value, 0)

  const logsByDate = new Map(logs.map((l) => [l.date, l]))
  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => {
    const d = addDays(date, -(STRIP_DAYS - 1 - i))
    return { date: d, info: computeHabitDayInfo(habit, logsByDate.get(d), d, date) }
  })

  return (
    <div
      className="relative rounded-[26px] overflow-hidden transition-transform duration-150"
      style={{
        // Done tiles carry the habit's full gradient; not-done tiles carry a
        // low-alpha wash of the same hue over the surface, so the grid reads
        // as one colourful family in both states rather than "colour = done".
        backgroundImage: done && !photoTile ? gradientFromColor(color) : undefined,
        backgroundColor: photoTile ? '#000' : done ? color : 'var(--stoa-surface)',
        // No border at all on a photo tile: a 1px transparent border would
        // let the black backdrop show as a hairline outside the image.
        border: photoTile ? 'none' : done ? '1px solid transparent' : '1px solid var(--stoa-border)',
      }}
    >
      {photoTile && (
        <>
          <img
            src={photoUrl}
            alt=""
            draggable={false}
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            // A done photo tile stays full-colour and gains the habit's hue
            // as a wash (below); a not-done one is desaturated and dimmed,
            // so "done" is still legible at a glance across the grid
            // without the photo having to disappear.
            // Desaturated rather than dimmed for the not-done state: the
            // scrim already supplies the darkening the text needs, so
            // subtracting brightness on top of it only made the picture
            // muddy without making "done" any clearer.
            style={{ filter: done ? 'saturate(1.05)' : 'saturate(0.7)' }}
          />
          {done && (
            <span aria-hidden className="absolute inset-0 pointer-events-none mix-blend-multiply" style={{ background: color, opacity: 0.45 }} />
          )}
          {/* The scrim is what makes arbitrary user photos safe to put text
              on. Bottom-weighted, because that is where the name and meta
              line sit; the top stays clear so the picture is still visible. */}
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 42%, rgba(0,0,0,0.12) 72%, rgba(0,0,0,0.28) 100%)' }}
          />
        </>
      )}

      {!done && !photoTile && (
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: color, opacity: 0.09 }}
        />
      )}

      <button
        type="button"
        {...press}
        disabled={!!blocked}
        aria-pressed={done}
        aria-label={habit.name}
        // Stops iOS raising its text-selection callout on a hold, which
        // otherwise fights the long-press gesture on the tile's own label.
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        // Slightly tighter horizontal padding than vertical: every pixel
        // taken off the sides goes straight into the name's measure, which
        // is the one thing on a two-up tile that actually runs out of room.
        className="relative w-full text-left px-3 pt-3.5 pb-3 flex flex-col gap-2.5 min-h-[172px] active:scale-[0.97] transition-transform duration-150 disabled:opacity-55 disabled:pointer-events-none"
      >
        {/* The icon gets real room — it's the tile's anchor, not a
            decoration beside a label. The completion check rides its
            corner rather than the tile's, which is already occupied by the
            history button. */}
        <span
          className="relative inline-flex shrink-0"
          // On a photo tile the plate would be a thumbnail of the picture
          // already filling the tile. The corner badge still needs an
          // anchor, so the box stays and only the art inside it goes.
          style={{ width: photoTile ? 22 : 46, height: photoTile ? 22 : 46 }}
        >
          {/* On a done tile the badge INVERTS — ink plate, hue glyph —
              rather than tinting the tile's own colour, which the first
              render showed reading as a barely-visible smudge. The
              inversion is contrast-safe for free: accessibleTextColor
              already guarantees ≥4.5:1 between `ink` and `color`, and
              swapping which one is the background doesn't change a
              contrast ratio. */}
          {!photoTile && (
            <HabitVisual habit={habit} fallbackIcon={style.icon} color={color} size={46} inverted={done} />
          )}
          {/* One corner badge, three possible meanings. Skip gets its own
              glyph rather than being drawn as "not done", because a skipped
              day is deliberately not a miss (computeHabitDayInfo agrees) and
              the tile must not imply otherwise. */}
          {(done || skipped) && (
            <span
              aria-hidden
              className="absolute inline-flex items-center justify-center rounded-full stoa-pop-in"
              style={{
                width: 22,
                height: 22,
                right: -6,
                bottom: -6,
                background: done ? markInk : photoTile ? '#ffffff' : 'var(--stoa-text-muted)',
              }}
            >
              {done ? (
                <Check size={13} strokeWidth={3.5} color={color} />
              ) : (
                <SkipForward size={11} strokeWidth={3} color="var(--stoa-bg)" />
              )}
            </span>
          )}
        </span>

        {/* On a photo tile the text block moves to the BOTTOM, where the
            scrim is densest. Sitting at the top it overlapped the brightest
            part of the picture and had to fight it — the standard fix for
            text-over-photography is to put the text where the darkening is,
            not to darken everything. */}
        {photoTile && <span aria-hidden className="flex-1" />}
        <div className={photoTile ? 'min-w-0' : 'flex-1 min-w-0'}>
          <div
            // break-words so a long single-word habit name wraps instead
            // of running out past the tile's rounded edge.
            className="font-heading text-[15px] leading-tight line-clamp-2 break-words"
            style={{ color: textInk, textShadow: photoTile ? '0 1px 3px rgba(0,0,0,0.55)' : undefined }}
          >
            {habit.name}
          </div>
          <div
            className="text-[11px] mt-1 tabular-nums flex items-center gap-1"
            style={{ color: mutedInk, opacity: done && !photoTile ? 0.72 : 1 }}
          >
            <span className="min-w-0 truncate">
              {blocked
                ? t('habits.blockedByLabel', { names: blocked })
                : skipped
                  ? t('habits.skippedLabel')
                  : target !== undefined
                    ? `${loggedValue} / ${target} ${habit.measurable?.unit ?? ''}`.trim()
                    : habit.habitType === 'avoid'
                      ? t('habits.daysCleanLabel', { count: streak })
                      : t('habits.streakLabel', { count: streak })}
            </span>
            {/* A note is invisible otherwise — it lives inside the log and
                only the day editor ever showed it. A 10px glyph is enough
                to answer "did I write something about this?". */}
            {hasNote && <StickyNote size={10} strokeWidth={2} aria-hidden className="shrink-0 opacity-70" />}
          </div>
        </div>

        {atRiskNote && !done && (
          <div className="flex items-center gap-1 text-[10px] text-[var(--stoa-danger)] leading-tight">
            <TrendingDown size={11} strokeWidth={2} aria-hidden className="shrink-0" />
            <span className="line-clamp-2">{atRiskNote}</span>
          </div>
        )}

        {/* Seven-day strip — recent history without opening anything. */}
        <div className="flex items-center gap-1" aria-hidden>
          {strip.map((day) => {
            const success = isSuccessfulDay(day.info.state)
            const inactive = day.info.state === 'inactive'
            return (
              <span
                key={day.date}
                className="flex-1 rounded-full"
                style={{
                  height: 5,
                  background: photoTile
                    ? '#ffffff'
                    : done
                      ? ink
                      : success
                        ? color
                        : 'var(--stoa-text-muted)',
                  opacity: inactive ? 0.15 : success ? (done ? 0.9 : 1) : 0.22,
                }}
              />
            )
          })}
        </div>
      </button>

      {/* History sits outside the check-in button so the two actions can
          never be confused for one another. */}
      <button
        type="button"
        onClick={onOpenHistory}
        aria-label={t('habits.openHistory', { name: habit.name })}
        className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{ color: mutedInk, opacity: photoTile ? 0.95 : done ? 0.75 : 0.8 }}
      >
        <History size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
