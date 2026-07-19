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
 * Article 49 — the FAB is a navigation shortcut for Journal (still routes
 * to the real screen via ?new=1, which that page watches for). Habit and
 * Task are different as of Part 1 (quick-create): they open the compact
 * quick-create modal in place, rather than navigating away — but that
 * modal itself calls the exact same createHabit/createTodo the full forms
 * use, so it's still "the real creation flow", just reached without a
 * route change. These tests seed a real Space (Dexie, not mocked) so the
 * modal has the domains/timeBlocks/priorities it needs to actually render,
 * matching how it behaves for a real user rather than asserting against a
 * stub.
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
  await updateAppSettings({ activeSpaceId: space.id })
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

describe('QuickAddFab — Habit and Task open the compact quick-create modal in place', () => {
  it('"Habit" opens the quick-create modal without navigating away', async () => {
    renderAt('/')
    fireEvent.click(screen.getByLabelText('Quick add'))
    fireEvent.click(screen.getByText('Habit'))
    expect(await screen.findByRole('heading', { name: 'New habit' })).toBeTruthy()
    expect(screen.getByText('dashboard-marker')).toBeTruthy() // still on Dashboard, no route change
  })

  it('"Task" opens the quick-create modal without navigating away', async () => {
    renderAt('/')
    fireEvent.click(screen.getByLabelText('Quick add'))
    fireEvent.click(screen.getByText('Task'))
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
