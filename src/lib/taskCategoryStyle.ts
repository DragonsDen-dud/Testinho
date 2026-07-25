import { resolveCategoryStyle } from '../data/categoryStyles'
import type { Project, LifeDomain, CategoryStyle } from '../db/types'

// Deliberately NOT one of PRESET_COLORS' 12 hash-selectable hues (the
// brief's own DoD requires this fallback to be impossible to mistake for a
// real hash-generated Project color) — a plainly desaturated mid-gray,
// visibly quieter than even PRESET_COLORS' own slate entry (#64748b),
// which Habits' Part 2 no-domain fallback reused and which — unlike this
// requirement — technically COULD collide with a real hashed domain color.
// Not fixed there (out of scope, Habits is untouched this round), just
// flagged.
export const NO_PROJECT_COLOR = '#9ca3af'
export const NO_PROJECT_ICON = 'Inbox'

/**
 * Shared decision logic between TaskCategoryBadge (the badge itself) and
 * ConnectedTaskCard (which separately needs the resolved color for the
 * optional checkmark tint, section 6) — both already call the hooks that
 * produce `project`/`domain`/`styleMap` for their own other purposes, so
 * this stays a plain function rather than a second component to avoid.
 *
 * Project wins when a task has one; LifeDomain is the fallback (matching
 * the precedent already established pre-Part-3: "Project.color wins...
 * falls through to the domain's color if the project didn't set its
 * own") — a task with a Domain but no Project still has a real category
 * identity, just from the other entityType, so it does NOT get the
 * neutral "unassigned" badge. The neutral badge is reserved for a task
 * with neither, per the brief's own "No-Project fallback" section naming
 * only the true no-category case.
 */
export function resolveTaskCategoryStyle(
  project: Project | undefined,
  domain: LifeDomain | undefined,
  styleMap: Map<string, CategoryStyle>,
): { color: string; icon: string } {
  if (project && !project.deletedAt) {
    const explicitRow = styleMap.get(`project:${project.id}`)
    return resolveCategoryStyle('project', project.id, project.color, explicitRow)
  }
  if (domain) {
    const explicitRow = styleMap.get(`lifeDomain:${domain.id}`)
    return resolveCategoryStyle('lifeDomain', domain.id, domain.color, explicitRow)
  }
  return { color: NO_PROJECT_COLOR, icon: NO_PROJECT_ICON }
}
