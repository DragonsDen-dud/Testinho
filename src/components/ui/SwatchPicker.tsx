export function SwatchPicker({
  options,
  value,
  onChange,
  kind,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
  kind: 'color' | 'icon'
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => onChange(opt)}
          aria-label={opt}
          className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-base transition-transform ${
            value === opt ? 'border-[var(--stoa-accent)] scale-110' : 'border-transparent'
          }`}
          style={kind === 'color' ? { background: opt } : { background: 'var(--stoa-surface)' }}
        >
          {kind === 'icon' ? opt : null}
        </button>
      ))}
    </div>
  )
}
