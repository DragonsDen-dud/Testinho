# STOA-8 — Emoji keyboard icon input + one unified habit creation flow

Brief from Denys, 2026-09-03. Saved verbatim so a later session can `Read` it.

Read `CLAUDE.md` and `SPEC.md` first, as always. Follow the established workflow and the DEPLOY STATUS reporting convention documented there. Build on top of PR #17 (the icon picker round) — don't re-litigate it.

## HOW THIS ROUND SHOULD GO

Two parts. Part A is a self-contained feature — build it. Part B is mostly an audit and a proposal — the consolidation itself is implementable, but the LifeDomain question is a schema-level decision that comes back to me before anything is removed or migrated. Don't collapse those two postures into one; the round is reviewable precisely because Part A ships and Part B is presented for a decision.

Same standing constraints as every prior round: no gamification (Article 6), Tasks/Planning stays flag-off, no new heavyweight dependency without disclosing it, and no silent schema changes.

## PART A — Native emoji keyboard as a third icon option

PR #17 shipped two ways to give a habit an icon: a curated ~130-emoji grid, and a photo upload. Add a third: a plain text input the user can tap into and type any emoji from their device's native keyboard (iOS/Android), used as the habit's icon exactly the way a grid-picked emoji is.

Requirements:

- All three options — curated grid, type-your-own, photo — sit side by side in the same picker UI. Not separate screens, not a nested menu, not a "more options" disclosure. One picker, three affordances, visible at once.
- Constrain to a single emoji. If the user types text alongside an emoji, or multiple emoji, resolve to one emoji character and discard the rest. Be careful with the details here, because naive `.length`/`slice(0,1)` handling gets this wrong:
  - Multi-codepoint emoji (ZWJ sequences like 👨‍👩‍👧, skin-tone modifiers like 👍🏽, flags) are a single user-perceived character but multiple code units — treat them as one emoji, don't truncate them into a broken fragment.
  - Use grapheme-aware handling (`Intl.Segmenter` where available, or whatever the project already uses if there's precedent) rather than raw string indexing.
  - Decide and disclose what happens on empty/invalid input — falls back to the previous icon, a default, or blocks save.
- Rendering must be identical to a grid-picked emoji. Confirm explicitly how this interacts with PR #17's photo-vs-emoji tile rendering logic. A typed 🦑 and a grid-tapped 🏃 should go down the same render path — if they don't, that's the bug to fix, not to work around.
- Verify on a real mobile device or the closest equivalent your setup allows — this is a feature about the native keyboard, so a desktop-only check doesn't actually verify it. Disclose what you tested on.

## PART B — Collapse habit creation into one flow

The problem: there are currently two creation paths — the full `HabitForm` and `QuickCreateHabitModal`. They have already drifted out of sync at least once (the PR #17 icon picker had to be added to each separately). Two paths means every future habit-creation feature costs double and silently rots in one of them.

What I want:

1. One creation flow. Full stop. No quick-create/full-create split. Editing gets the same treatment — one edit flow, structurally the same as creation, not a parallel implementation.
2. The target feel is a single clean linear cycle: `name → icon (Part A) → habit type (build/avoid) → done.` That's the spine. Everything currently in creation that isn't part of that spine is a candidate to cut or relocate.
3. Audit the current form for structural bloat and report what's there. For each field: is it required at creation, or could it live in a post-creation details/settings screen without hurting anything? Reminders, schedule, measurable config, stake, dependsOn, time block — all fair game to question.

The LifeDomain question — this is the decision point:

LifeDomain ("life aspects") is a schema-level concept referenced across Habits, Planning, and Analytics. It is exactly the kind of thing that looks like clutter in the creation form and turns out to be load-bearing three screens away.

- Do not remove it, migrate it, or drop it from creation unilaterally. Not this round, not as a "clearly small and safe" inclusion.
- Instead: trace every place it's actually read and used, and report that. Then propose what should happen to it — keep it in creation, move it to a post-creation step, make it optional with a sensible default, or something better you've thought of.
- Present the proposal with effort/impact and wait for my confirmation before touching schema or removing the field.

If the consolidation itself (merging the two paths) can land cleanly without resolving LifeDomain first, do that part and leave LifeDomain exactly where it currently sits pending my decision. If the two are genuinely entangled and consolidation can't ship without a LifeDomain call, say so plainly and stop at the proposal rather than picking for me.

## WHAT NOT TO DO

- Don't ship any LifeDomain schema change, migration, or removal in this round.
- Don't keep `QuickCreateHabitModal` alive "just in case" behind a flag — the whole point is one path. If you think there's a real reason to preserve it, argue for it in the report rather than quietly doing it.
- Don't degrade the one-tap habit-completion action anywhere in this work — creation flow changes must not touch the logging path.
- Don't build a custom in-app emoji keyboard. Part A is specifically about handing off to the device's native one.
- Don't add gamification (Article 6), and don't touch Tasks/Planning.

## DEFINITION OF DONE

- `npm run build` clean, existing test suite passing.
- Typed-emoji path verified end-to-end: type an emoji → save → it renders correctly on the habit card, the detail view, and anywhere else icons appear.
- Multi-codepoint emoji (ZWJ, skin tone, flag) explicitly tested — not just simple single-codepoint ones.
- Creation and editing verified through the single consolidated flow.
- Verified against the production URL where possible via the Vercel MCP per `CLAUDE.md §6` (`curl`/`WebFetch` are blocked at the proxy — use `list_deployments` / `web_fetch_vercel_url`, and disclose which verification path you actually used).
- `changelog.json` entry added.
- DEPLOY STATUS line included in the report.

## WHAT TO REPORT BACK

- How single-emoji constraint is enforced, and the grapheme handling used for multi-codepoint emoji.
- Confirmation that typed and grid-picked emoji share one render path.
- What was consolidated, what `QuickCreateHabitModal` code was removed, and confirmation nothing now has two creation paths.
- The full creation-form field audit: keep / move / cut recommendation per field.
- The LifeDomain trace and your proposal — this is the main decision coming out of this round.
- Any deviation, however small.
