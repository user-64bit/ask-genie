import { describe, it, expect } from 'vitest'
import { buildRequest, parseResponse, parseError, defaultModelFor, isKnownModel, buildSystemPrompt } from './providers'

const history = [
  { role: 'user' as const, content: 'Hi' },
  { role: 'assistant' as const, content: 'Hello' },
  { role: 'user' as const, content: 'Summarize this page' },
]

describe('buildRequest — anthropic', () => {
  const req = buildRequest('anthropic', 'claude-haiku-4-5', 'sk-ant-xyz', 'SYSTEM', history)

  it('targets the messages endpoint', () => {
    expect(req.url).toBe('https://api.anthropic.com/v1/messages')
  })

  it('sends the required browser-direct-access + version + key headers', () => {
    expect(req.headers['x-api-key']).toBe('sk-ant-xyz')
    expect(req.headers['anthropic-version']).toBe('2023-06-01')
    expect(req.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
  })

  it('puts the system prompt top-level and history in messages', () => {
    const body = JSON.parse(req.body)
    expect(body.model).toBe('claude-haiku-4-5')
    expect(body.system).toBe('SYSTEM')
    expect(body.messages).toHaveLength(3)
    expect(body.messages[2]).toEqual({ role: 'user', content: 'Summarize this page' })
  })
})

describe('buildRequest — openai', () => {
  const req = buildRequest('openai', 'gpt-4o-mini', 'sk-abc', 'SYSTEM', history)

  it('targets chat completions with a bearer token', () => {
    expect(req.url).toBe('https://api.openai.com/v1/chat/completions')
    expect(req.headers['authorization']).toBe('Bearer sk-abc')
  })

  it('prepends the system prompt as a system-role message', () => {
    const body = JSON.parse(req.body)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'SYSTEM' })
    expect(body.messages).toHaveLength(4)
  })
})

describe('parseResponse', () => {
  it('joins anthropic text blocks', () => {
    const data = {
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'thinking', text: 'x' },
        { type: 'text', text: 'world' },
      ],
    }
    expect(parseResponse('anthropic', data)).toBe('Hello world')
  })

  it('reads the openai choice message', () => {
    const data = { choices: [{ message: { content: '  hi there  ' } }] }
    expect(parseResponse('openai', data)).toBe('hi there')
  })

  it('is safe on malformed payloads', () => {
    expect(parseResponse('anthropic', {})).toBe('')
    expect(parseResponse('openai', null)).toBe('')
  })
})

describe('parseError', () => {
  it('maps known statuses to friendly messages', () => {
    expect(parseError(401, {})).toMatch(/Invalid API key/)
    expect(parseError(429, {})).toMatch(/Rate limited/)
  })

  it('includes provider detail otherwise', () => {
    expect(parseError(400, { error: { message: 'bad model' } })).toContain('bad model')
  })
})

describe('model registry', () => {
  it('exposes a default and validates known models', () => {
    expect(defaultModelFor('openai')).toBe('gpt-4o-mini')
    expect(defaultModelFor('anthropic')).toBe('claude-haiku-4-5')
    expect(isKnownModel('anthropic', 'claude-sonnet-4-6')).toBe(true)
    expect(isKnownModel('anthropic', 'gpt-4o')).toBe(false)
  })
})

describe('buildSystemPrompt — selected contexts', () => {
  it('omits the selected block when there are no selections', () => {
    const p = buildSystemPrompt('T', 'http://x', 'page body')
    expect(p).not.toContain('SELECTED CONTEXT')
    expect(p).toContain('page body')
  })

  it('places selected context before page content and numbers it', () => {
    const p = buildSystemPrompt('T', 'http://x', 'page body', [
      { label: 'Auth · Code', type: 'code', text: 'const t = sign()' },
      { label: 'API Error', type: 'error', text: 'status 500' },
    ])
    const selIdx = p.indexOf('SELECTED CONTEXT')
    const pageIdx = p.indexOf('BEGIN PAGE CONTENT')
    expect(selIdx).toBeGreaterThan(-1)
    expect(selIdx).toBeLessThan(pageIdx)
    expect(p).toContain('[1]')
    expect(p).toContain('Auth · Code')
    expect(p).toContain('[2]')
    expect(p).toContain('API Error')
  })

  it('instructs the model to prioritize selected context', () => {
    const p = buildSystemPrompt('T', 'http://x', 'page', [
      { label: 'L', type: 'text', text: 'sel' },
    ])
    expect(p.toLowerCase()).toContain('prioritize')
  })
})
