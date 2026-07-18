import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { QuickAddFab } from './QuickAddFab'
import { UndoToast } from '../ui/UndoToast'

export function AppShell() {
  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pb-4">
        <Outlet />
      </div>
      <UndoToast />
      <QuickAddFab />
      <BottomNav />
    </div>
  )
}
