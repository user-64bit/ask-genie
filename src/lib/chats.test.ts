import { describe, it, expect } from 'vitest'
import { makePageKey, pruneExpired, type ChatMap } from './chats'

describe('makePageKey', () => {
  it('drops query string and hash', () => {
    expect(makePageKey('https://ex.com/a?b=1#x')).toBe('https://ex.com/a')
  })

  it('keeps distinct paths and origins separate', () => {
    expect(makePageKey('https://ex.com/a')).not.toBe(makePageKey('https://ex.com/b'))
    expect(makePageKey('https://a.com/p')).not.toBe(makePageKey('https://b.com/p'))
  })

  it('falls back to the raw string for non-URLs', () => {
    expect(makePageKey('not a url')).toBe('not a url')
  })
})

describe('pruneExpired', () => {
  const now = 1_000_000_000_000
  const maxAge = 24 * 60 * 60 * 1000
  const chats: ChatMap = {
    fresh: { createdAt: now - 1000, updatedAt: now, messages: [] },
    old: { createdAt: now - maxAge - 1, updatedAt: now, messages: [] },
  }

  it('removes conversations older than maxAge, keeps the rest', () => {
    const result = pruneExpired(chats, now, maxAge)
    expect(Object.keys(result)).toEqual(['fresh'])
  })

  it('does not mutate the input', () => {
    pruneExpired(chats, now, maxAge)
    expect(Object.keys(chats)).toHaveLength(2)
  })
})
