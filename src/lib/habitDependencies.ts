import type { Habit, HabitLog } from '../db/types'

/** Article 25 — names of prerequisite habits not yet marked done today; empty if unblocked. */
export function unmetDependencyNames(
  habit: Habit,
  allHabits: Habit[],
  logsToday: Map<string, HabitLog>,
): string[] {
  if (!habit.dependsOnHabitIds?.length) return []
  return habit.dependsOnHabitIds
    .map((id) => allHabits.find((h) => h.id === id))
    .filter((dep): dep is Habit => !!dep && logsToday.get(dep.id)?.status !== 'done')
    .map((dep) => dep.name)
}

/**
 * Article 25 — rejects a dependency edit that would create a cycle (A cannot
 * depend on B if B directly or transitively already depends on A). Call
 * before saving `habitId`'s dependsOnHabitIds = candidateDependsOn.
 */
export function wouldCreateCycle(
  habitId: string,
  candidateDependsOn: string[],
  allHabits: Habit[],
): boolean {
  const dependsOn = new Map<string, string[]>()
  for (const h of allHabits) dependsOn.set(h.id, h.dependsOnHabitIds ?? [])
  dependsOn.set(habitId, candidateDependsOn)

  const visited = new Set<string>()
  function reachesSelf(fromId: string): boolean {
    for (const nextId of dependsOn.get(fromId) ?? []) {
      if (nextId === habitId) return true
      if (visited.has(nextId)) continue
      visited.add(nextId)
      if (reachesSelf(nextId)) return true
    }
    return false
  }
  return reachesSelf(habitId)
}
