# STOA — Handoff Note (paste this into a new chat to continue)

## Project basics
- **App:** STOA — personal habit/task/journal/planning PWA, single user (Denys), local-first (IndexedDB/Dexie), no cloud sync of core data.
- **Repo branch:** `claude/attachment-processing-uqs6kk`
- **Source of truth for all decisions/architecture:** `SPEC.md` at repo root — fully self-contained (Articles 1–57, full data model, non-negotiables, build plan, Definition of Done). Read this before doing anything — don't rely on conversation memory or README notes alone, since those have drifted from reality before.
- **Live deployment:** Vercel, production URL `https://stoa-app-cyan.vercel.app` — **always use this exact URL**, never a Vercel preview/deployment-specific URL (those have their own empty local database and caused confusion once already).
- **AI backend:** serverless proxy on Vercel (`api/ai-report.ts`, `api/ai-health.ts`), BYOK (bring-your-own-key, Anthropic key entered in app Settings, never shared/server-side). CORS + rate-limiting implemented and working.

## How this project has been run (keep doing this)
- Every round: explicit engineering brief → Claude Code implements → **live verification required, not just passing unit tests** (this project has repeatedly caught real bugs — race conditions, stacking-context issues, timezone bugs — that only showed up in live browser testing, not code review or automated tests alone).
- Claude Code discloses judgment calls and deviations explicitly rather than silently choosing — this has worked well, keep expecting it.
- After each push, test on the **real production URL** before considering something done. If something looks broken, first rule out: (a) stale PWA cache — full close+reopen the app (this has happened twice), (b) a failed Vercel build (check Vercel dashboard deployments list — a "Ready" vs "Error" status has been the real cause more than once).
- `npm run build` (the exact command Vercel runs: `tsc -b && vite build`) is the real typecheck gate — plain `tsc --noEmit` has been proven to miss real errors twice this session. Always confirm this specific command was run clean.

## Current state (as of last message in prior chat)
- Core feature set is fully built: Spaces, Habits (build/avoid types, dependencies, pause, measurable multi-entry), Todos (recurrence, subtasks, someday, projects), Journal, Planning, Analytics (with charts), Trash/soft-delete, full JSON backup (with photo support), Calendar `.ics` export (one-way, generate-once), reminders (foreground-only, with escalation/quiet-hours/digest), voice input (Web Speech API, 4 fields), AI reports (weekly + monthly, hybrid scheduled/freeform modes), global search, FAB quick-create, undo toasts.
- Recent design work: bottom nav icon consistency (all `lucide-react`, no emoji), a full Tasks-tab visual redesign (Tesla-token palette + iOS-passcode-dot motif + per-task category coloring with auto-contrast text), a "vibrant" color system + tactile buttons **scoped to the Today screen only** (not yet extended to Habits/Tasks/etc.).
- Streak visualization: habits collapse into a "Done today" tray on completion, with a tiered flame/sprout/trophy emoji-based visual (research-backed, explicitly NOT real gamification — no points/rewards, Article 6 stays enforced).
- A structural Sheet/modal bug was just fixed: all modals now render via React portal to `document.body` with a canonical fixed-header/scrollable-body/fixed-footer structure — applies to all 13 sheet consumers in the app.

## Pending / open items (not yet done)
1. **Voice input downstream-handling audit** — a *planning-only* task was requested (audit whether transcribed voice input in all 5 locations actually gets saved/used correctly, no silent loss) — **this was requested but the report was never delivered before the chat ended.** Worth re-requesting in the new chat if still wanted.
2. **Extend the vibrant Today redesign** to Habits/Tasks/Journal/etc. — explicitly deferred, "start with Today, we'll go from there."
3. **Article 34** (cross-Space aggregate overview) — deferred, low priority, off by default.
4. **Feedback-driven planning/frequency adjustment** — a vague idea raised once, explicitly deferred pending clearer specification.
5. Persisting individual "Ask about this habit" (`freeform_query`) responses for later viewing — flagged as wanted, not yet formally scoped/assigned as its own round.

## Key hard-won lessons (worth telling a new session)
- **iOS Safari `.ics` calendar files:** `navigator.share()` with a file does NOT trigger the native "Add Event" screen — only direct navigation to a `text/calendar` blob URL does. This is now correctly implemented (iOS-Safari-specific branch), confirmed working on real device.
- **PWA update caching:** an "update available" banner now exists (service worker `registerType: 'prompt'` + `onNeedRefresh`), so this shouldn't recur, but if something "isn't showing up," suspect this first.
- **CSS transforms break `position: fixed` descendants** — any non-`none` transform (even `translateY(0)`) on an ancestor creates a new containing block. Caused a real modal-positioning bug once; now fixed by using opacity-only animations + portals for modals.
- **`tsc -b` vs `tsc --noEmit`** — the former is the real gate (respects project references/`tsconfig` scoping correctly), the latter has silently passed broken code twice.
- Several `SPEC.md` fields (e.g., `PriorityLevel.color`) don't exist in the real schema by deliberate design — reconciled and documented directly in `SPEC.md` itself, not a bug.

## How to start the new chat
Paste this whole note, then say what you want to work on next (e.g., "let's do the voice-input audit" or "let's extend the vibrant redesign to Habits").
