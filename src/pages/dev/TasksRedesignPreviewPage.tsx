// Stage-1-only preview, v6 (Part 3 badge-based redesign) — category
// identity now lives in a ColorIconBadge (matching Pro Settings/Habits),
// not a full-card color wash. Today/Overdue/Someday status now comes
// through the trailing DueDateChip's tone (overdue/today/neutral) and,
// for Someday, the whole-row dim — not a card-level border/background.
// Pure visual states, no live data, no interaction. Not linked from any
// nav — reachable only by direct URL.

import { TaskCard } from '../../components/todos/redesign/TaskCard'
import { SectionHeading } from '../../components/todos/redesign/SectionHeading'
import { ColorIconBadge } from '../../components/ui/ColorIconBadge'

// Representative Project/LifeDomain colors+icons a real user might pick —
// deliberately spanning light, mid-saturation, and an intentionally dark
// one (Deep Work) to exercise the contrast-computation path for real.
const MARKETING_BADGE = <ColorIconBadge color="#F5A623" icon="Megaphone" size="row" />
const DEEP_WORK_BADGE = <ColorIconBadge color="#12213A" icon="BookOpen" size="row" />
const HEALTH_BADGE = <ColorIconBadge color="#B8E6D3" icon="Heart" size="row" />
const NO_PROJECT_BADGE = <ColorIconBadge color="#9ca3af" icon="Inbox" size="row" />

export function TasksRedesignPreviewPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col gap-6" style={{ background: 'var(--color-canvas)' }}>
      <div className="flex flex-col gap-2">
        <SectionHeading label="Today" />
        <TaskCard
          title="Draft the quarterly review"
          status="upcoming"
          badge={MARKETING_BADGE}
          priorityTier="high"
          priorityLabel="High"
          dueInfo={{ label: '14:00', tone: 'today' }}
          subtitle="Marketing"
        />
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeading label="Overdue" />
        <TaskCard
          title="Finish the deep-work retro"
          status="overdue"
          badge={DEEP_WORK_BADGE}
          priorityTier="medium"
          priorityLabel="Medium"
          dueInfo={{ label: '6d overdue', tone: 'overdue' }}
          subtitle="Deep Work"
        />
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeading label="Someday" />
        <TaskCard
          title="Plan the trip itinerary"
          status="someday"
          badge={HEALTH_BADGE}
          priorityTier="none"
          somedayLabel="Someday"
          subtitle="Health"
          subtasks={[
            { id: 's1', title: 'Book flights', done: true },
            { id: 's2', title: 'Reserve hotel', done: true },
            { id: 's3', title: 'Map out day trips', done: false },
          ]}
          subtasksExpanded
        />
        <TaskCard title="Update onboarding copy" status="someday" badge={NO_PROJECT_BADGE} priorityTier="none" somedayLabel="Someday" />
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeading label="Recurring + completed" />
        <TaskCard
          title="Water the plants"
          status="upcoming"
          badge={HEALTH_BADGE}
          priorityTier="none"
          hasRecurrence
          recurrenceLabel="Repeats"
          dueInfo={{ label: 'Tomorrow', tone: 'neutral' }}
        />
        <TaskCard
          title="Renew passport"
          status="done"
          badge={MARKETING_BADGE}
          priorityTier="none"
          checked
          checkColor="#F5A623"
        />
      </div>
    </div>
  )
}
