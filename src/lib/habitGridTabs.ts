/**
 * Which tab the habit grid shows.
 *
 * Extracted from HabitGrid so the rule is testable without a DOM, because
 * it is the one piece of that component with a genuine edge case: the grid
 * should *land* on whichever tab has content, but must never override an
 * explicit choice afterwards. Written as "default until chosen" rather than
 * an effect that flips state, so switching to an empty "Done" tab and
 * watching it bounce back is impossible by construction.
 */
export type HabitGridTab = 'todo' | 'done'

export function resolveGridTab(args: {
  notDoneCount: number
  doneCount: number
  /** True once the user has tapped a tab in this session. */
  hasChosen: boolean
  chosen: HabitGridTab
}): HabitGridTab {
  if (args.hasChosen) return args.chosen
  // Only divert to Done when there is genuinely nothing left and something
  // to show there — an empty day stays on "To do", which is where a new
  // habit would appear.
  if (args.notDoneCount === 0 && args.doneCount > 0) return 'done'
  return 'todo'
}
