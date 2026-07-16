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
- **Habits** — build/avoid types, daily/weekly/custom schedules, measurable tracking, reminders, stakes (self-penalty, never auto-enforced), Habit Strength (proportional decaying 0–100%) and streak calculation, avoid-type "days without a slip" display (Articles 9, 14, 21, 27, E.3)
- **To-Do** — priorities, domains, optional subtasks, overdue banner (Article 15, E.4)
- **Planning** — day plan notes linked to habits/tasks (E.5, basic)
- **Dashboard** — today's habits and tasks, configurable module order (Article 45)
- **Settings** — language (RU/EN), theme (dark/light/high-contrast/system), Space management

Deferred to later passes per the contract's build plan: AI reports, Journal, Projects, Trash/soft-delete, Calendar `.ics` export, Telegram reminders, voice input, cross-Space analytics, and the remaining polish items in Section H steps 18–31.

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # typecheck + production build
npm run lint      # oxlint
```
