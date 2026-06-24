import { describe, it, expect } from 'vitest'
import { buildAnchor, reanchor } from './anchor'

const PAGE = 'Intro text. The auth token signs each request. Footer note.'

describe('buildAnchor', () => {
  it('captures exact text plus surrounding context', () => {
    const start = PAGE.indexOf('auth token')
    const end = start + 'auth token'.length
    const a = buildAnchor(PAGE, start, end, 8)
    expect(a.exact).toBe('auth token')
    expect(a.startPos).toBe(start)
    expect(a.endPos).toBe(end)
    expect(a.suffix).toBe(' signs e')
    expect(a.prefix).toBe('xt. The ')
  })
})

describe('reanchor', () => {
  const start = PAGE.indexOf('auth token')
  const a = buildAnchor(PAGE, start, start + 'auth token'.length, 8)

  it('uses the position fast-path when text is unchanged', () => {
    expect(reanchor(PAGE, a)).toEqual({ start, end: start + 'auth token'.length })
  })

  it('re-finds text after content shifts the offsets', () => {
    const shifted = 'PREPENDED HEADER. ' + PAGE
    const res = reanchor(shifted, a)
    expect(res).not.toBeNull()
    expect(shifted.slice(res!.start, res!.end)).toBe('auth token')
  })

  it('disambiguates multiple matches using prefix/suffix', () => {
    const dup = 'auth token here. The auth token signs each request.'
    const res = reanchor(dup, a)
    expect(res).not.toBeNull()
    // Should pick the occurrence preceded by "The " and followed by " signs..."
    expect(dup.slice(res!.start - 4, res!.start)).toBe('The ')
  })

  it('returns null when the exact text is gone', () => {
    expect(reanchor('completely different content', a)).toBeNull()
  })
})
