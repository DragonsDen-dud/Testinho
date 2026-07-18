import { describe, expect, it } from 'vitest'
import { moveItem } from './reorder'

describe('moveItem (Article 45)', () => {
  it('moves an item earlier in the list', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('moves an item later in the list', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('is a no-op when from equals to', () => {
    const input = ['a', 'b', 'c']
    expect(moveItem(input, 1, 1)).toEqual(input)
  })

  it('is a no-op for an out-of-range index rather than throwing or corrupting the list', () => {
    const input = ['a', 'b']
    expect(moveItem(input, 5, 0)).toEqual(input)
    expect(moveItem(input, 0, -1)).toEqual(input)
  })

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c']
    moveItem(input, 0, 2)
    expect(input).toEqual(['a', 'b', 'c'])
  })
})
