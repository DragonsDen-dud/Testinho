import type { AppSettings } from '../db/types'

/**
 * Habits Refocus round — the single flag gating the entire Tasks/Planning
 * surface.
 *
 * What it gates is *presentation and reachability only*. Nothing here
 * deletes, migrates, or rewrites a Todo, Project, PlanEntry or any of their
 * cross-references: `listActiveTodos`/`listActiveProjects` and every data
 * function under `src/data/` are untouched, Trash still holds and restores
 * all three types, and the full JSON backup (Article 18) still enumerates
 * `db.tables()` generically, so a backup taken while the flag is off is
 * byte-for-byte as complete as one taken while it's on. Flipping the flag
 * back on is a pure UI change — there is nothing to migrate back.
 *
 * The flag lives in AppSettings rather than as a build-time constant,
 * following the precedent of `moodCaptureEnabled` and
 * `crossSpaceOverviewEnabled` (SPEC.md Article 3 — a user-facing toggle
 * belongs in the database, not in code).
 */
export function isTasksPlanningEnabled(settings: AppSettings | null | undefined): boolean {
  // Explicitly `=== true`, not truthiness: undefined (every install that
  // predates this round) resolves to Habits-focused mode without a
  // migration writing the field first.
  return settings?.tasksPlanningEnabled === true
}

/** Every top-level route segment the flag gates. Habit/Journal/Analytics/
 * Search/Settings routes are never in here. */
export const TASKS_PLANNING_ROUTE_PREFIXES = ['/todos', '/projects', '/planning'] as const

/** True for a gated route itself and anything nested under it
 * (`/todos/overdue`, `/projects/:id`, …). Matches on a full path segment so
 * a future `/todos-archive` route wouldn't be swept up by accident. */
export function isTasksPlanningRoute(pathname: string): boolean {
  return TASKS_PLANNING_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
