import { describe, it, expect } from 'vitest'
import {
  createContext,
  anchorKey,
  findDuplicate,
  nextOrder,
  reorder,
  sortByOrder,
  selectEvictions,
  buildContextBlock,
  CONTEXT_MAX_CHARS,
  type Anchor,
  type SelectionContext,
} from './contexts'

const anchor = (exact: string, start = 0): Anchor => ({
  exact,
  prefix: 'pre',
  suffix: 'suf',
  startPos: start,
  endPos: start + exact.length,
})

const ctx = (over: Partial<SelectionContext> = {}): SelectionContext =>
  createContext(
    { type: 'text', label: 'L', text: 'body', anchor: anchor('body') },
    { pageKey: 'k', url: 'u', title: 't', order: 0, now: 1000 },
  ) && { ...createContext({ type: 'text', label: 'L', text: 'body', anchor: anchor('body') }, { pageKey: 'k', url: 'u', title: 't', order: 0, now: 1000 }), ...over }

describe('createContext', () => {
  it('fills server-managed fields and a unique id', () => {
    const c = createContext(
      { type: 'code', label: 'Auth · Code', text: 'x', anchor: anchor('x') },
      { pageKey: 'k', url: 'u', title: 't', order: 3, now: 42 },
    )
    expect(c.id).toMatch(/.+/)
    expect(c).toMatchObject({
      pageKey: 'k',
      url: 'u',
      title: 't',
      type: 'code',
      label: 'Auth · Code',
      order: 3,
      createdAt: 42,
      lastSeenAt: 42,
      locked: false,
      saved: false,
    })
  })
  it('gives different ids to two contexts', () => {
    const a = createContext({ type: 'text', label: 'a', text: 'a', anchor: anchor('a') }, { pageKey: 'k', url: 'u', title: 't', order: 0, now: 1 })
    const b = createContext({ type: 'text', label: 'b', text: 'b', anchor: anchor('b') }, { pageKey: 'k', url: 'u', title: 't', order: 1, now: 1 })
    expect(a.id).not.toBe(b.id)
  })
})

describe('anchorKey / findDuplicate', () => {
  it('matches a context with the same anchor key', () => {
    const c = ctx({ id: '1', anchor: anchor('hello', 5) })
    expect(findDuplicate([c], anchor('hello', 5))?.id).toBe('1')
  })
  it('does not match a different anchor', () => {
    const c = ctx({ id: '1', anchor: anchor('hello', 5) })
    expect(findDuplicate([c], anchor('hello', 9))).toBeUndefined()
  })
})

describe('nextOrder', () => {
  it('is 0 for an empty list', () => {
    expect(nextOrder([])).toBe(0)
  })
  it('is one past the max order', () => {
    expect(nextOrder([ctx({ order: 2 }), ctx({ order: 5 })])).toBe(6)
  })
})

describe('reorder / sortByOrder', () => {
  it('renumbers order to match the given id sequence', () => {
    const a = ctx({ id: 'a', order: 0 })
    const b = ctx({ id: 'b', order: 1 })
    const c = ctx({ id: 'c', order: 2 })
    const out = reorder([a, b, c], ['c', 'a', 'b'])
    expect(sortByOrder(out).map((x) => x.id)).toEqual(['c', 'a', 'b'])
    expect(sortByOrder(out).map((x) => x.order)).toEqual([0, 1, 2])
  })
})

describe('selectEvictions', () => {
  it('evicts oldest unsaved/unlocked first and never saved/locked', () => {
    const list = [
      ctx({ id: 'old', createdAt: 1 }),
      ctx({ id: 'locked', createdAt: 0, locked: true }),
      ctx({ id: 'saved', createdAt: 0, saved: true }),
      ctx({ id: 'new', createdAt: 9 }),
    ]
    expect(selectEvictions(list, 1)).toEqual(['old'])
    expect(selectEvictions(list, 2)).toEqual(['old', 'new'])
  })
  it('returns only what it can evict', () => {
    const list = [ctx({ id: 'locked', locked: true })]
    expect(selectEvictions(list, 3)).toEqual([])
  })
})

describe('buildContextBlock', () => {
  it('caps each context to CONTEXT_MAX_CHARS', () => {
    const big = 'a'.repeat(CONTEXT_MAX_CHARS + 500)
    const out = buildContextBlock([{ label: 'L', type: 'text', text: big }])
    expect(out[0].text.length).toBeLessThanOrEqual(CONTEXT_MAX_CHARS + 40) // + truncation marker
    expect(out[0].text).toContain('[content truncated]')
  })
  it('drops trailing contexts that exceed the total budget', () => {
    const out = buildContextBlock(
      [
        { label: 'A', type: 'text', text: 'a'.repeat(80) },
        { label: 'B', type: 'text', text: 'b'.repeat(80) },
        { label: 'C', type: 'text', text: 'c'.repeat(80) },
      ],
      170,
    )
    expect(out.map((x) => x.label)).toEqual(['A', 'B'])
  })
})
