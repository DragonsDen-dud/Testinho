// Stage-1-only preview, v5 — Tesla tokens + SpaceX restraint + iOS dot
// motif: 4 seeded TaskCard states as pure visual states, no live data, no
// interaction. Not linked from any nav — reachable only by direct URL.

import { TaskCard } from '../../components/todos/redesign/TaskCard'

export function TasksRedesignPreviewPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col gap-4" style={{ background: 'var(--color-canvas)' }}>
      <div className="text-section-header uppercase text-ink-muted">Today</div>

      <TaskCard title="Draft the quarterly review" status="upcoming" dueLabel="18 Jul · 14:00" prioritySortOrder={0} />

      <TaskCard title="Renew passport" status="overdue" dueLabel="12 Jul" prioritySortOrder={0} />

      <TaskCard
        title="Plan the trip itinerary"
        status="upcoming"
        dueLabel="20 Jul"
        prioritySortOrder={1}
        subtasks={[
          { title: 'Book flights', done: true },
          { title: 'Reserve hotel', done: true },
          { title: 'Map out day trips', done: false },
        ]}
        subtasksExpanded
      />

      <TaskCard title="Update onboarding copy" status="upcoming" dueLabel="22 Jul" prioritySortOrder={2} projectLabel="Website Relaunch" />
    </div>
  )
}
