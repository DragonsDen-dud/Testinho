import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

const fieldBase =
  'w-full rounded-xl border border-[var(--stoa-border)] bg-[var(--stoa-surface)] text-[var(--stoa-text)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--stoa-accent)] placeholder:text-[var(--stoa-text-muted)]'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldBase} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className ?? ''}`} />
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--stoa-text-muted)]">{label}</span>
      {children}
    </label>
  )
}
