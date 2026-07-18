import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

// Article 49 — only on the screens the article names: Dashboard, Habits,
// Todos, Journal. Not on Planning/Settings/Projects/Trash/etc.
const FAB_ROUTES = ['/', '/habits', '/todos', '/journal']

const MENU_ITEMS = [
  { key: 'habit', to: '/habits?new=1' },
  { key: 'todo', to: '/todos?new=1' },
  { key: 'journal', to: '/journal?new=1' },
] as const

/**
 * Article 49 — a navigation shortcut, not a second implementation: every
 * menu item routes to the same real creation flow its own screen already
 * has (HabitForm, the full TodoForm, JournalEntryForm's free-entry
 * composer), via the ?new=1 convention each page already watches for.
 */
export function QuickAddFab() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!FAB_ROUTES.includes(location.pathname)) return null

  function choose(to: string) {
    setOpen(false)
    navigate(to)
  }

  return (
    <div className="fixed right-4 bottom-20 z-20 flex flex-col items-end gap-2">
      {open && (
        <div className="rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] shadow-lg py-1.5 flex flex-col min-w-[10rem]">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="text-left text-sm px-4 py-2.5 hover:bg-[var(--stoa-border)]/30"
              onClick={() => choose(item.to)}
            >
              {t(`quickAdd.${item.key}`)}
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
