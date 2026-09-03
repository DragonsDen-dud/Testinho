// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import '../../i18n/i18n'
import { QuickAddFab } from './QuickAddFab'
import { db, ensureAppSettings } from '../../db/db'
import { createSpace } from '../../data/spaces'
import { updateAppSettings } from '../../state/useAppSettings'

/**
 * Article 49 — the FAB is a navigation shortcut for Habit and Journal
 * (both route to the real screen via ?new=1, which those pages watch for;
 * STOA-8 removed the compact habit quick-create modal so there is exactly
 * one habit creation path). Task still opens the compact quick-create modal
 * in place — that modal calls the exact same createTodo the full form
 * uses. These tests seed a real Space (Dexie, not mocked) so the modal has
 * the domains/timeBlocks/priorities it needs to actually render, matching
 * how it behaves for a real user rather than asserting against a stub.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<><QuickAddFab /><div>dashboard-marker</div></>} />
        <Route path="/habits" element={<><QuickAddFab /><div>habits-marker</div></>} />
        <Route path="/todos" element={<><QuickAddFab /><div>todos-marker</div></>} />
        <Route path="/journal" element={<><QuickAddFab /><div>journal-marker</div></>} />
        <Route path="/settings" element={<><QuickAddFab /><div>settings-marker</div></>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await db.appSettings.clear()
  await db.spaces.clear()
  await db.timeBlocks.clear()
  await db.priorityLevels.clear()
  await db.journalPrompts.clear()
  await ensureAppSettings()
  const space = await createSpace({ name: 'Test Space', color: '#000', icon: '🏠' })
  // Habits Refocus round — the FAB's "Task" option is gated behind the
  // Tasks/Planning flag, which now defaults to off. Article 49's contract
  // for Task is still real and still tested, so this suite opts the flag
  // on; the flag-off case has its own test below.
  await updateAppSettings({ activeSpaceId: space.id, tasksPlanningEnabled: true })
})

afterEach(() => cleanup())

describe('QuickAddFab visibility', () => {
  it('renders on Dashboard/Habits/Todos/Journal', () => {
    for (const path of ['/', '/habits', '/todos', '/journal']) {
      const { unmount } = renderAt(path)
      expect(screen.getByLabelText('Quick add')).toBeTruthy()
      unmount()
    }
  })

  it('does not render on screens outside its stated scope (e.g. Settings)', () => {
    renderAt('/settings')
    expect(screen.queryByLabelText('Quick add')).toBeNull()
  })
})

describe('QuickAddFab — Habit routes to the one real habit creation flow (STOA-8)', () => {
  it('"Habit" navigates to /habits?new=1 instead of opening a second creation path', () => {
    renderAt('/')
    fireEvent.click(screen.getByLabelText('Quick add'))
    fireEvent.click(screen.getByText('Habit'))
    // Landed on the Habits screen, which owns HabitForm — the only place a
    // habit can be created. No modal of the FAB's own is rendered.
    expect(screen.getByText('habits-marker')).toBeTruthy()
    expect(screen.queryByText('dashboard-marker')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'New habit' })).toBeNull()
  })
})

describe('QuickAddFab — Task opens the compact quick-create modal in place', () => {
  it('"Task" opens the quick-create modal without navigating away', async () => {
    renderAt('/')
    fireEvent.click(screen.getByLabelText('Quick add'))
    // Awaited, not synchronous: the Tasks/Planning flag is read from a
    // Dexie live query, which resolves on a later tick. The menu therefore
    // renders without "Task" for one frame and gains it once settings
    // land — deliberately that way round, so a flag-off install never
    // flashes an option it isn't supposed to have.
    fireEvent.click(await screen.findByText('Task'))
    expect(await screen.findByRole('heading', { name: 'New task' })).toBeTruthy()
    expect(screen.getByText('dashboard-marker')).toBeTruthy()
  })
})

describe('QuickAddFab — Journal entry still routes to its own real screen', () => {
  it('routes "Journal entry" to /journal?new=1, landing on the real Journal screen', () => {
    renderAt('/')
    fireEvent.click(screen.getByLabelText('Quick add'))
    fireEvent.click(screen.getByText('Journal entry'))
    expect(screen.getByText('journal-marker')).toBeTruthy()
  })
})

describe('Habits Refocus flag — the FAB menu while Tasks/Planning is hidden', () => {
  it('omits "Task" from the menu while the flag is off, keeping Habit and Journal entry', async () => {
    await updateAppSettings({ tasksPlanningEnabled: false })
    renderAt('/')
    fireEvent.click(await screen.findByLabelText('Quick add'))

    expect(await screen.findByText('Habit')).toBeTruthy()
    expect(screen.getByText('Journal entry')).toBeTruthy()
    expect(screen.queryByText('Task')).toBeNull()
  })
})
