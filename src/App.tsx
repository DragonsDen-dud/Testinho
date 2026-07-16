import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppSettings } from './state/useAppSettings'
import { ensureAppSettings } from './db/db'
import { purgeExpiredTrash } from './data/trash'
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

function App() {
  const { i18n } = useTranslation()
  const settings = useAppSettings()

  useEffect(() => {
    ensureAppSettings().then(() => purgeExpiredTrash())
  }, [])

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
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/spaces" element={<SpacesPage />} />
          <Route path="/settings/domains" element={<DomainsPage />} />
          <Route path="/settings/trash" element={<TrashPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
