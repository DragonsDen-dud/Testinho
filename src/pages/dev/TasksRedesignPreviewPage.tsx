// Stage-1-only preview, Mission Control direction: 4 seeded TaskCard
// states as pure visual states, no live data, no interaction. Not linked
// from any nav — reachable only by direct URL for screenshot review.

import { TaskCard } from '../../components/todos/redesign/TaskCard'

export function TasksRedesignPreviewPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col gap-5" style={{ background: 'var(--color-void)' }}>
      <div className="flex items-center gap-3">
        <span className="text-mc-section text-white/50 uppercase">Today</span>
        <span style={{ borderTop: '1px solid var(--color-hairline)' }} className="flex-1" />
      </div>

      <TaskCard title="Draft the quarterly review" status="upcoming" dueLabel="18.07 · 14:00" priorityLabel="High" prioritySortOrder={0} />

      <TaskCard title="Renew passport" status="overdue" dueLabel="12.07" priorityLabel="High" prioritySortOrder={0} />

      <TaskCard
        title="Plan the trip itinerary"
        status="upcoming"
        dueLabel="20.07"
        priorityLabel="Medium"
        prioritySortOrder={1}
        subtasks={[
          { title: 'Book flights', done: true },
          { title: 'Reserve hotel', done: true },
          { title: 'Map out day trips', done: false },
        ]}
        subtasksExpanded
      />

      <TaskCard
        title="Update onboarding copy"
        status="upcoming"
        dueLabel="22.07"
        priorityLabel="Low"
        prioritySortOrder={2}
        projectLabel="Website Relaunch"
      />
    </div>
  )
}
