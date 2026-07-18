// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import '../../i18n/i18n'
import { QuickAddFab } from './QuickAddFab'

afterEach(() => cleanup())

/**
 * Article 49 — the FAB is a navigation shortcut, not a second
 * implementation: every menu item must route to the real screen that owns
 * the actual creation flow (via ?new=1, which each page already watches
 * for), never render a form of its own.
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

describe('QuickAddFab routing', () => {
  it('routes "Habit" to /habits?new=1, landing on the real Habits screen', () => {
    renderAt('/')
    fireEvent.click(screen.getByLabelText('Quick add'))
    fireEvent.click(screen.getByText('Habit'))
    expect(screen.getByText('habits-marker')).toBeTruthy()
  })

  it('routes "Task" to /todos?new=1, landing on the real Todos screen', () => {
    renderAt('/')
    fireEvent.click(screen.getByLabelText('Quick add'))
    fireEvent.click(screen.getByText('Task'))
    expect(screen.getByText('todos-marker')).toBeTruthy()
  })

  it('routes "Journal entry" to /journal?new=1, landing on the real Journal screen', () => {
    renderAt('/')
    fireEvent.click(screen.getByLabelText('Quick add'))
    fireEvent.click(screen.getByText('Journal entry'))
    expect(screen.getByText('journal-marker')).toBeTruthy()
  })
})
