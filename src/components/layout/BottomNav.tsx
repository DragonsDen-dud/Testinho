import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { Home, Repeat, ListChecks, NotebookPen, CalendarDays, BarChart3, Search, Settings } from 'lucide-react'
import { useAppSettings } from '../../state/useAppSettings'
import { useHasUnviewedScheduledReport } from '../../state/useDiagnostics'

// Article-A.3 consistency audit: all 8 tabs resolve to the same icon
// package (lucide-react), the same size/stroke-width (set once below, no
// per-icon override), and inherit color via currentColor from the same
// active/inactive class logic — never a hardcoded per-icon color.
const items = [
  { to: '/', key: 'dashboard', Icon: Home },
  { to: '/habits', key: 'habits', Icon: Repeat },
  { to: '/todos', key: 'todos', Icon: ListChecks },
  { to: '/journal', key: 'journal', Icon: NotebookPen },
  { to: '/planning', key: 'planning', Icon: CalendarDays },
  { to: '/analytics', key: 'analytics', Icon: BarChart3 },
  { to: '/search', key: 'search', Icon: Search },
  { to: '/settings', key: 'settings', Icon: Settings },
] as const

const ICON_SIZE = 24
const ICON_STROKE_WIDTH = 1.75

export function BottomNav() {
  const { t } = useTranslation()
  const settings = useAppSettings()
  // Article 12 — replaces the old Dashboard banner: an unread scheduled
  // report now surfaces as a small dot on the Analytics tab instead of a
  // popup on every app open, cleared by actually visiting Analytics (see
  // AnalyticsPage's mark-viewed effect).
  const hasUnviewedReport = useHasUnviewedScheduledReport(settings?.activeSpaceId)

  return (
    // Flat, not glass — no backdrop-blur, a plain hairline top border and
    // a fully solid background, consistent with the no-glass decision
    // already made for the Tasks tab redesign.
    <nav className="sticky bottom-0 border-t border-[var(--stoa-border)] bg-[var(--stoa-bg)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-h-11 flex-1 text-[10px] transition-opacity duration-150 ${
                isActive ? 'text-[var(--stoa-accent)] opacity-100' : 'text-[var(--stoa-text-muted)] opacity-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-transform duration-150 active:scale-90 ${
                    isActive ? 'bg-[var(--stoa-accent-soft)]' : ''
                  }`}
                >
                  <item.Icon size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} aria-hidden />
                  {item.key === 'analytics' && hasUnviewedReport && (
                    <span
                      aria-label={t('analytics.unviewedReportBadge')}
                      className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-[var(--stoa-danger)]"
                    />
                  )}
                </span>
                {t(`nav.${item.key}`)}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
