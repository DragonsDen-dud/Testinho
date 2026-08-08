import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { TrendingDown } from 'lucide-react'
import { useAppSettings, updateAppSettings } from '../state/useAppSettings'
import { useSpaces } from '../state/useSpaces'
import { useHabits, useLogsForDate, useHabitLogsForHabits } from '../state/useHabits'
import { useTimeBlocks } from '../state/useTimeBlocks'
import { useOpenTodosToday, useDoneTodosToday } from '../state/useTodos'
import { useConnectivity } from '../state/useConnectivity'
import { HabitCard } from '../components/habits/HabitCard'
import { CompletedHabitBubble } from '../components/habits/CompletedHabitBubble'
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
import { BackupReminderBanner } from '../components/dashboard/BackupReminderBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { isScheduledOnDate, computeBuildStreak, computeAvoidStreak } from '../lib/habitStrength'
import { shouldShowOverdueBanner } from '../lib/overdueBanner'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { isBackupReminderDue } from '../lib/backupReminder'
import { timeBlockStartMinutes } from '../lib/timeBlockRange'
import { isTasksPlanningEnabled } from '../lib/featureFlags'
import { computeAtRiskHabit } from '../lib/habitAtRisk'
import { todayKey, addDays } from '../lib/date'
import type { Habit, TimeBlock, Todo } from '../db/types'

function scheduledTimeMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Today redesign round — a deliberately simple, Dashboard-local ordering
 * for the single "Up next" list: a habit sorts by its TimeBlock's
 * structured start time (if any), a task by its own scheduledTime (if
 * any); anything without one sinks to the end. This is NOT Option 3's
 * pending dayTimeline.ts merge (that requires every TimeBlock in the
 * Space to have a time before merging at all, with a two-group fallback
 * otherwise) — this always produces one flat list, approximate rather
 * than exact, exactly the "simple co-located list, no new merge logic"
 * the brief asked for. */
type UpNextItem = { kind: 'habit'; habit: Habit; sortMinutes: number } | { kind: 'todo'; todo: Todo; sortMinutes: number }

/**
 * STOA-7 — one hero stat tile. A translucent card that lets the mesh show
 * through rather than a solid surface, which is what keeps the header
 * reading as one field of colour instead of three panels sitting on it.
 */
function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-[var(--stoa-border)]/60 bg-[var(--stoa-surface)]/35 px-3 py-2.5 backdrop-blur-[2px]">
      <div className="font-display text-xl leading-none text-[var(--stoa-text)] tabular-nums truncate">{value}</div>
      <div className="font-heading text-[10px] uppercase text-[var(--stoa-text-muted)] mt-1 truncate">{label}</div>
    </div>
  )
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const spaces = useSpaces()
  const activeSpace = spaces.find((s) => s.id === settings?.activeSpaceId)
  const allHabits = useHabits(settings?.activeSpaceId)
  const timeBlocks = useTimeBlocks(settings?.activeSpaceId)
  const date = todayKey()
  const todaysHabits = allHabits.filter((h) => isScheduledOnDate(h, date))
  // Fetched for all habits, not just today's — a dependency can point at a
  // habit that isn't itself scheduled today, and its completion still needs
  // to resolve correctly (Article 25).
  const logsToday = useLogsForDate(
    allHabits.map((h) => h.id),
    date,
  )
  const [justCompletedHabitIds, setJustCompletedHabitIds] = useState<Set<string>>(new Set())
  const [justCompletedTaskIds, setJustCompletedTaskIds] = useState<Set<string>>(new Set())
  const notDoneHabits = todaysHabits.filter((h) => logsToday.get(h.id)?.status !== 'done')
  const doneHabits = todaysHabits.filter((h) => logsToday.get(h.id)?.status === 'done')
  // STOA-5 Part B — the habit completed by the most recent explicit tap,
  // so the post-completion mood prompt knows what it's asking about. Kept
  // separate from the Set above, which exists for the one-shot tray
  // entrance animation and deliberately never forgets.
  const [moodPromptHabitId, setMoodPromptHabitId] = useState<string | null>(null)
  function handleHabitLogged(habitId: string) {
    setJustCompletedHabitIds((prev) => (prev.has(habitId) ? prev : new Set(prev).add(habitId)))
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
  const [eveningSheetOpen, setEveningSheetOpen] = useState(false)
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

  function habitSortMinutes(habit: Habit): number {
    const block = timeBlocks.find((tb: TimeBlock) => tb.id === habit.timeBlockId)
    return block ? timeBlockStartMinutes(block) : Number.MAX_SAFE_INTEGER
  }

  const sortedUpNextItems: UpNextItem[] = [
    ...notDoneHabits.map((h): UpNextItem => ({ kind: 'habit', habit: h, sortMinutes: habitSortMinutes(h) })),
    ...todosToday.map(
      (td): UpNextItem => ({
        kind: 'todo',
        todo: td,
        sortMinutes: td.scheduledTime ? scheduledTimeMinutes(td.scheduledTime) : Number.MAX_SAFE_INTEGER,
      }),
    ),
  ].sort((a, b) => a.sortMinutes - b.sortMinutes)

  // The at-risk habit is lifted to the top of the same list rather than
  // given its own section: it stays one tap from done (Fogg's ability
  // constraint — the brief's sub-5-second rule), and the list keeps its
  // single ordering rather than splitting into two competing ones.
  const atRiskIndex = atRisk
    ? sortedUpNextItems.findIndex((item) => item.kind === 'habit' && item.habit.id === atRisk.habitId)
    : -1
  const upNextItems =
    atRiskIndex > 0
      ? [sortedUpNextItems[atRiskIndex], ...sortedUpNextItems.filter((_, i) => i !== atRiskIndex)]
      : sortedUpNextItems

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 18 ? t('dashboard.greetingAfternoon') : t('dashboard.greetingEvening')
  const signalParts: string[] = []
  if (notDoneHabits.length > 0) signalParts.push(t('dashboard.habitsLeftCount', { count: notDoneHabits.length }))
  if (todosToday.length > 0) signalParts.push(t('dashboard.tasksDueCount', { count: todosToday.length }))
  const signalLine = signalParts.length > 0 ? signalParts.join(' · ') : t('dashboard.allClearSignal')
  const dateLine = activeSpace
    ? `${activeSpace.icon} ${activeSpace.name} · ${signalLine}`
    : signalLine

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
  const allLogsByHabit = useHabitLogsForHabits(todaysHabits.map((h) => h.id))
  const longestStreak = todaysHabits.reduce((max, h) => {
    const logs = allLogsByHabit.get(h.id) ?? []
    const streak = h.habitType === 'build' ? computeBuildStreak(h, logs, date) : computeAvoidStreak(h, logs, date)
    return Math.max(max, streak)
  }, 0)

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-5">
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
      <div className="stoa-mesh-hero -mx-4 -mt-4 px-4 pt-6 pb-8">
        <div className="text-sm text-[var(--stoa-text-muted)]">{greeting}</div>
        <h1 className="font-display text-[2rem] leading-[1.05] text-[var(--stoa-text)] uppercase mt-0.5 whitespace-pre-line">
          {heroDateLine}
        </h1>
        <div className="text-xs text-[var(--stoa-text-muted)] mt-1.5">{dateLine}</div>

        {/* Stat tiles — the three facts worth knowing before scrolling.
            Each is a real value already computed on this screen, not a new
            metric: habits done today, the longest live streak, and the
            wake time from last night's review when there is one. */}
        <div className="flex gap-2 mt-4">
          <HeroStat value={`${doneHabits.length}/${todaysHabits.length}`} label={t('dashboard.statHabits')} />
          <HeroStat value={String(longestStreak)} label={t('dashboard.statStreak')} />
          {todaysReview?.wakeTime && (
            <HeroStat value={todaysReview.wakeTime} label={t('dashboard.statWake')} />
          )}
        </div>
      </div>

      <ConnectivityPanel statuses={connectivityStatuses} />

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


      {/* Module 1 — "Up next": today's not-yet-done habits and today's due
          tasks in one list, each row using its home tab's own real
          component (HabitCard / ConnectedTaskCard) unmodified in
          appearance — just co-located and time-sorted, not merged at the
          data level. */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xs text-[var(--stoa-text-muted)] uppercase px-1">
          {t('dashboard.upNextSection')}
        </h2>
        {upNextItems.length === 0 ? (
          /* Part 2 polish — a considered "everything's logged" state rather
             than the generic one-liner. Deliberately restrained per Article
             19 and Article 6: it states the fact and the count, with no
             congratulation, streak reward, score, or celebration. */
          doneHabits.length > 0 ? (
            <div className="rounded-card bg-canvas px-4 py-5 flex flex-col items-center text-center gap-1">
              <div className="text-sm font-medium text-[var(--stoa-text)]">{t('dashboard.allLoggedTitle')}</div>
              <div className="text-xs text-[var(--stoa-text-muted)]">
                {t('dashboard.allLoggedSubtitle', { count: doneHabits.length })}
              </div>
            </div>
          ) : (
            <EmptyState text={t('dashboard.upNextEmpty')} />
          )
        ) : (
          <div className="flex flex-col gap-3">
            {upNextItems.map((item) =>
              item.kind === 'habit' ? (
                <div key={`habit-${item.habit.id}`} className="flex flex-col gap-1.5">
                  {atRisk?.habitId === item.habit.id && (
                    /* Article 6/19 — a plain statement of what the last two
                       weeks actually contain. No score, no rank, no reward
                       to recover; the same category of output as the
                       existing weak-day pattern line on the card below. */
                    <div className="flex items-center gap-1.5 text-xs text-[var(--stoa-danger)] px-1">
                      <TrendingDown size={13} strokeWidth={1.75} aria-hidden />
                      <span>
                        {t('dashboard.atRiskLabel', {
                          missed: atRisk.missedDays,
                          observed: atRisk.observedDays,
                        })}
                      </span>
                    </div>
                  )}
                  <HabitCard
                    habit={item.habit}
                    todayLog={logsToday.get(item.habit.id)}
                    allHabits={allHabits}
                    logsToday={logsToday}
                    onLogged={() => handleHabitLogged(item.habit.id)}
                  />
                </div>
              ) : (
                <ConnectedTaskCard
                  key={`todo-${item.todo.id}`}
                  todo={item.todo}
                  onOpen={() => navigate(`/todos/${item.todo.id}`)}
                  onChecked={() => handleTaskChecked(item.todo.id)}
                />
              ),
            )}
          </div>
        )}
      </section>

      {/* Module 2 — "Done today": the existing habit-bubble tray (Habits
          2.0 Part B), now also holding completed tasks as bubbles in the
          same visual language. */}
      {(doneHabits.length > 0 || doneTasksToday.length > 0) && (
        <div className="flex flex-col gap-2 bg-canvas rounded-card p-3">
          <h2 className="font-heading text-xs text-[var(--stoa-text-muted)] uppercase px-1">
            {t('dashboard.doneTodaySection')}
          </h2>
          {/* Appears only after an explicit completion in this session, and
              only for a habit still worth asking about — never on load. */}
          {moodPromptHabit && (
            <JustCompletedMoodPrompt
              key={moodPromptHabit.id}
              habit={moodPromptHabit}
              date={date}
              onDismiss={() => setMoodPromptHabitId(null)}
            />
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-4 px-1 pt-1">
            {doneHabits.map((h) => (
              <CompletedHabitBubble key={h.id} habit={h} justCompleted={justCompletedHabitIds.has(h.id)} />
            ))}
            {doneTasksToday.map((td) => (
              <CompletedTaskBubble key={td.id} todo={td} justCompleted={justCompletedTaskIds.has(td.id)} />
            ))}
          </div>
        </div>
      )}

      {/* STOA-6 — the evening prompt sits below the day's work, not above
          it: from 17:00 planning tomorrow is the natural next thing, but it
          must never outrank today's remaining habits. */}
      {showEveningPrompt && <EveningReviewCard review={tomorrowsReview} onOpen={() => setEveningSheetOpen(true)} />}

      {eveningSheetOpen && settings?.activeSpaceId && (
        <EveningReviewSheet
          spaceId={settings.activeSpaceId}
          targetDate={tomorrow}
          initial={tomorrowsReview}
          onClose={() => setEveningSheetOpen(false)}
        />
      )}
    </div>
  )
}
