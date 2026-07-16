import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', key: 'dashboard', icon: '◎' },
  { to: '/habits', key: 'habits', icon: '↻' },
  { to: '/todos', key: 'todos', icon: '☑' },
  { to: '/planning', key: 'planning', icon: '✎' },
  { to: '/settings', key: 'settings', icon: '⚙' },
]

export function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav className="sticky bottom-0 border-t border-[var(--stoa-border)] bg-[var(--stoa-bg)]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 text-xs flex-1 ${
                isActive ? 'text-[var(--stoa-accent)]' : 'text-[var(--stoa-text-muted)]'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {t(`nav.${item.key}`)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
