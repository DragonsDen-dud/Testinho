import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { QuickAddFab } from './QuickAddFab'
import { UndoToast } from '../ui/UndoToast'
import { PwaUpdateBanner } from '../pwa/PwaUpdateBanner'
import { WhatsNewSheet } from '../whatsnew/WhatsNewSheet'
import { useAppSettings } from '../../state/useAppSettings'
import { shouldShowWhatsNew } from '../../lib/changelog'

export function AppShell() {
  const settings = useAppSettings()
  // No separate local "dismissed" state: dismissing persists
  // lastSeenChangelogVersion, and that same settings read is what drives
  // this check — so it naturally stops rendering once acknowledged,
  // matching the pattern already used for the backup reminder banner.
  const showWhatsNew = !!settings && shouldShowWhatsNew(settings.lastSeenChangelogVersion)

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pb-4">
        <Outlet />
      </div>
      {showWhatsNew && <WhatsNewSheet />}
      <UndoToast />
      <PwaUpdateBanner />
      <QuickAddFab />
      <BottomNav />
    </div>
  )
}
