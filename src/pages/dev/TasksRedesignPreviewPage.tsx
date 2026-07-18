// Stage-1-only preview: 4 seeded TaskCard states as pure visual states, no
// live data, no interaction. Not linked from any nav — reachable only by
// direct URL for screenshot review. Delete this file once Stage 1 is
// approved and TaskCard is wired into the real TodosPage (Stage 2/3).

import { TaskCard } from '../../components/todos/redesign/TaskCard'

export function TasksRedesignPreviewPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col gap-6" style={{ background: 'var(--stoa-bg)' }}>
      <div className="text-section-header text-[var(--stoa-text)]/50 uppercase">Today</div>

      <TaskCard title="Draft the quarterly review" status="upcoming" dueLabel="18 Jul · 14:00" priorityLabel="High" prioritySortOrder={0} />

      <TaskCard
        title="Renew passport"
        status="overdue"
        dueLabel="12 Jul"
        priorityLabel="High"
        prioritySortOrder={0}
        hasRecurrence={false}
      />

      <TaskCard
        title="Plan the trip itinerary"
        status="upcoming"
        dueLabel="20 Jul"
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
        dueLabel="22 Jul"
        priorityLabel="Low"
        prioritySortOrder={2}
        projectChip={{ label: 'Website Relaunch', color: '#7c3aed' }}
      />
    </div>
  )
}
