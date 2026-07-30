import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CartesianGrid, Legend, Line, LineChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useSleepLogs } from '../../state/useSleep'
import { ChartCard } from './ChartCard'
import { SleepEntryForm } from './SleepEntryForm'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { computeHoursSlept, formatClockTime, timeOfDayForChart, formatChartHour } from '../../lib/sleep'
import { formatHumanDate } from '../../lib/date'
import type { SleepLog } from '../../db/types'

// Bedtime/wake time get their own fixed, distinct colors rather than
// reusing --stoa-accent/--stoa-danger — those already carry other meanings
// elsewhere in Analytics (accent as the general "primary" tone, danger for
// avoid-habit misses), and reusing either here would imply an unintended
// connection to those. Indigo reads as "night", amber as "sunrise" —
// intuitive without needing the legend, and both hold up in light/dark.
const BEDTIME_COLOR = '#6366f1'
const WAKETIME_COLOR = '#f59e0b'

// Keeps both charts readable at a glance on a long history, same spirit as
// analytics.ts's own trailing-window convention (COMPLETION_WINDOWS).
const CHART_MAX_ENTRIES = 30

/**
 * Sleep tracking round — lives entirely inside Analytics (see this round's
 * report for why: Today/Journal were considered and ruled out) as its own
 * section, reusing ChartCard/Sheet/Field/Button rather than any new shell.
 * The table doubles as the edit entry point — tapping any row reopens
 * SleepEntryForm pre-filled for that date, same "tap to edit" precedent
 * the habit pattern grid established.
 */
export function SleepSection({ spaceId }: { spaceId: string }) {
  const { t, i18n } = useTranslation()
  const logs = useSleepLogs(spaceId) // newest first
  const [formOpen, setFormOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null)

  const chronological = [...logs].reverse().slice(-CHART_MAX_ENTRIES)
  const timeSeriesData = chronological.map((log) => ({
    date: formatHumanDate(log.date, i18n.language),
    bedTime: timeOfDayForChart(log.bedTime, true),
    wakeTime: timeOfDayForChart(log.wakeTime, false),
  }))
  const durationData = chronological.map((log) => ({
    date: formatHumanDate(log.date, i18n.language),
    hours: computeHoursSlept(log.bedTime, log.wakeTime),
  }))

  function openNew() {
    setEditingLog(null)
    setFormOpen(true)
  }

  function openEdit(log: SleepLog) {
    setEditingLog(log)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t('sleep.sectionTitle')}</h2>
        <Button variant="secondary" onClick={openNew}>
          {t('sleep.logButton')}
        </Button>
      </div>

      {logs.length === 0 ? (
        <EmptyState text={t('sleep.empty')} />
      ) : (
        <>
          <div className="rounded-xl border border-[var(--stoa-border)] overflow-hidden">
            <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs font-semibold text-[var(--stoa-text-muted)] uppercase tracking-wide border-b border-[var(--stoa-border)]">
              <span>{t('sleep.colDate')}</span>
              <span>{t('sleep.colBedTime')}</span>
              <span>{t('sleep.colWakeTime')}</span>
              <span>{t('sleep.colHours')}</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {logs.map((log) => (
                <button
                  type="button"
                  key={log.id}
                  onClick={() => openEdit(log)}
                  className="grid grid-cols-4 gap-2 px-3 py-2 text-sm w-full text-left border-b border-[var(--stoa-border)] last:border-b-0 hover:bg-[var(--stoa-border)]/20"
                >
                  <span>{formatHumanDate(log.date, i18n.language)}</span>
                  <span>{formatClockTime(log.bedTime)}</span>
                  <span>{formatClockTime(log.wakeTime)}</span>
                  <span>{t('sleep.hoursValue', { hours: computeHoursSlept(log.bedTime, log.wakeTime) })}</span>
                </button>
              ))}
            </div>
          </div>

          <ChartCard title={t('sleep.timeSeriesTitle')} filename="stoa-sleep-times.png">
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--stoa-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--stoa-text-muted)' }} />
                  <YAxis
                    domain={[0, 32]}
                    ticks={[0, 6, 12, 18, 24, 30]}
                    tickFormatter={formatChartHour}
                    tick={{ fontSize: 10, fill: 'var(--stoa-text-muted)' }}
                    width={40}
                  />
                  <Tooltip formatter={(value) => formatChartHour(value as number)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="bedTime" name={t('sleep.bedTime')} stroke={BEDTIME_COLOR} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="wakeTime" name={t('sleep.wakeTime')} stroke={WAKETIME_COLOR} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title={t('sleep.durationTitle')} filename="stoa-sleep-hours.png">
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--stoa-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--stoa-text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--stoa-text-muted)' }} width={30} />
                  <Tooltip formatter={(value) => `${value}h`} />
                  <Bar dataKey="hours" fill="var(--stoa-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </>
      )}

      {formOpen && (
        <SleepEntryForm
          spaceId={spaceId}
          initial={editingLog ?? undefined}
          onClose={() => setFormOpen(false)}
          onSaved={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}
