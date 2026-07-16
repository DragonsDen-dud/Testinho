import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[var(--stoa-accent)] text-[var(--stoa-bg)] hover:opacity-90',
  secondary:
    'bg-transparent border border-[var(--stoa-border)] text-[var(--stoa-text)] hover:bg-[var(--stoa-border)]/30',
  ghost: 'bg-transparent text-[var(--stoa-text-muted)] hover:text-[var(--stoa-text)]',
  danger: 'bg-transparent border border-[var(--stoa-danger)] text-[var(--stoa-danger)] hover:bg-[var(--stoa-danger)]/10',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return (
    <button
      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
      {...rest}
    />
  )
}
