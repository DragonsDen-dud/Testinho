import type { ReactNode } from 'react'

/**
 * Layout primitive: badge (leading, fixed width) / title+subtitle
 * (flexible, truncates) / trailing content (arbitrary — HeroValue or
 * otherwise, including its own interactive elements, e.g. a per-row
 * reset button). Uses logical properties (ms, text-start) instead of
 * physical ones like ml/text-left so the row doesn't hardcode LTR — a
 * plain flex row already reverses correctly under dir="rtl" on its own,
 * and the gap utility is direction-agnostic, so those two plus the
 * logical text-alignment utilities are enough; STOA has no RTL locale
 * today (voice input in Russian is still LTR), so this is unverified in
 * practice, just not actively broken by construction.
 *
 * The clickable variant uses role="button" on a div, not a real button
 * element, specifically so "arbitrary" trailing content is free to
 * include its own button without landing inside invalid nested-button
 * HTML.
 */
export function MinimalListRow({
  badge,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  badge: ReactNode
  title: string
  subtitle?: string
  trailing?: ReactNode
  onClick?: () => void
}) {
  const className =
    'flex items-center gap-3 w-full min-h-11 rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] px-3.5 py-3 text-start'

  const content = (
    <>
      <span className="shrink-0">{badge}</span>
      <span className="flex-1 min-w-0 flex flex-col items-start">
        <span className="text-sm font-medium truncate w-full text-start">{title}</span>
        {subtitle && <span className="text-xs text-[var(--stoa-text-muted)] truncate w-full text-start">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 ms-auto">{trailing}</span>}
    </>
  )

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        className={className}
      >
        {content}
      </div>
    )
  }
  return <div className={className}>{content}</div>
}
