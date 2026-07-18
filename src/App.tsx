import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppSettings } from './state/useAppSettings'
import { ensureAppSettings } from './db/db'
import { purgeExpiredTrash } from './data/trash'
import { upsertWeeklyAutoStats } from './data/diagnostics'
import { runScheduledReportsIfDue } from './data/aiReports'
import { tickReminders } from './data/reminders'
import { AppShell } from './components/layout/AppShell'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { HabitsPage } from './pages/HabitsPage'
import { TodosPage } from './pages/TodosPage'
import { PlanningPage } from './pages/PlanningPage'
import { SettingsPage } from './pages/SettingsPage'
import { SpacesPage } from './pages/SpacesPage'
import { DomainsPage } from './pages/DomainsPage'
import { TrashPage } from './pages/TrashPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { JournalPage } from './pages/JournalPage'
import { OverdueTriagePage } from './pages/OverdueTriagePage'
import { TimeBlocksPage } from './pages/TimeBlocksPage'
import { DiagnosticDetailPage } from './pages/DiagnosticDetailPage'
import { SearchPage } from './pages/SearchPage'
import { IntegrityCheckPage } from './pages/IntegrityCheckPage'

// Lazy — recharts is the single largest dependency in this app and
// analytics is the only screen that needs it. Splitting it out keeps the
// initial load light for every other screen in this local-first PWA.
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))

function App() {
  const { t, i18n } = useTranslation()
  const settings = useAppSettings()

  useEffect(() => {
    ensureAppSettings().then(() => purgeExpiredTrash())
  }, [])

  // Articles 26/35 — refresh this week's local pattern/mood autoStats once
  // per active Space per session, not on every render.
  const autoStatsSpaceRef = useRef<string | null>(null)
  useEffect(() => {
    const spaceId = settings?.activeSpaceId
    if (!spaceId || autoStatsSpaceRef.current === spaceId) return
    autoStatsSpaceRef.current = spaceId
    upsertWeeklyAutoStats(spaceId).then(() => runScheduledReportsIfDue(spaceId))
  }, [settings?.activeSpaceId])

  // Articles 40/41/42 — foreground-only reminder poller. This app is
  // local-first with no push-notification backend (see lib/notify.ts), so
  // reminders/escalation/digest only progress while the app is actually
  // open: once on activating a Space, then every minute after.
  useEffect(() => {
    const spaceId = settings?.activeSpaceId
    if (!spaceId) return
    tickReminders(spaceId)
    const interval = setInterval(() => tickReminders(spaceId), 60000)
    return () => clearInterval(interval)
  }, [settings?.activeSpaceId])

  useEffect(() => {
    if (!settings) return
    if (i18n.language !== settings.language) i18n.changeLanguage(settings.language)

    const root = document.documentElement
    if (settings.theme.preset === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', settings.theme.preset)
    }
  }, [settings, i18n])

  if (settings === undefined) return null

  if (!settings.onboardingComplete) {
    return <OnboardingPage />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/habits/:id/edit" element={<HabitsPage />} />
          <Route path="/todos" element={<TodosPage />} />
          <Route path="/todos/:id/edit" element={<TodosPage />} />
          <Route path="/todos/overdue" element={<OverdueTriagePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/planning" element={<PlanningPage />} />
          <Route
            path="/analytics"
            element={
              <Suspense fallback={<div className="p-4 text-sm text-[var(--stoa-text-muted)]">{t('common.loading')}</div>}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/spaces" element={<SpacesPage />} />
          <Route path="/settings/domains" element={<DomainsPage />} />
          <Route path="/settings/trash" element={<TrashPage />} />
          <Route path="/settings/integrity-check" element={<IntegrityCheckPage />} />
          <Route path="/settings/time-blocks" element={<TimeBlocksPage />} />
          <Route path="/diagnostics/:id" element={<DiagnosticDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
