import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Sun, MoonStar, Check } from 'lucide-react'
import { useAppSettings, updateAppSettings } from '../state/useAppSettings'
import { useSpaces } from '../state/useSpaces'
import { useHabitsQuery, useLogsForDate, useHabitLogsForHabits } from '../state/useHabits'
import { useDomains } from '../state/useDomains'
import { useOpenTodosToday, useDoneTodosToday } from '../state/useTodos'
import { useConnectivity } from '../state/useConnectivity'
import { HabitGrid } from '../components/habits/HabitGrid'
import { HabitGridSkeleton } from '../components/habits/HabitGridSkeleton'
import { DayStrip } from '../components/habits/DayStrip'
import { JustCompletedMoodPrompt } from '../components/habits/JustCompletedMoodPrompt'
import { MorningBriefCard } from '../components/dailybrief/MorningBriefCard'
import { EveningReviewCard } from '../components/dailybrief/EveningReviewCard'
import { EveningReviewSheet } from '../components/dailybrief/EveningReviewSheet'
import { useEveningReview } from '../state/useEveningReview'
import { isEveningReviewEmpty } from '../data/eveningReviews'
import { isEveningPromptTime } from '../lib/eveningPrompt'
import { ConnectedTaskCard } from '../components/todos/redesign/ConnectedTaskCard'
import { CompletedTaskBubble } from '../components/dashboard/CompletedTaskBubble'
import { ConnectivityPanel } from '../components/dashboard/ConnectivityPanel'
import { SectionHeader } from '../components/ui/SectionHeader'
import { BackupReminderBanner } from '../components/dashboard/BackupReminderBanner'
import { isScheduledOnDate, computeBuildStreak, computeAvoidStreak } from '../lib/habitStrength'
import { shouldShowOverdueBanner } from '../lib/overdueBanner'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { isBackupReminderDue } from '../lib/backupReminder'
import { isTasksPlanningEnabled } from '../lib/featureFlags'
import { computeAtRiskHabit } from '../lib/habitAtRisk'
import { buildDayStrip } from '../lib/dayStrip'
import { todayKey, addDays } from '../lib/date'


/**
 * STOA-7 — one hero stat tile. A translucent card that lets the mesh show
 * through rather than a solid surface, which is what keeps the header
 * reading as one field of colour instead of three panels sitting on it.
 */
function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-[var(--stoa-border)]/60 bg-[var(--stoa-surface)]/35 px-2.5 py-2.5 backdrop-blur-[2px]">
      <div className="font-display text-xl leading-none text-[var(--stoa-text)] tabular-nums truncate">{value}</div>
      <div className="font-heading text-[10px] uppercase text-[var(--stoa-text-muted)] mt-1 truncate">{label}</div>
    </div>
  )
}

/**
 * The day's completion as one slim bar under the hero stats.
 *
 * Article 6 check, because a progress bar is exactly the kind of thing that
 * round could go wrong: this is a state display of a fact already on the
 * screen — the same done/total the HABITS tile prints — rendered as a
 * length instead of a number. There is no target to beat, nothing is
 * awarded at 100%, it doesn't persist, and it says nothing about yesterday.
 * That puts it in the same category as the tile's own "2/9" and the 7-day
 * strip on every habit tile, not in the category of points or rewards.
 *
 * It earns its place by making the hero legible at a glance rather than
 * read: the number tells you where you are, the bar tells you how far that
 * is, and the pairing is what makes a header feel designed rather than
 * assembled.
 */
function DayProgress({ done, total }: { done: number; total: number }) {
  // Nothing to show a proportion of. A full-width empty track under "0/0"
  // would read as a broken component.
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  return (
    <div
      className="mt-3 h-[5px] rounded-full overflow-hidden bg-[var(--stoa-surface)]/60 border border-[var(--stoa-border)]/40"
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div
        className="h-full rounded-full bg-[var(--stoa-accent)] transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/**
 * A permanent way into the Evening Review sheet, for today and for tomorrow.
 *
 * WHY THIS EXISTS. STOA-6 shipped the review as a timed prompt only: the
 * EveningReviewCard appears from 17:00 and plans tomorrow, and the Morning
 * Brief renders only if a review for today already exists. So before 17:00
 * there was no way to reach the feature at all, and no way to write a
 * review *for today* under any circumstance — which meant the Brief was
 * effectively untestable unless you happened to have planned the night
 * before. These two chips make both days reachable at any hour.
 *
 * They read as facts, not nudges (Article 19): the label says which day,
 * and a check appears once that day actually has a plan. No count, no
 * streak, no prompting to fill the empty one.
 */
function PlanChip({
  icon: Icon,
  label,
  planned,
  onClick,
}: {
  icon: typeof Sun
  label: string
  planned: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // px-2.5/gap-1.5 rather than px-3/gap-2: at 320px the labels were
      // truncating by 4–5px ("Today's p…"), and this buys 8px back without
      // being perceptible at 390px. Measured, not guessed — see the round's
      // width sweep.
      className="flex-1 min-w-0 rounded-2xl border border-[var(--stoa-border)]/60 bg-[var(--stoa-surface)]/35 px-2.5 py-2.5 backdrop-blur-[2px] flex items-center gap-1.5 active:scale-[0.97] transition-transform"
    >
      <Icon size={15} strokeWidth={2} aria-hidden className="shrink-0 text-[var(--stoa-text-muted)]" />
      <span className="flex-1 min-w-0 text-left text-xs font-medium text-[var(--stoa-text)] truncate">{label}</span>
      {planned && <Check size={14} strokeWidth={2.5} aria-hidden className="shrink-0 text-[var(--stoa-accent)]" />}
    </button>
  )
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const spaces = useSpaces()
  const activeSpace = spaces.find((s) => s.id === settings?.activeSpaceId)
  const { habits: allHabits, loaded: habitsLoaded } = useHabitsQuery(settings?.activeSpaceId)
  const domains = useDomains(settings?.activeSpaceId)
  const date = todayKey()
  const todaysHabits = allHabits.filter((h) => isScheduledOnDate(h, date))
  // Fetched for all habits, not just today's — a dependency can point at a
  // habit that isn't itself scheduled today, and its completion still needs
  // to resolve correctly (Article 25).
  const logsToday = useLogsForDate(
    allHabits.map((h) => h.id),
    date,
  )
  // The day the grid is pointed at. Today unless the strip says otherwise —
  // and it resets to today on remount, so a stale selection can never
  // survive into a new session and silently log against the wrong day.
  const [selectedDate, setSelectedDate] = useState(date)
  const logsSelected = useLogsForDate(
    allHabits.map((h) => h.id),
    selectedDate,
  )
  const selectedHabits = allHabits.filter((h) => isScheduledOnDate(h, selectedDate))
  const [justCompletedTaskIds, setJustCompletedTaskIds] = useState<Set<string>>(new Set())
  const notDoneHabits = todaysHabits.filter((h) => logsToday.get(h.id)?.status !== 'done')
  const doneHabits = todaysHabits.filter((h) => logsToday.get(h.id)?.status === 'done')
  // STOA-5 Part B — the habit completed by the most recent explicit tap,
  // so the post-completion mood prompt knows what it's asking about. Kept
  // separate from the Set above, which exists for the one-shot tray
  // entrance animation and deliberately never forgets.
  const [moodPromptHabitId, setMoodPromptHabitId] = useState<string | null>(null)
  function handleHabitLogged(habitId: string) {
    setMoodPromptHabitId(habitId)
  }
  const moodPromptHabit = moodPromptHabitId ? allHabits.find((h) => h.id === moodPromptHabitId) : undefined

  // STOA-6 — two reviews are in play at once on an evening: the one filed
  // *for today* (which the Morning Brief renders) and the one being written
  // *for tomorrow*. Keyed by the day they plan for, so neither needs date
  // arithmetic beyond this one line.
  const tomorrow = addDays(date, 1)
  const todaysReview = useEveningReview(settings?.activeSpaceId, date)
  const tomorrowsReview = useEveningReview(settings?.activeSpaceId, tomorrow)
  // Which day the review sheet is currently editing, or null when closed.
  // Was a bare open/closed boolean when tomorrow was the only reachable
  // day; now that today is editable too, the date *is* the state.
  const [planSheetDate, setPlanSheetDate] = useState<string | null>(null)
  const showEveningPrompt = isEveningPromptTime()
  function handleTaskChecked(todoId: string) {
    setJustCompletedTaskIds((prev) => (prev.has(todoId) ? prev : new Set(prev).add(todoId)))
  }
  // Habits Refocus round — with the flag off, Today is a habits-only
  // screen. The task hooks still run (they're the same live queries every
  // other screen uses and the data is untouched), but nothing they return
  // is merged into Up next, counted in the signal line, rendered in the
  // Done-today tray, or used for the overdue banner. That degrades to
  // "habits only" rather than to empty task rows, and a stale
  // habit→task/plan reference simply never gets read while the flag is off.
  const tasksEnabled = isTasksPlanningEnabled(settings)
  const { today: rawTodosToday, overdue: rawOverdue, loaded: todosLoaded } = useOpenTodosToday(settings?.activeSpaceId)
  const rawDoneTasksToday = useDoneTodosToday(settings?.activeSpaceId)
  const todosToday = tasksEnabled ? rawTodosToday : []
  const overdue = tasksEnabled ? rawOverdue : []
  const doneTasksToday = tasksEnabled ? rawDoneTasksToday : []

  // Part 3c — one habit, chosen from those still unlogged today, that the
  // trailing two weeks say is actually slipping. Fogg: this is a prompt
  // improvement (point at the right thing), not a motivation mechanic —
  // see lib/habitAtRisk.ts for the Article 6 boundary this stays inside.
  const notDoneLogsByHabit = useHabitLogsForHabits(notDoneHabits.map((h) => h.id))
  const atRisk = computeAtRiskHabit(notDoneHabits, notDoneLogsByHabit, date)
  const { statuses: connectivityStatuses, recheck: recheckConnectivity } = useConnectivity()
  const { pullDistance, refreshing, threshold } = usePullToRefresh(recheckConnectivity)
  const backupReminderDue = settings ? isBackupReminderDue(settings, date) : false

  // Article 30 — once per calendar day. Deliberately does NOT latch on a
  // negative result: useOpenTodosToday's live query can resolve once for
  // spaceId=undefined (before settings loads, returning an empty/stale
  // overdue list) before re-resolving again for the real spaceId — "has
  // resolved once" isn't the same as "has settled to the real value". So
  // this only ever locks in when it finds something to show (via the ref);
  // an empty/stale read is silently ignored and re-checked next render
  // rather than being treated as a final "nothing to show" verdict.
  const [showOverdueBanner, setShowOverdueBanner] = useState(false)
  const markedShownRef = useRef(false)
  useEffect(() => {
    if (markedShownRef.current || !settings?.activeSpaceId || !todosLoaded) return
    if (overdue.length > 0 && shouldShowOverdueBanner(settings.overdueBannerLastShownDate, date)) {
      markedShownRef.current = true
      setShowOverdueBanner(true)
      updateAppSettings({ overdueBannerLastShownDate: date })
    }
  }, [settings, todosLoaded, overdue.length, date])


  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 18 ? t('dashboard.greetingAfternoon') : t('dashboard.greetingEvening')
  // The habits-remaining count deliberately does NOT appear here anymore.
  // It was being stated three times in the same 200px of hero — as "7
  // habits left", as the "0/7 HABITS" tile, and (now) as the progress bar
  // — which is the sort of repetition that makes a screen feel unedited.
  // The tile and the bar keep it; this line goes back to being identity
  // plus anything the tile and bar don't already cover.
  const signalParts: string[] = []
  if (todosToday.length > 0) signalParts.push(t('dashboard.tasksDueCount', { count: todosToday.length }))
  if (signalParts.length === 0 && notDoneHabits.length === 0 && todaysHabits.length > 0) {
    signalParts.push(t('dashboard.allClearSignal'))
  }
  const dateLine = [activeSpace ? `${activeSpace.icon} ${activeSpace.name}` : '', ...signalParts]
    .filter(Boolean)
    .join(' · ')

  // STOA-7 — the sketch's big two-line date ("FRIDAY / AUG 7"). Built from
  // Intl rather than hand-formatted so it stays correct in ru as well as
  // en; the weekday and the day/month sit on their own lines because
  // Unbounded 900 at this size only reads well short.
  const heroDate = new Date(`${date}T00:00:00`)
  const heroDateLine = `${heroDate.toLocaleDateString(i18n.language, { weekday: 'long' })}\n${heroDate.toLocaleDateString(
    i18n.language,
    { month: 'short', day: 'numeric' },
  )}`

  // Longest currently-live streak across today's habits — a fact already
  // derivable from data on this screen, surfaced rather than computed anew.
  const allLogsByHabit = useHabitLogsForHabits(allHabits.map((h) => h.id))
  // Built from every habit, not just today's — a day earlier in the week
  // may have had a different set scheduled, and building the strip from
  // today's list would understate those days.
  const dayStrip = buildDayStrip(allHabits, allLogsByHabit, date)
  const longestStreak = todaysHabits.reduce((max, h) => {
    const logs = allLogsByHabit.get(h.id) ?? []
    const streak = h.habitType === 'build' ? computeBuildStreak(h, logs, date) : computeAvoidStreak(h, logs, date)
    return Math.max(max, streak)
  }, 0)

  return (
    // px-3.5 rather than p-4, and max-w-lg rather than max-w-md: the grid
    // is the screen now, and two tiles inside a 16px gutter left the tile
    // text noticeably cramped. The gutter still reads as a real margin.
    <div className="px-3.5 py-4 max-w-lg mx-auto w-full flex flex-col gap-4">
      {/* Hero greeting — the "genuine hero moment" this round's brief
          asked for: no card, no background block, sits directly on the
          canvas. Deliberately the one new text style in this round (no
          existing token was this large) — everything else below reuses
          tokens/components that already existed elsewhere. */}
      {/* STOA-7 Part B — the hero is now a mesh zone. It is deliberately
          negative-margined out to the screen edges so the gradient reaches
          the bezel like the sketch, while the text inside keeps the page's
          normal gutter. The mesh ends with this block; everything below is
          the flat canvas, which is what keeps list rows legible. */}
      {/* The negative top margin cancels BOTH the page's own py-4 and the
          shell's new safe-area inset, so the gradient still reaches the
          very top edge of the display; the matching pt puts the greeting
          back below the status bar with room to breathe. Without this the
          mesh would start below the clock and leave a flat band above it. */}
      <div className="stoa-mesh-hero -mx-3.5 -mt-[calc(1rem+env(safe-area-inset-top))] px-3.5 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        {/* Pull-to-refresh lives inside the hero so it, too, clears the
            status bar — as a sibling above it, the hero's negative margin
            would have slid up and covered it. */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex items-center justify-center text-xs text-[var(--stoa-text-muted)] overflow-hidden transition-[height]"
            style={{ height: refreshing ? 28 : Math.min(pullDistance, threshold * 1.5) }}
          >
            {refreshing
              ? t('dashboard.refreshing')
              : pullDistance >= threshold
                ? t('dashboard.releaseToRefresh')
                : t('dashboard.pullToRefresh')}
          </div>
        )}

        <div className="text-sm text-[var(--stoa-text-muted)]">{greeting}</div>
        <h1 className="font-display text-[1.6rem] leading-[1.05] text-[var(--stoa-text)] uppercase mt-0.5 whitespace-pre-line">
          {heroDateLine}
        </h1>
        <div className="text-xs text-[var(--stoa-text-muted)] mt-1.5">{dateLine}</div>

        {/* Stat tiles — the three facts worth knowing before scrolling.
            Each is a real value already computed on this screen, not a new
            metric: habits done today, the longest live streak, and the
            wake time from last night's review when there is one. */}
        <div className="flex gap-2 mt-3.5">
          <HeroStat value={`${doneHabits.length}/${todaysHabits.length}`} label={t('dashboard.statHabits')} />
          <HeroStat value={String(longestStreak)} label={t('dashboard.statStreak')} />
          {todaysReview?.wakeTime && (
            <HeroStat value={todaysReview.wakeTime} label={t('dashboard.statWake')} />
          )}
        </div>

        <DayProgress done={doneHabits.length} total={todaysHabits.length} />

        {/* The trailing week: a completion overview you can also tap to
            point the grid at any of those days. */}
        <div className="mt-3">
          <DayStrip
            days={dayStrip}
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={i18n.language}
          />
        </div>

        {/* Both days' plans, always reachable — see PlanChip for why. */}
        <div className="flex gap-2 mt-3">
          <PlanChip
            icon={Sun}
            label={t('dashboard.planToday')}
            planned={!!todaysReview && !isEveningReviewEmpty(todaysReview)}
            onClick={() => setPlanSheetDate(date)}
          />
          <PlanChip
            icon={MoonStar}
            label={t('dashboard.planTomorrow')}
            planned={!!tomorrowsReview && !isEveningReviewEmpty(tomorrowsReview)}
            onClick={() => setPlanSheetDate(tomorrow)}
          />
        </div>
      </div>

      {showOverdueBanner && (
        <div className="rounded-xl bg-[var(--stoa-danger)]/10 border border-[var(--stoa-danger)]/30 px-3.5 py-2.5 text-sm text-[var(--stoa-danger)] flex items-center justify-between gap-2">
          <button className="flex-1 text-left underline-offset-2" onClick={() => navigate('/todos/overdue')}>
            {t('dashboard.overdueBanner', { count: overdue.length })} — {t('dashboard.reviewOverdue')}
          </button>
          <button
            aria-label={t('common.close')}
            className="text-[var(--stoa-danger)]/70 hover:text-[var(--stoa-danger)] px-1"
            onClick={() => setShowOverdueBanner(false)}
          >
            ×
          </button>
        </div>
      )}

      {backupReminderDue && <BackupReminderBanner intervalDays={settings?.backupReminderIntervalDays ?? 30} />}

      {/* STOA-6 — the Daily Brief, above Up next: on a morning where last
          night's review exists, it's the first thing on the screen. Absent
          entirely on a day with no review (see the round report for why
          that's a silent skip rather than a lighter default card). */}
      {todaysReview && !isEveningReviewEmpty(todaysReview) && (
        <MorningBriefCard review={todaysReview} spaceName={activeSpace?.name ?? ''} />
      )}


      {/* Tile-grid redesign — the day as a two-column grid of large tiles
          with To do / Done tabs, replacing the old Up-next list plus
          Done-today tray. See HabitGrid/HabitTile for the reasoning. */}
      {!habitsLoaded ? (
        <HabitGridSkeleton />
      ) : (
        <HabitGrid
          habits={selectedHabits}
          logsToday={logsSelected}
          logsByHabit={allLogsByHabit}
          domains={domains}
          date={selectedDate}
          atRiskHabitId={atRisk?.habitId}
          atRiskLabel={
            atRisk ? t('dashboard.atRiskLabelShort', { missed: atRisk.missedDays, observed: atRisk.observedDays }) : undefined
          }
          onOpenHistory={(habit) => navigate(`/habits/${habit.id}`)}
          onEditHabit={(habit) => navigate(`/habits/${habit.id}/edit`)}
          onCreateHabit={() => navigate('/habits?new=1')}
          onLogged={handleHabitLogged}
        />
      )}

      {moodPromptHabit && (
        <JustCompletedMoodPrompt
          key={moodPromptHabit.id}
          habit={moodPromptHabit}
          date={date}
          onDismiss={() => setMoodPromptHabitId(null)}
        />
      )}

      {/* Tasks are not part of the habit grid, so with the Tasks/Planning
          flag ON they get their own section rather than disappearing —
          the redesign is a habits-screen change, not a quiet removal of a
          surface that still exists behind a toggle. */}
      {tasksEnabled && (todosToday.length > 0 || doneTasksToday.length > 0) && (
        <section className="flex flex-col gap-3">
          <SectionHeader title={t('dashboard.tasksSection')} />
          {todosToday.map((td) => (
            <ConnectedTaskCard
              key={td.id}
              todo={td}
              onOpen={() => navigate(`/todos/${td.id}`)}
              onChecked={() => handleTaskChecked(td.id)}
            />
          ))}
          {doneTasksToday.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-4 px-1 pt-1">
              {doneTasksToday.map((td) => (
                <CompletedTaskBubble key={td.id} todo={td} justCompleted={justCompletedTaskIds.has(td.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      <ConnectivityPanel statuses={connectivityStatuses} />

      {/* STOA-6 — the evening prompt sits below the day's work, not above
          it: from 17:00 planning tomorrow is the natural next thing, but it
          must never outrank today's remaining habits. */}
      {showEveningPrompt && <EveningReviewCard review={tomorrowsReview} onOpen={() => setPlanSheetDate(tomorrow)} />}

      {planSheetDate && settings?.activeSpaceId && (
        <EveningReviewSheet
          // Remounts when the day changes, so the form's initial state is
          // re-seeded from the right review rather than keeping the other
          // day's values.
          key={planSheetDate}
          spaceId={settings.activeSpaceId}
          targetDate={planSheetDate}
          initial={planSheetDate === date ? todaysReview : tomorrowsReview}
          onClose={() => setPlanSheetDate(null)}
        />
      )}
    </div>
  )
}
