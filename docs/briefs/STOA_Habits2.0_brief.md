# STOA — Habits 2.0: creation flow, completion visualization, cross-tab interconnection
### Expands Parts 1–2's Habits work; precedes Part 4 (Journal/Planning/Analytics)

## CONTEXT
Habits currently show too much info in some places and too little
actionable info in others (Denys's own framing). Parts 1–2 already
established: `categoryStyles` resolver, `ColorIconBadge` / `HeroValue` /
`MinimalListRow`, the "Done today" tray with tiered flame/sprout/trophy
streak visuals (Article 6 — no real gamification, keep enforced), and
build/avoid/dependency/pause indicators. This round revisits three things
specifically: how a habit's icon gets chosen at creation, how completed-
today habits are visualized, and whether/how Habits should interconnect
with Tasks and Planning. Read SPEC.md first, as always.

## GOAL
Three related but separable improvements. Treat each as its own
sub-deliverable with its own live verification — don't ship all three as
one untestable blob.

---

## PART A — Icon picker at habit creation

**Decision (confirmed with Denys):** icon is chosen manually from a
curated icon set right in the creation form — not auto-suggested from a
habit-template library, not left to the Part 1 hash default silently.

- Add an icon-picker control to the habit creation/edit form: a curated
  grid (reuse the same icon set and grid pattern Pro Settings' icon picker
  already uses from Part 1 — don't build a second one).
- Color: keep resolving from the habit's LifeDomain as established in
  Part 1/2 (this round is about icon choice, not color choice) — unless
  Denys wants per-habit color override independent of its domain, which
  is NOT assumed here; if the creation form's icon picker makes users
  expect a color picker too, flag that as an open question rather than
  building it silently.
- The hash-based default from Part 1 becomes the *pre-selected* value in
  the picker (so the grid opens with something reasonable highlighted),
  not a silent fallback the user never sees — this keeps Part 1's
  determinism useful (Pro Settings reset-to-default still works exactly
  as before) while giving real choice at creation time.
- Existing habits are unaffected — this only changes the creation/edit
  flow, not how currently-styled habits render.

**Definition of done (Part A):**
- `npm run build` clean.
- Live-verified: create a new habit, confirm the icon grid appears, pick a
  non-default icon, confirm it persists and matches in Habits list, Pro
  Settings, and anywhere else the badge renders (the closed-circuit test,
  same as every prior round).

---

## PART B — Completed-today habits as iPhone-style icon bubbles

**Decision (confirmed with Denys):** when a habit is completed today, it
should visually read as a rounded icon bubble showing *that habit's own
icon* — the way a home-screen app icon reads — not a generic emoji tier.
A GitHub-style calendar-heatmap view is a **separate, deferred** idea for
Analytics later — do not build it this round, just note it doesn't
conflict with this one.

- The existing "Done today" tray is the right home for this — extend it,
  don't replace its mechanism. Today's completed habits appear as a row/
  grid of rounded-square-or-circle bubbles (match whatever `ColorIconBadge`
  currently renders as — circle, per Part 1 — for visual consistency
  rather than introducing app-icon-style rounded-squares as a one-off
  shape).
- Each bubble = that habit's actual `ColorIconBadge` (its real
  color+icon), sized larger than the row-size variant used in the list —
  propose a "tray size" variant if the existing two (row/detail) don't fit
  well, and disclose why rather than stretching an existing one awkwardly.
- The tiered flame/sprout/trophy streak visual (Article 6) — clarify with
  this round whether it now lives *inside/adjacent to* each bubble (e.g. a
  small badge-on-badge for streak tier) or is retired in favor of the
  habit's own icon being the whole visual. Propose the option that reads
  cleanest rather than cramming both into one bubble, and flag which you
  chose.
- Not-yet-completed habits stay in the list exactly as Part 2 built them
  (`MinimalListRow`) — this round only changes what happens to a habit
  once it's checked off today, not the pre-completion list.
- Animation: preserve the existing slide-into-tray completion animation
  if it still fits the new bubble visual; if the new bubble size/shape
  makes the old animation look wrong, adjust the animation to match rather
  than dropping it.

**Definition of done (Part B):**
- `npm run build` clean.
- Live-verified: completing a habit moves it into the tray as a bubble
  showing its real icon/color, un-completing removes it back to the list,
  tray remains legible with several habits completed (test with 5+).
- Confirm streak-tier treatment decision is visually clear either way.

---

## PART C — Interconnection with Tasks and Planning (proposal, not blind build)

Denys wants Habits to feel "smooth and interconnected" with Tasks and
Planning, but hasn't specified a mechanism — this needs a concrete
proposal before implementation, not an assumption.

**What to do:** don't build this blind. Instead, look at what major habit/
productivity apps actually do for cross-entity interconnection (e.g. a
habit that auto-generates a daily task instance, a Planning view that
shows habits and tasks on one shared timeline, a habit tied to a project's
completion criteria) and **propose 2–3 concrete, scoped options** with a
one-line tradeoff each — the same way `message_compose_v1`-style option
framing works, but as engineering options, not code yet. Examples of the
shape of proposal expected (do not build these — this is illustrative of
the level of concreteness wanted):
- *Shared "Today" surface*: habits and today's tasks render in one
  combined chronological/priority list somewhere (Today tab, out of this
  round's scope, or a new Planning view) — high value, higher scope.
- *Soft linking*: a habit can optionally reference a Project (already
  possible via LifeDomain/Project overlap if any exists — check SPEC.md)
  so its completions show up in that Project's context — low scope,
  clarifies existing data model rather than adding new relations.
- *Planning-only surfacing*: reuse Part 4's planned "show linked
  Habit/Task badges in Planning entries" (already scoped for Part 4) as
  the actual interconnection point, and treat that as sufficient — lowest
  scope, reuses work already planned.

**Definition of done (Part C, this round):** a written proposal (in the
report, not code) with options and tradeoffs — no implementation this
round unless Denys picks an option and a follow-up brief is written for it.

---

## WHAT NOT TO DO
- Don't build the GitHub-heatmap streak view — that's a separate, deferred
  Analytics idea.
- Don't touch Tasks, Journal, Planning, or Analytics code (aside from the
  Part C proposal being informed by what Part 4 already scopes for
  Planning — no code changes there this round).
- Don't add a per-habit color override unless Denys explicitly asks for
  it — flag it as a question if the icon-picker UI makes its absence feel
  incomplete, don't quietly add it.
- Don't touch `categoryStyles`, Pro Settings' own icon picker (reuse it,
  don't fork it), or the Article 6 no-gamification boundary.

## WHAT TO REPORT BACK
- Part A: confirmation of the closed-circuit check for newly-created
  habits' icons.
- Part B: which bubble size/shape was used and why, and how the
  streak-tier visual was resolved (inside the bubble vs. retired vs.
  adjacent) — with screenshots of the tray at 1, 3, and 6+ completed
  habits.
- Part C: the 2–3 proposed interconnection options with tradeoffs — this
  is the actual deliverable of Part C, not code.
- Any deviation from this brief, however small.
