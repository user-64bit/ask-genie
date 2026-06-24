import { describe, it, expect } from 'vitest'
import { labelSelection } from './labeler'

describe('labelSelection — type detection', () => {
  it('marks pre/code as code', () => {
    expect(labelSelection({ text: 'const x = 1', ancestorTags: ['span', 'code', 'pre'], nearestHeading: null }).type).toBe('code')
  })
  it('marks tables as table', () => {
    expect(labelSelection({ text: 'A B', ancestorTags: ['td', 'tr', 'table'], nearestHeading: null }).type).toBe('table')
  })
  it('marks stack traces / error text as error', () => {
    expect(labelSelection({ text: 'TypeError: cannot read x\n    at foo (app.js:10:5)', ancestorTags: ['div'], nearestHeading: null }).type).toBe('error')
  })
  it('marks an HTTP 500 line as error', () => {
    expect(labelSelection({ text: 'Request failed with status 503', ancestorTags: ['p'], nearestHeading: null }).type).toBe('error')
  })
  it('marks pricing copy as pricing', () => {
    expect(labelSelection({ text: '$29 / mo billed annually', ancestorTags: ['div'], nearestHeading: 'Pro plan' }).type).toBe('pricing')
  })
  it('marks heading-scoped prose as doc', () => {
    expect(labelSelection({ text: 'Tokens authenticate each request.', ancestorTags: ['p', 'section'], nearestHeading: 'Authentication' }).type).toBe('doc')
  })
  it('falls back to text', () => {
    expect(labelSelection({ text: 'just some words here', ancestorTags: ['span'], nearestHeading: null }).type).toBe('text')
  })
})

describe('labelSelection — labels', () => {
  it('combines heading and type for code', () => {
    expect(labelSelection({ text: 'x', ancestorTags: ['pre'], nearestHeading: 'Authentication' }).label).toBe('Authentication · Code')
  })
  it('uses a generic code label without a heading', () => {
    expect(labelSelection({ text: 'x', ancestorTags: ['pre'], nearestHeading: null }).label).toBe('Code Block')
  })
  it('uses the heading for doc sections', () => {
    expect(labelSelection({ text: 'x', ancestorTags: ['p'], nearestHeading: 'Getting Started' }).label).toBe('Getting Started')
  })
  it('uses first words for unlabeled text', () => {
    expect(labelSelection({ text: 'the quick brown fox jumps over', ancestorTags: ['span'], nearestHeading: null }).label).toBe('the quick brown fox jumps…')
  })
  it('truncates long labels', () => {
    const long = 'A'.repeat(60)
    expect(labelSelection({ text: 'x', ancestorTags: ['p'], nearestHeading: long }).label.length).toBeLessThanOrEqual(33)
  })
})
