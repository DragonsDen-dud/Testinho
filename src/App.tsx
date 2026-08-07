import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
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
import { CatchUpPage } from './pages/CatchUpPage'
import { TimeBlocksPage } from './pages/TimeBlocksPage'
import { DiagnosticDetailPage } from './pages/DiagnosticDetailPage'
import { SearchPage } from './pages/SearchPage'
import { IntegrityCheckPage } from './pages/IntegrityCheckPage'
import { ProSettingsPage } from './pages/ProSettingsPage'
import { ProSettingsSummaryPage } from './pages/ProSettingsSummaryPage'
import { TasksRedesignPreviewPage } from './pages/dev/TasksRedesignPreviewPage'
import { isTasksPlanningEnabled } from './lib/featureFlags'

/**
 * Habits Refocus round — route-level half of the Tasks/Planning flag.
 * Redirects to Today rather than rendering a "temporarily disabled" screen:
 * the flag's whole purpose is to remove this surface from Denys's attention,
 * and a placeholder page is still a page about Tasks. A deep link (an old
 * bookmark, the iOS app-switcher restoring /planning) lands somewhere useful
 * instead of a dead end. Nothing is deleted — flipping the flag back on in
 * Settings restores every route below with the same data behind it.
 */
function TasksPlanningGate() {
  const settings = useAppSettings()
  // Don't redirect while settings are still loading — that would bounce a
  // legitimate deep link to Today before the flag is even known.
  if (settings === undefined) return null
  return isTasksPlanningEnabled(settings) ? <Outlet /> : <Navigate to="/" replace />
}

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

  // Stage-1-only preview route: bypass onboarding gating so it's reachable
  // for screenshot review on a fresh profile with no Space set up yet.
  if (window.location.pathname === '/dev/tasks-redesign-preview') {
    return <TasksRedesignPreviewPage />
  }

  if (!settings.onboardingComplete) {
    return <OnboardingPage />
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Stage-1-only, unlinked — Tasks tab redesign screenshot review. */}
        <Route path="/dev/tasks-redesign-preview" element={<TasksRedesignPreviewPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/habits/:id" element={<HabitsPage />} />
          <Route path="/habits/:id/edit" element={<HabitsPage />} />
          <Route path="/habits/catch-up" element={<CatchUpPage />} />
          <Route element={<TasksPlanningGate />}>
            <Route path="/todos" element={<TodosPage />} />
            <Route path="/todos/:id" element={<TodosPage />} />
            <Route path="/todos/:id/edit" element={<TodosPage />} />
            <Route path="/todos/overdue" element={<OverdueTriagePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/planning" element={<PlanningPage />} />
          </Route>
          <Route path="/journal" element={<JournalPage />} />
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
          <Route path="/settings/pro-settings" element={<ProSettingsPage />} />
          <Route path="/settings/pro-settings/summary" element={<ProSettingsSummaryPage />} />
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
