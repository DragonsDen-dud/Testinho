// Stage-1-only preview, v5 (approved) + status-as-border refinement +
// category/project color. Today/Overdue/Someday status is now a border
// ring (see .section-overdue/.section-someday in tokens.css), and each
// card's background comes from its resolved LifeDomain/Project color
// (categoryColor prop) with computed-contrast text, or the neutral theme
// fallback when a task has neither. Pure visual states, no live data, no
// interaction. Not linked from any nav — reachable only by direct URL.

import { TaskCard } from '../../components/todos/redesign/TaskCard'

function SectionHeading({ label }: { label: string }) {
  return <div className="text-section-header uppercase text-heading">{label}</div>
}

// Representative LifeDomain/Project colors a real user might pick —
// deliberately spanning light, mid-saturation, and an intentionally dark
// one (Deep Work) to exercise the contrast-computation path for real.
const MARKETING_ORANGE = '#F5A623' // Project.color
const DEEP_WORK_NAVY = '#12213A' // Project.color — intentionally dark
const HEALTH_MINT = '#B8E6D3' // LifeDomain.color

export function TasksRedesignPreviewPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col gap-6" style={{ background: 'var(--color-canvas)' }}>
      <div className="flex flex-col gap-4">
        <SectionHeading label="Today" />
        <TaskCard
          title="Draft the quarterly review"
          status="upcoming"
          dueLabel="18 Jul · 14:00"
          prioritySortOrder={0}
          projectLabel="Marketing"
          categoryColor={MARKETING_ORANGE}
        />
      </div>

      <div className="section-overdue flex flex-col gap-4">
        <SectionHeading label="Overdue" />
        <TaskCard
          title="Finish the deep-work retro"
          status="overdue"
          dueLabel="12 Jul"
          prioritySortOrder={0}
          projectLabel="Deep Work"
          categoryColor={DEEP_WORK_NAVY}
        />
      </div>

      <div className="section-someday flex flex-col gap-4">
        <SectionHeading label="Someday" />
        <TaskCard
          title="Plan the trip itinerary"
          status="someday"
          prioritySortOrder={1}
          projectLabel="Health"
          categoryColor={HEALTH_MINT}
          subtasks={[
            { title: 'Book flights', done: true },
            { title: 'Reserve hotel', done: true },
            { title: 'Map out day trips', done: false },
          ]}
          subtasksExpanded
        />
        <TaskCard title="Update onboarding copy" status="someday" prioritySortOrder={2} />
      </div>
    </div>
  )
}
