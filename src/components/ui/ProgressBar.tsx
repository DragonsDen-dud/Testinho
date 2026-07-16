export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-[var(--stoa-border)] rounded-full h-1.5 overflow-hidden">
      <div className="h-full bg-[var(--stoa-accent)] transition-all" style={{ width: `${percent}%` }} />
    </div>
  )
}
