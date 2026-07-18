import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { useAppSettings } from '../../state/useAppSettings'
import { useHasUnviewedScheduledReport } from '../../state/useDiagnostics'

const items = [
  { to: '/', key: 'dashboard', icon: '◎' },
  { to: '/habits', key: 'habits', icon: '↻' },
  { to: '/todos', key: 'todos', icon: '☑' },
  { to: '/journal', key: 'journal', icon: '✍' },
  { to: '/planning', key: 'planning', icon: '✎' },
  { to: '/analytics', key: 'analytics', icon: '📊' },
  { to: '/search', key: 'search', icon: '🔍' },
  { to: '/settings', key: 'settings', icon: '⚙' },
]

export function BottomNav() {
  const { t } = useTranslation()
  const settings = useAppSettings()
  // Article 12 — replaces the old Dashboard banner: an unread scheduled
  // report now surfaces as a small dot on the Analytics tab instead of a
  // popup on every app open, cleared by actually visiting Analytics (see
  // AnalyticsPage's mark-viewed effect).
  const hasUnviewedReport = useHasUnviewedScheduledReport(settings?.activeSpaceId)

  return (
    <nav className="sticky bottom-0 border-t border-[var(--stoa-border)] bg-[var(--stoa-bg)]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] flex-1 ${
                isActive ? 'text-[var(--stoa-accent)]' : 'text-[var(--stoa-text-muted)]'
              }`
            }
          >
            <span className="relative text-base leading-none">
              {item.icon}
              {item.key === 'analytics' && hasUnviewedReport && (
                <span
                  aria-label={t('analytics.unviewedReportBadge')}
                  className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-[var(--stoa-danger)]"
                />
              )}
            </span>
            {t(`nav.${item.key}`)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
