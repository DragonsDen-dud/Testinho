import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppSettings } from '../../state/useAppSettings'
import { QuickCreateTodoModal } from '../quickcreate/QuickCreateTodoModal'
import { isTasksPlanningEnabled } from '../../lib/featureFlags'

// Article 49 — only on the screens the article names: Dashboard, Habits,
// Todos, Journal. Not on Planning/Settings/Projects/Trash/etc. `/todos` is
// unreachable while the Habits Refocus flag is off (the route redirects),
// so leaving it here costs nothing and keeps the list one-to-one with the
// article.
const FAB_ROUTES = ['/', '/habits', '/todos', '/journal']

const MENU_ITEMS = ['habit', 'todo', 'journal'] as const

/**
 * Article 49 — a navigation shortcut, not a second implementation.
 *
 * Habit (STOA-8) and Journal route straight to their screen's own real
 * creation flow via the shared ?new=1 convention that page already watches
 * for. There is exactly one way to create a habit — HabitForm on the Habits
 * screen — and this button opens it; the compact QuickCreateHabitModal that
 * used to sit here was removed because two creation paths had already
 * drifted apart once (the look picker had to be added to each separately).
 *
 * Task still opens the compact quick-create modal in place (Tasks/Planning
 * is flag-off and untouched by STOA-8); its "Open full editor" link reaches
 * the full form via the same ?new=1 convention, carrying over the title.
 */
export function QuickAddFab() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const [open, setOpen] = useState(false)
  const [quickCreatingTodo, setQuickCreatingTodo] = useState(false)

  if (!FAB_ROUTES.includes(location.pathname)) return null

  // Habits Refocus round — "Task" drops out of the menu while the flag is
  // off, so the FAB can't open a creation flow for a surface that has no
  // way to view what it creates.
  const menuItems = MENU_ITEMS.filter((key) => key !== 'todo' || isTasksPlanningEnabled(settings))

  function choose(key: (typeof MENU_ITEMS)[number]) {
    setOpen(false)
    if (key === 'todo') {
      setQuickCreatingTodo(true)
    } else {
      navigate(key === 'habit' ? '/habits?new=1' : '/journal?new=1')
    }
  }

  function openFullTodoEditor(initialTitle: string) {
    setQuickCreatingTodo(false)
    const query = initialTitle.trim() ? `?new=1&title=${encodeURIComponent(initialTitle.trim())}` : '?new=1'
    navigate(`/todos${query}`)
  }

  return (
    <div className="fixed right-4 bottom-20 z-20 flex flex-col items-end gap-2">
      {quickCreatingTodo && settings?.activeSpaceId && (
        <QuickCreateTodoModal
          spaceId={settings.activeSpaceId}
          onClose={() => setQuickCreatingTodo(false)}
          onOpenFullEditor={openFullTodoEditor}
        />
      )}
      {open && (
        <div className="rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] shadow-lg py-1.5 flex flex-col min-w-[10rem]">
          {menuItems.map((key) => (
            <button
              key={key}
              type="button"
              className="text-left text-sm px-4 py-2.5 hover:bg-[var(--stoa-border)]/30"
              onClick={() => choose(key)}
            >
              {t(`quickAdd.${key}`)}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label={t('quickAdd.fabLabel')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-12 h-12 rounded-full bg-[var(--stoa-accent)] text-[var(--stoa-bg)] text-2xl leading-none flex items-center justify-center shadow-lg hover:opacity-90 transition-transform"
        style={{ transform: open ? 'rotate(45deg)' : 'none' }}
      >
        +
      </button>
    </div>
  )
}
