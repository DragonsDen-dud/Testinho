import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppSettings } from '../../state/useAppSettings'
import { QuickCreateHabitModal } from '../quickcreate/QuickCreateHabitModal'
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
 * Article 49 — a navigation shortcut, not a second implementation. Journal
 * still routes straight to its own real full flow via ?new=1 (unchanged —
 * Part 1's compact quick-create is scoped to Habit and Todo only). Habit
 * and Todo now open the compact quick-create modal instead of navigating
 * away — that modal itself calls the exact same createHabit/createTodo the
 * full forms use (see QuickCreateHabitModal.tsx / QuickCreateTodoModal.tsx),
 * and its own "Open full editor" link is what still reaches the full form
 * via the same ?new=1 convention, carrying over whatever title was typed.
 */
export function QuickAddFab() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const settings = useAppSettings()
  const [open, setOpen] = useState(false)
  const [quickCreating, setQuickCreating] = useState<'habit' | 'todo' | null>(null)

  if (!FAB_ROUTES.includes(location.pathname)) return null

  // Habits Refocus round — "Task" drops out of the menu while the flag is
  // off, so the FAB can't open a creation flow for a surface that has no
  // way to view what it creates.
  const menuItems = MENU_ITEMS.filter((key) => key !== 'todo' || isTasksPlanningEnabled(settings))

  function choose(key: (typeof MENU_ITEMS)[number]) {
    setOpen(false)
    if (key === 'journal') {
      navigate('/journal?new=1')
    } else {
      setQuickCreating(key)
    }
  }

  function openFullEditor(base: '/habits' | '/todos', initialTitle: string) {
    setQuickCreating(null)
    const query = initialTitle.trim() ? `?new=1&title=${encodeURIComponent(initialTitle.trim())}` : '?new=1'
    navigate(`${base}${query}`)
  }

  return (
    <div className="fixed right-4 bottom-20 z-20 flex flex-col items-end gap-2">
      {quickCreating === 'habit' && settings?.activeSpaceId && (
        <QuickCreateHabitModal
          spaceId={settings.activeSpaceId}
          onClose={() => setQuickCreating(null)}
          onOpenFullEditor={(title) => openFullEditor('/habits', title)}
        />
      )}
      {quickCreating === 'todo' && settings?.activeSpaceId && (
        <QuickCreateTodoModal
          spaceId={settings.activeSpaceId}
          onClose={() => setQuickCreating(null)}
          onOpenFullEditor={(title) => openFullEditor('/todos', title)}
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
