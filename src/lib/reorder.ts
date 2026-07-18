/**
 * Article 45 — pure array-move helper, extracted out of
 * HomeScreenOrderSection so the reorder mechanics are unit-testable without
 * rendering/simulating pointer events.
 */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
