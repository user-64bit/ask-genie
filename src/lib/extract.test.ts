import { describe, it, expect } from 'vitest'
import { cleanText, truncate } from './extract'

describe('cleanText', () => {
  it('collapses spaces and tabs', () => {
    expect(cleanText('a   \t  b')).toBe('a b')
  })

  it('preserves paragraph breaks but collapses excess blank lines', () => {
    expect(cleanText('a\n\n\n\nb')).toBe('a\n\nb')
  })

  it('trims surrounding whitespace', () => {
    expect(cleanText('   hello   ')).toBe('hello')
  })
})

describe('truncate', () => {
  it('returns text unchanged when under the limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('cuts and marks long text', () => {
    const out = truncate('abcdefghij', 5)
    expect(out.startsWith('abcde')).toBe(true)
    expect(out).toContain('[content truncated]')
  })
})
