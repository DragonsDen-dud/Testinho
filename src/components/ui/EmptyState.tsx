export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-10 px-4 text-sm text-[var(--stoa-text-muted)]">{text}</div>
  )
}
