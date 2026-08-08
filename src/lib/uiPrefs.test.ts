// @vitest-environment jsdom
// This suite needs a real localStorage; lib/* otherwise runs in node.
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { readUiPref, writeUiPref } from './uiPrefs'

describe('uiPrefs', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('returns the fallback when nothing has been stored', () => {
    expect(readUiPref('briefExpanded', true)).toBe(true)
    expect(readUiPref('briefExpanded', false)).toBe(false)
  })

  it('round-trips both values, so an explicit false is not mistaken for unset', () => {
    writeUiPref('briefExpanded', false)
    // The bug this guards: storing booleans loosely and then treating
    // "falsy" as "never set" makes it impossible to persist an explicit
    // collapse when the default is expanded.
    expect(readUiPref('briefExpanded', true)).toBe(false)
    writeUiPref('briefExpanded', true)
    expect(readUiPref('briefExpanded', false)).toBe(true)
  })

  it('namespaces its keys so it cannot collide with other storage', () => {
    writeUiPref('briefExpanded', true)
    expect(localStorage.getItem('briefExpanded')).toBeNull()
    expect(localStorage.getItem('stoa.ui.briefExpanded')).toBe('1')
  })

  it('falls back rather than throwing when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readUiPref('briefExpanded', true)).toBe(true)
    expect(() => writeUiPref('briefExpanded', false)).not.toThrow()
  })
})
