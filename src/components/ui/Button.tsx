import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[var(--stoa-accent)] text-[var(--stoa-bg)] hover:opacity-90',
  secondary:
    'bg-transparent border border-[var(--stoa-border)] text-[var(--stoa-text)] hover:bg-[var(--stoa-border)]/30',
  ghost: 'bg-transparent text-[var(--stoa-text-muted)] hover:text-[var(--stoa-text)]',
  danger: 'bg-transparent border border-[var(--stoa-danger)] text-[var(--stoa-danger)] hover:bg-[var(--stoa-danger)]/10',
  // Today-screen-only in practice (Articles 3/6/19 round) — the "just
  // completed" fill, distinct from `primary` so a confident blue CTA and
  // a green "done" state never collide on the same color.
  success: 'bg-[var(--stoa-success)] text-white hover:opacity-90',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /**
   * Swaps the `primary` variant for the vibrant gradient/shadow/press
   * treatment (Articles 3/6/19 round) instead of the plain flat fill.
   * Scoped to Today this round — callers elsewhere never pass this.
   */
  vibrant?: boolean
}

export function Button({ variant = 'primary', vibrant = false, className = '', ...rest }: Props) {
  const base = variant === 'primary' && vibrant ? 'stoa-btn-primary-vibrant' : variantClasses[variant]
  return (
    <button
      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${base} ${className}`}
      {...rest}
    />
  )
}
