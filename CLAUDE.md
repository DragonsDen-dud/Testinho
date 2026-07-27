# CLAUDE.md — STOA project memory

This file exists so a brand-new Claude Code session, with zero chat history, can pick up
this project correctly. It documents what has actually been established across real
rounds of work — it does not invent new rules. If something here looks wrong, check
`SPEC.md` and real git history before assuming this file is right; SPEC.md is the
contract, this file is operational memory on top of it.

**Read `SPEC.md` first, always**, before starting any round. It is the single source of
truth for architecture and product decisions (Articles 1–57, full data model, the
non-negotiables in Section G). `README.md` documents practical implementation notes and
scope calls made along the way. `STOA_handoff_note.md` is a historical snapshot from an
earlier session handoff — useful context, but this file supersedes it for anything about
current workflow/deploy process.

---

## 1. Design system vocabulary

STOA has a real, established visual/design system (built across several "Design System"
and "Habits 2.0" rounds) — don't reinvent pieces of it that already exist.

- **`resolveCategoryStyle`** (`src/data/categoryStyles.ts`) — the single resolver for a
  category's color+icon: an explicit Pro Settings override always wins; otherwise a
  deterministic hash-based default (`CATEGORY_ICONS`/`PRESET_COLORS` in
  `src/lib/categoryStyle.ts`) is derived from the entity's own native color. Every
  category-colored badge in the app goes through this — never `LifeDomain.color` or
  `Project.color` directly.
- **Shared primitives**: `ColorIconBadge` (`src/components/ui/ColorIconBadge.tsx` — sizes
  `row`/`tray`/`detail`, solid fill + `accessibleTextColor`-computed icon color, optional
  corner `indicator`), `HeroValue` (the "one big number" typography convention —
  `text-2xl font-semibold tabular-nums`), `MinimalListRow` (badge/title/subtitle/trailing
  row layout), `DueDateChip` (three tones: overdue/today/neutral), `IconPicker` (the
  shared 20-icon grid used both in Pro Settings and habit creation/editing).
- **Per-entity badge wrappers**: `HabitCategoryBadge` and `TaskCategoryBadge` — thin
  wrappers that resolve a Habit's/Todo's real color+icon (via `resolveCategoryStyle`) and
  render a `ColorIconBadge`. These, not `ColorIconBadge` directly, are what a screen
  should reach for when showing a habit or task's category identity.
- **The "closed circuit" principle**: a category's color/icon must render *identically*
  everywhere it appears — its home tab, Pro Settings, Planning's linked-item list, Today.
  Editing a category's style in Pro Settings must propagate to every one of those
  surfaces live, with no reload. This is the standard verification every round runs:
  edit a domain's color/icon in Pro Settings, confirm every badge referencing it updates
  in place.
- **Color never alone**: color-coding is always paired with an icon or a distinct glyph,
  never the sole signal for something (e.g. build-vs-avoid habits get both a color *and*
  a corner indicator glyph — never color alone).
- **`PriorityLevel`'s deliberate colorlessness**: `PriorityLevel` has no `color` field.
  Priority is shown via icon/weight only (`priorityDotTone` maps `sortOrder` to a
  3-tier flag icon, never a per-level custom hex). This is a documented, intentional
  reconciliation in `SPEC.md` itself (see the note under `PriorityLevel` in Section D) —
  not a gap to "fix" by adding a color field.
- **"Flag, don't fork"**: when a screen needs a shared component to behave slightly
  differently, add a small optional prop/variant to the existing component rather than
  duplicating it into a parallel implementation. Real examples already in the codebase:
  `HabitCard`'s `vibrant`/`onLogged` props, `ConnectedTaskCard`'s `onChecked` prop
  (mirrors the older `TodoItem.onChecked` contract exactly), `ColorIconBadge`/
  `TaskCategoryBadge`/`HabitCategoryBadge`'s `'tray'` size variant. All are optional,
  default to the existing behavior, and don't change the component's appearance for
  callers that don't pass them.
- **The tray/bubble completion pattern**: a completed-today habit or task renders as a
  `ColorIconBadge` "bubble" (its real icon+color, `'tray'` size) in a "Done today" tray,
  not a plain checked-off row — see `CompletedHabitBubble.tsx` / `CompletedTaskBubble.tsx`
  and the `habit-collapse-in`/`habit-collapse-in-milestone` CSS entrance animation
  (`src/index.css`). This is Article 6-compliant by construction: streak tier is a small
  visual caption (flame/sprout/trophy icon + count), never a score, points, or reward.
  When extending this pattern to a new entity type, reuse the same animation classes and
  the same `'tray'` badge size rather than inventing a new visual.

## 2. Workflow

Every round follows the same shape:

1. **Explicit written brief** (from Denys) — often saved to `docs/briefs/*.md` in the
   repo rather than only pasted in chat, so a session can `Read` it directly. Follow
   whatever Definition of Done and reporting format the brief itself specifies.
2. **Implement**, staying inside the brief's stated scope. Disclose (don't silently
   decide) any judgment call, deviation, or place the brief's own instructions conflict
   with reality — the established convention here is over-disclosure, not confident
   silence.
3. **`npm run build`** (`tsc -b && vite build` — the real gate; plain `tsc --noEmit` has
   been proven to miss real errors in this project's history) and `npm run test`
   (vitest) must both be clean before calling anything done.
4. **Live-verify on the real production URL**, `https://stoa-app-cyan.vercel.app` — not
   just local dev, not a Vercel preview URL (a preview has its own empty local
   database and has caused confusion before). If the environment you're running in
   cannot reach that URL (a real, recurring limitation in some sandboxed sessions —
   confirm with a direct request, don't assume), say so explicitly and use a local dev
   server + Playwright as a disclosed substitute. Never silently skip live verification.
5. **Structured report back**, ending with the DEPLOY STATUS line (see §4 below).

## 3. Deploy process

- **The actual default/production-tracking branch is `claude/attachment-processing-uqs6kk`**
  — confirmed via the repo's own `default_branch` field, not assumed from a branch name
  like "main" (this repo has no `main` branch at all). Re-verify this if it's been a
  while; it's a fact about the repo, not a fixed convention, and it has already changed
  once before.
- Claude Code sessions on this project work on a feature branch (per that session's own
  Git Development Branch Requirements, typically named something like
  `claude/<slug>`) and **must open a real pull request into the actual default branch
  above** — pushing to a feature branch and stopping there is not "done," regardless of
  how much verified work is on it. Confirm the PR is actually merged (not just opened)
  before reporting a round as shipped.
- Vercel deploys via its own GitHub App integration — there is no GitHub Actions
  workflow in this repo for it. A pull request's commits get a **Preview** deployment
  (visible as a "Vercel Preview Comments" GitHub check run, plus a `Vercel` status check
  on the PR's head commit — that status check reflects the Preview, not Production).
  Merging into the default branch triggers a separate **Production** deployment.
- **To confirm a Production deployment exists for a given commit**: check the commit
  that's actually at the tip of the default branch after merge (not the PR's head SHA —
  a merge commit has its own SHA) via the Vercel dashboard, or by loading the real
  production URL directly and confirming the change is visibly present. A PR's own
  status checks are not sufficient evidence of a Production deploy — they're evidence of
  a Preview deploy. If you cannot reach either the Vercel dashboard or the production
  URL from your current environment, say so plainly rather than inferring "merged, so
  presumably deployed."

## 4. Deploy-status reporting requirement

Every report back to Denys ends with one explicit line in this shape:

```
DEPLOY STATUS: [branch name] — [merged into production branch: yes/no] —
[Vercel Production deployment confirmed: yes/no] — [action needed from
Denys, if any, e.g. "needs PR merge" or "already live, nothing needed"]
```

This is not optional flavor text. It exists specifically because "is this actually
live" confusion has happened more than once on this project — several rounds shipped
real, working, tested code that sat merged (or not even merged) for a while before
Denys realized it wasn't confirmed live. Adopt this line unconditionally, even for a
round that touched no deploy-relevant code — state clearly that nothing changed
deploy-wise if that's the case.

## 5. Changelog requirement

`public/changelog.json` is a manually maintained list (Article 56), newest entry
**first** (`CHANGELOG[0]` is always "current version") — not generated from commit
history. **Every user-facing round must add a real entry to this file as part of that
round, not after.** This was missed for several rounds in a row (Design System Parts
2–3, Habits 2.0, Planning badges, the Today redesign all shipped real user-facing
changes with zero new changelog entries) and had to be backfilled later — don't repeat
that.

Rules that are enforced by a real test (`src/lib/changelog.test.ts`), not just convention:

- Each entry needs **2–3 bullets** — no more, no fewer. If a round is too small to
  honestly produce 2 bullets on its own, bundle it into the same version entry as an
  adjacent small round (this file already does this — e.g. v1.2.0 bundles the PWA
  changelog-banner feature with the first Pro Settings screen) rather than padding with
  filler or leaving a 1-bullet entry.
- Bullets are genuine user-facing summaries in plain language ("Habits now show
  completed-today as icon bubbles"), never a commit message or internal name.

**Important mechanical limitation, not a bug**: both consumers of this file —
`src/lib/pwaChangelog.ts` (the "update available" banner) and
`src/components/whatsnew/WhatsNewSheet.tsx` (the one-time "What's New" sheet, Article
56) — only ever show `CHANGELOG[0]`, the single newest entry. A user who was on an old
version and updates straight to the newest one will only ever see the latest entry's
bullets, never a cumulative list of everything they missed in between. Older entries in
the file are historical record only, exactly like v1.0.0/v1.1.0 already are relative to
whatever is current now. This means: when backfilling several skipped rounds at once,
only the round that ends up as the new top entry will actually be visible to a real user
— say so explicitly when reporting a changelog backfill, don't imply all backfilled
entries will surface.

Also: an entry only actually appears in the banner/sheet once a Production build
containing it is live — adding an entry to the file in a commit that hasn't been merged
and deployed yet is invisible until it is. That's correct behavior, not a bug to chase.

## 6. Network/environment limitations (recurring, not new each time)

Some sessions run in an environment whose outbound network policy blocks direct access
to `stoa-app-cyan.vercel.app` (confirmed via `curl`/`WebFetch` returning a 403 at the
proxy layer). This is a known, previously-disclosed, environment-level limitation — not
something to keep re-discovering silently. When it applies:

- State it plainly in your report rather than pretending live verification against
  production happened.
- Use a local dev server (`npm run dev`) + Playwright as the disclosed substitute for
  live verification, and say so.
- It does not excuse skipping the DEPLOY STATUS line — if you can't confirm a Production
  deployment directly, the line should say `Vercel Production deployment confirmed: no
  (network policy blocks direct verification this session)`, not a guess either way.
