import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { QuickAddFab } from './QuickAddFab'
import { UndoToast } from '../ui/UndoToast'
import { PwaUpdateBanner } from '../pwa/PwaUpdateBanner'
import { WhatsNewSheet } from '../whatsnew/WhatsNewSheet'
import { useAppSettings } from '../../state/useAppSettings'
import { shouldShowWhatsNew } from '../../lib/changelog'

export function AppShell() {
  const settings = useAppSettings()
  const location = useLocation()
  // No separate local "dismissed" state: dismissing persists
  // lastSeenChangelogVersion, and that same settings read is what drives
  // this check — so it naturally stops rendering once acknowledged,
  // matching the pattern already used for the backup reminder banner.
  const showWhatsNew = !!settings && shouldShowWhatsNew(settings.lastSeenChangelogVersion)

  // The top-level route segment only (e.g. "todos"), not the full path —
  // keying the fade on the whole pathname would replay it on every in-tab
  // navigation too (opening a Todo's edit sheet is a route change to
  // /todos/:id/edit, not a tab switch).
  const tabKey = location.pathname.split('/')[1] || 'dashboard'

  return (
    <div className="min-h-full flex flex-col">
      {/* THE TOP SAFE AREA, owned here rather than per page.
       *
       * index.html sets `viewport-fit=cover`, so the web view genuinely
       * extends under the status bar / Dynamic Island — but nothing had
       * ever applied `env(safe-area-inset-top)` to match (BottomNav has
       * always handled the bottom inset; the top had no counterpart). The
       * result on a real iPhone was every screen's first line of text
       * sitting under the clock, which is the single thing that makes a
       * PWA read as a web page rather than an app.
       *
       * Doing it once on the scroll container fixes every screen at once.
       * The two mesh-hero screens (Today, Habits) deliberately cancel it
       * with a negative margin and re-add it as their own padding, so the
       * gradient still bleeds to the very top edge while its text clears
       * the status bar — see DashboardPage/HabitsPage. */}
      <div className="flex-1 overflow-y-auto pb-4 pt-[env(safe-area-inset-top)]">
        <div key={tabKey} className="tab-fade-in">
          <Outlet />
        </div>
      </div>
      {showWhatsNew && <WhatsNewSheet />}
      <UndoToast />
      <PwaUpdateBanner />
      <QuickAddFab />
      <BottomNav />
    </div>
  )
}
