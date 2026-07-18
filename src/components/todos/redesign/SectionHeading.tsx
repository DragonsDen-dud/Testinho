// Shared between the Stage 1 preview and the real TodosPage — a single
// source of truth for the section-label treatment (uppercase, tracked,
// color driven by --color-heading which .section-overdue/.section-someday
// override).

export function SectionHeading({ label }: { label: string }) {
  return <div className="text-section-header uppercase text-heading">{label}</div>
}
