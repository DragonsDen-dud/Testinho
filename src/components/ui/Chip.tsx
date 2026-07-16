export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        selected
          ? 'bg-[var(--stoa-accent)] border-[var(--stoa-accent)] text-[var(--stoa-bg)]'
          : 'border-[var(--stoa-border)] text-[var(--stoa-text-muted)] hover:text-[var(--stoa-text)]'
      }`}
    >
      {label}
    </button>
  )
}
