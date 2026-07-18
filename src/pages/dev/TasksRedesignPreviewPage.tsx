// Stage-1-only preview, v5 (approved) + per-section color identity
// refinement: Today/Overdue/Someday each get their own palette via the
// .section-overdue/.section-someday CSS scoping in tokens.css. Pure
// visual states, no live data, no interaction. Not linked from any nav —
// reachable only by direct URL for screenshot review.

import { TaskCard } from '../../components/todos/redesign/TaskCard'

function SectionHeading({ label }: { label: string }) {
  return <div className="text-section-header uppercase text-heading">{label}</div>
}

export function TasksRedesignPreviewPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col gap-6" style={{ background: 'var(--color-canvas)' }}>
      <div className="flex flex-col gap-4">
        <SectionHeading label="Today" />
        <TaskCard title="Draft the quarterly review" status="upcoming" dueLabel="18 Jul · 14:00" prioritySortOrder={0} />
      </div>

      <div className="section-overdue flex flex-col gap-4">
        <SectionHeading label="Overdue" />
        <TaskCard title="Renew passport" status="overdue" dueLabel="12 Jul" prioritySortOrder={0} />
      </div>

      <div className="section-someday flex flex-col gap-4">
        <SectionHeading label="Someday" />
        <TaskCard
          title="Plan the trip itinerary"
          status="someday"
          prioritySortOrder={1}
          subtasks={[
            { title: 'Book flights', done: true },
            { title: 'Reserve hotel', done: true },
            { title: 'Map out day trips', done: false },
          ]}
          subtasksExpanded
        />
        <TaskCard title="Update onboarding copy" status="someday" prioritySortOrder={2} projectLabel="Website Relaunch" />
      </div>
    </div>
  )
}
