import { Input } from './Input'

/**
 * Free-text icon entry — the user types/pastes any emoji via their own
 * keyboard's emoji key (iOS/Android/desktop all expose one on any text
 * field; there's no special HTML attribute that forces it open). Unlike
 * SwatchPicker, this isn't constrained to a preset list — the stored value
 * (`LifeDomain.icon`/`Space.icon`) has always been a plain string, so any
 * emoji entered here round-trips exactly like a preset one would.
 */
export function EmojiInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 border border-[var(--stoa-border)] bg-[var(--stoa-surface)]">
        {value || '·'}
      </span>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={16}
        placeholder={placeholder ?? '🏠'}
        className="w-24 text-center text-lg"
      />
    </div>
  )
}
