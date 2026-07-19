import type { ReactNode } from 'react'

/**
 * Read-only pill for the Habit/Todo Detail Views — Tesla-token styling
 * (bg-chip/text-ink-muted/rounded-pill), matching TaskCard's own private
 * Chip exactly, since these sheets are explicitly meant to share that
 * visual language. Never interactive (no onClick) — this is a "showing
 * information," not a "choosing an option" surface.
 */
export function InfoChip({ children, alert }: { children: ReactNode; alert?: boolean }) {
  return (
    <span
      className="text-task-meta rounded-pill px-2.5 py-1 shrink-0 inline-flex items-center gap-1"
      style={{
        background: alert ? 'rgba(224, 30, 44, 0.1)' : 'var(--color-chip)',
        color: alert ? 'var(--color-accent-alert)' : 'var(--color-ink-muted)',
      }}
    >
      {children}
    </span>
  )
}
