import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, buildUserMessage } from './aiPrompts'

describe('buildSystemPrompt (Article 16)', () => {
  it('produces a different, fixed-section prompt for scheduled_template', () => {
    const prompt = buildSystemPrompt('scheduled_template')
    expect(prompt).toContain('Strengths')
    expect(prompt).toContain('Weak spots')
    expect(prompt).toContain('Concrete strategy for next period')
    expect(prompt).toContain('Comparison to previous period')
  })

  it('produces a different, unstructured prompt for freeform_query', () => {
    const prompt = buildSystemPrompt('freeform_query')
    expect(prompt).not.toContain('Weak spots')
    expect(prompt).not.toBe(buildSystemPrompt('scheduled_template'))
  })
})

describe('buildUserMessage — North Star is strictly opt-in per call (Article 16)', () => {
  const autoStats = { habit1: { weekdayPattern: null } }

  it('omits North Star entirely when not passed', () => {
    const message = buildUserMessage('freeform_query', { autoStats, question: 'How am I doing?' })
    expect(message).not.toContain('North Star')
  })

  it('includes North Star only when explicitly passed in context', () => {
    const message = buildUserMessage('freeform_query', {
      autoStats,
      question: 'How am I doing?',
      northStar: 'Be present for my family.',
    })
    expect(message).toContain('North Star')
    expect(message).toContain('Be present for my family.')
  })

  it('always includes the question for freeform_query', () => {
    const message = buildUserMessage('freeform_query', { autoStats, question: 'Why do I miss Tuesdays?' })
    expect(message).toContain('Why do I miss Tuesdays?')
  })

  it('does not prepend a Question: line for scheduled_template', () => {
    const message = buildUserMessage('scheduled_template', { autoStats })
    expect(message).not.toContain('Question:')
  })

  it('always includes autoStats as ground-truth data for both report types', () => {
    const scheduled = buildUserMessage('scheduled_template', { autoStats })
    const freeform = buildUserMessage('freeform_query', { autoStats, question: 'x' })
    expect(scheduled).toContain('habit1')
    expect(freeform).toContain('habit1')
  })
})

describe('buildUserMessage — prior-period feedback (Article 12/16)', () => {
  const autoStats = { habit1: { weekdayPattern: null } }

  it('omits the prior-feedback block entirely when not passed', () => {
    const message = buildUserMessage('scheduled_template', { autoStats })
    expect(message).not.toContain('previous period')
  })

  it('includes prior feedback text when passed for scheduled_template', () => {
    const message = buildUserMessage('scheduled_template', {
      autoStats,
      priorFeedback: 'I felt like Tuesdays were rough.',
    })
    expect(message).toContain('I felt like Tuesdays were rough.')
  })

  it('is reportType-gated: never included for freeform_query even if passed', () => {
    const message = buildUserMessage('freeform_query', {
      autoStats,
      question: 'How am I doing?',
      priorFeedback: 'I felt like Tuesdays were rough.',
    })
    expect(message).not.toContain('I felt like Tuesdays were rough.')
  })
})
