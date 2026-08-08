import { describe, expect, it } from 'vitest'
import { resolveGridTab } from './habitGridTabs'

describe('resolveGridTab', () => {
  it('starts on "to do" when there is work left', () => {
    expect(resolveGridTab({ notDoneCount: 3, doneCount: 1, hasChosen: false, chosen: 'todo' })).toBe('todo')
  })

  it('lands on "done" when everything is finished, so the day\'s work is visible', () => {
    expect(resolveGridTab({ notDoneCount: 0, doneCount: 4, hasChosen: false, chosen: 'todo' })).toBe('done')
  })

  it('stays on "to do" on a completely empty day rather than showing an empty Done tab', () => {
    expect(resolveGridTab({ notDoneCount: 0, doneCount: 0, hasChosen: false, chosen: 'todo' })).toBe('todo')
  })

  it('never overrides an explicit choice, even when that tab is empty', () => {
    // The bug this prevents: tapping "Done" on a day with nothing done and
    // being bounced straight back to "To do".
    expect(resolveGridTab({ notDoneCount: 5, doneCount: 0, hasChosen: true, chosen: 'done' })).toBe('done')
    expect(resolveGridTab({ notDoneCount: 0, doneCount: 5, hasChosen: true, chosen: 'todo' })).toBe('todo')
  })

  it('keeps honouring the choice as counts change underneath it', () => {
    // Completing the last habit while sitting on "To do" must not yank the
    // view away mid-interaction.
    expect(resolveGridTab({ notDoneCount: 0, doneCount: 6, hasChosen: true, chosen: 'todo' })).toBe('todo')
  })
})
