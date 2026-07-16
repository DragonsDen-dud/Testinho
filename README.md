# STOA

A private, local-first companion for habits, tasks, and daily planning — implemented per the STOA v5.0 contract (`РАЗДЕЛ H`, core MVP scope).

Everything lives in this browser's IndexedDB (via Dexie). No account, no cloud sync.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Dexie (IndexedDB) for local-first storage
- react-router-dom for navigation
- react-i18next for RU/EN localization
- vite-plugin-pwa for offline/installable support

## What's implemented (MVP foundation)

- **Spaces** — isolated top-level containers, switchable, with onboarding for the first Space + life domain (Article 8, E.1/E.2)
- **Habits** — build/avoid types, daily/weekly/custom schedules, measurable tracking with multiple entries per day and a neutral (non-gamified) bonus indicator, reminders, stakes (self-penalty, never auto-enforced), dependencies between habits (blocked with cycle detection on save), pause/freeze (Habit Strength frozen, hidden from check-in, no reminders), Habit Strength (proportional decaying 0–100%) and streak calculation, avoid-type "days without a slip" display (Articles 9, 14, 21, 24, 25, 27, E.3)
- **To-Do** — priorities, domains, optional subtasks (Article 15, E.4); recurrence (daily/weekly/monthly/custom, computed from the completed instance's own due date so a late completion never compresses the next interval, Article 28); scheduled time slots (Article 29); a Someday/Maybe list gated by a required due-date+priority prompt to promote back to Open (Article 31); smart reschedule (Tomorrow/In a week/Pick a date) and a dedicated overdue triage screen with bulk actions, plus a once-per-*calendar-day* (not once-per-session) overdue banner on Dashboard (Article 30)
- **Planning** — day plan notes linked to habits/tasks, plus a same-day timeline of scheduled-time tasks alongside TimeBlock-grouped habits (E.5, Article 29)
- **Dashboard** — today's habits and tasks, configurable module order (Article 45)
- **Settings** — language (RU/EN), theme (dark/light/high-contrast/system), Space management
- **Trash** — soft-delete for Habits/To-Do/Projects (`deletedAt`), Restore, permanent delete, and a 30-day auto-purge sweep on app start (Article 20, E.14). All active-item queries funnel through `listActiveHabits`/`listActiveTodos`/`listActiveProjects` in `src/data/`, so every screen — Dashboard, Planning, overdue banner — excludes trashed records from a single point rather than repeating the filter per query.
- **Projects** — simple one-level grouping for tasks with a progress bar (% done of active linked tasks), soft-deletable from creation like Habit/Todo (Article 32, E.13). Deletion is two-stage: while a Project sits in Trash, linked Todos keep their `projectId` untouched and show a "Project deleted" badge (restoring the Project silently reinstates the normal display); purging the Project (forever-delete or the retention sweep) cascades to clear `projectId` on every Todo that referenced it, since that's the point of no return for the reference too.
- **Journal** — its own bottom-nav tab, prompt-driven or free-text entries with optional mood, a fully editable starter set of 5 prompts seeded per Space (never hardcoded UI copy — DB records the user can edit/delete/add to from day one) (Article 33, E.12)

Deferred to later passes per the contract's build plan: AI reports, photo attachments (Article 23), Calendar `.ics` export, Telegram reminders, voice input, cross-Space analytics, and the remaining polish items in Section H.

### A known data-model gap (Article 29)

Article 29 asks for scheduled-time tasks to render on "a mini-timeline of the day, alongside TimeBlock-grouping of habits" — implying one merged, chronologically-ordered timeline. `TimeBlock` only carries a freeform `approxTimeRange` string (e.g. "Morning"), not a structured start/end time, so there's no minute-precision anchor to interleave it against a task's exact `HH:mm`. Planning currently renders habits-by-TimeBlock and scheduled-time tasks as two adjacent groups rather than one merged sequence. Giving TimeBlock a structured time range would resolve this properly; flagging it rather than fudging a fake sort order.

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # typecheck + production build
npm run lint      # oxlint
npm run test      # vitest (data-layer + soft-delete regression tests)
```
