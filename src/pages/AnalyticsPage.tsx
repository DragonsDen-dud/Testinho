import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppSettings } from '../state/useAppSettings'
import { useActiveSpace } from '../state/useSpaces'
import { useHabits, useHabitLogsForHabits } from '../state/useHabits'
import { useTodos } from '../state/useTodos'
import { useDomains } from '../state/useDomains'
import { useCurrentScheduledReport } from '../state/useDiagnostics'
import { markDiagnosticViewed } from '../data/diagnostics'
import { ChartCard } from '../components/analytics/ChartCard'
import { ScheduledReportCard } from '../components/analytics/ScheduledReportCard'
import { SleepSection } from '../components/analytics/SleepSection'
import { EmptyState } from '../components/ui/EmptyState'
import { isTasksPlanningEnabled } from '../lib/featureFlags'
import {
  computeCompletionRates,
  computeDomainHabitStrength,
  computeMoodCorrelationByHabit,
  computeTaskRatio,
} from '../lib/analytics'

const TASK_STATUS_COLORS: Record<string, string> = {
  open: 'var(--stoa-accent)',
  done: 'var(--stoa-text-muted)',
  someday: 'var(--stoa-border)',
  archived: 'var(--stoa-danger)',
}

export function AnalyticsPage() {
  const { t } = useTranslation()
  const settings = useAppSettings()
  const activeSpace = useActiveSpace(settings?.activeSpaceId)
  const habits = useHabits(settings?.activeSpaceId)
  const todos = useTodos(settings?.activeSpaceId)
  const domains = useDomains(settings?.activeSpaceId)
  const logsByHabitId = useHabitLogsForHabits(habits.map((h) => h.id))
  const weeklyReport = useCurrentScheduledReport(settings?.activeSpaceId, 'week')
  const monthlyReport = useCurrentScheduledReport(settings?.activeSpaceId, 'month')

  // Article 12 — a report is "viewed" simply by being visible here; there's
  // no separate click-to-read step, matching how the old Dashboard banner
  // needed no interaction beyond being on screen. Guarded by
  // markDiagnosticViewed's own no-op-if-already-viewed check, so this
  // running again on every render (e.g. after a feedback edit re-renders
  // the page) never re-bumps an already-set viewedAt.
  useEffect(() => {
    if (weeklyReport) void markDiagnosticViewed(weeklyReport.id)
  }, [weeklyReport])
  useEffect(() => {
    if (monthlyReport) void markDiagnosticViewed(monthlyReport.id)
  }, [monthlyReport])

  // Habits Refocus round — with the flag off, Analytics is habits-only
  // data: the task-status pie disappears (as does its contribution to the
  // "nothing to show yet" empty state), leaving completion rate, Habit
  // Strength by domain, sleep and mood correlation. computeTaskRatio and
  // the chart itself are untouched and return the moment the flag flips.
  const hasAnyHabits = habits.length > 0
  const hasAnyTodos = isTasksPlanningEnabled(settings) && todos.length > 0

  const completionStats = computeCompletionRates(habits, logsByHabitId)
  const completionData = completionStats.map((s) => ({
    window: t('analytics.windowDays', { count: s.windowDays }),
    percent: s.percent,
  }))

  const domainStrengthRows = computeDomainHabitStrength(habits, logsByHabitId)
  const domainNameById = new Map(domains.map((d) => [d.id, d.name]))
  const domainStrengthData = domainStrengthRows.map((row) => ({
    domain: row.domainId ? (domainNameById.get(row.domainId) ?? t('analytics.noDomain')) : t('analytics.noDomain'),
    [t('habits.typeBuild')]: row.buildAvg ?? 0,
    [t('habits.typeAvoid')]: row.avoidAvg ?? 0,
    buildCount: row.buildCount,
    avoidCount: row.avoidCount,
  }))

  const taskRatio = computeTaskRatio(todos)
  const TASK_STATUS_LABEL_KEYS = {
    open: 'todos.statusOpen',
    done: 'todos.statusDone',
    someday: 'todos.statusSomeday',
    archived: 'todos.statusArchived',
  } as const
  const taskRatioData = (['open', 'done', 'someday', 'archived'] as const)
    .map((status) => ({ status, name: t(TASK_STATUS_LABEL_KEYS[status]), value: taskRatio[status] }))
    .filter((d) => d.value > 0)

  const habitById = new Map(habits.map((h) => [h.id, h]))
  const moodRows = computeMoodCorrelationByHabit(habits, logsByHabitId).filter((r) => r.correlation !== null)
  const moodData = moodRows.map((r) => ({
    habit: habitById.get(r.habitId)?.name ?? '',
    value: r.correlation!.value,
  }))

  return (
    <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{t('analytics.title')}</h1>
        {activeSpace && (
          <div className="text-xs text-[var(--stoa-text-muted)]">
            {activeSpace.icon} {activeSpace.name}
          </div>
        )}
      </div>

      {weeklyReport && <ScheduledReportCard title={t('dashboard.scheduledReportTitleWeek')} report={weeklyReport} />}
      {monthlyReport && <ScheduledReportCard title={t('dashboard.scheduledReportTitleMonth')} report={monthlyReport} />}

      {settings?.activeSpaceId && <SleepSection spaceId={settings.activeSpaceId} />}

      {!hasAnyHabits && !hasAnyTodos ? (
        <EmptyState text={t('analytics.empty')} />
      ) : (
        <>
          {hasAnyHabits && (
            <ChartCard title={t('analytics.completionTitle')} filename="stoa-completion-rate.png">
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={completionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--stoa-border)" />
                    <XAxis dataKey="window" tick={{ fontSize: 11, fill: 'var(--stoa-text-muted)' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--stoa-text-muted)' }} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="percent" fill="var(--stoa-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {hasAnyHabits && (
            <ChartCard title={t('analytics.domainStrengthTitle')} filename="stoa-habit-strength-by-domain.png">
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={domainStrengthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--stoa-border)" />
                    <XAxis dataKey="domain" tick={{ fontSize: 10, fill: 'var(--stoa-text-muted)' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--stoa-text-muted)' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey={t('habits.typeBuild')} fill="var(--stoa-accent)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={t('habits.typeAvoid')} fill="var(--stoa-danger)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {hasAnyTodos && (
            <ChartCard title={t('analytics.taskRatioTitle')} filename="stoa-task-ratio.png">
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={taskRatioData} dataKey="value" nameKey="name" outerRadius={70} label>
                      {taskRatioData.map((entry) => (
                        <Cell key={entry.status} fill={TASK_STATUS_COLORS[entry.status]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          <ChartCard title={t('analytics.moodCorrelationTitle')} filename="stoa-mood-correlation.png">
            {moodData.length === 0 ? (
              <EmptyState text={t('analytics.moodCorrelationEmpty')} />
            ) : (
              <div style={{ width: '100%', height: Math.max(120, moodData.length * 40) }}>
                <ResponsiveContainer>
                  <BarChart data={moodData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--stoa-border)" />
                    <XAxis type="number" domain={[-10, 10]} tick={{ fontSize: 11, fill: 'var(--stoa-text-muted)' }} />
                    <YAxis type="category" dataKey="habit" width={90} tick={{ fontSize: 11, fill: 'var(--stoa-text-muted)' }} />
                    <Tooltip formatter={(value) => (typeof value === 'number' && value >= 0 ? `+${value}` : value)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {moodData.map((entry) => (
                        <Cell key={entry.habit} fill={entry.value >= 0 ? 'var(--stoa-accent)' : 'var(--stoa-danger)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </>
      )}
    </div>
  )
}
