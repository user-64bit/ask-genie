// src/lib/messages.test.ts
import { describe, it, expect } from 'vitest'
import type { RuntimeRequest } from './messages'

describe('RuntimeRequest', () => {
  it('accepts an ADD_CONTEXT request with a NewContextInput payload', () => {
    const req: RuntimeRequest = {
      type: 'ADD_CONTEXT',
      pageKey: 'k',
      url: 'u',
      title: 't',
      context: {
        type: 'text',
        label: 'L',
        text: 'body',
        anchor: { exact: 'body', prefix: '', suffix: '', startPos: 0, endPos: 4 },
      },
    }
    expect(req.type).toBe('ADD_CONTEXT')
  })

  it('requires contextIds on ASK', () => {
    const req: RuntimeRequest = {
      type: 'ASK',
      pageKey: 'k',
      url: 'u',
      title: 't',
      question: 'q',
      context: 'c',
      contextIds: ['a', 'b'],
    }
    expect(req.contextIds).toHaveLength(2)
  })
})
