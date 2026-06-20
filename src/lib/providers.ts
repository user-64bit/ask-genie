// Provider registry + request building/parsing for direct, BYO-key AI calls.
// buildRequest / parseResponse / parseError are pure and unit-tested.
// callProvider performs the actual fetch (background worker only).

import type { Provider } from './config'
import type { StoredMessage } from './chats'

export interface ProviderModel {
  id: string
  label: string
}

export interface ProviderInfo {
  label: string
  apiKeyHint: string
  apiKeyPrefix: string
  models: ProviderModel[]
  consoleUrl: string
}

export const PROVIDERS: Record<Provider, ProviderInfo> = {
  openai: {
    label: 'OpenAI',
    apiKeyHint: 'sk-...',
    apiKeyPrefix: 'sk-',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini · fast & cheap' },
      { id: 'gpt-4o', label: 'GPT-4o · higher quality' },
    ],
    consoleUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    apiKeyHint: 'sk-ant-...',
    apiKeyPrefix: 'sk-ant-',
    models: [
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 · fast & cheap' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 · higher quality' },
    ],
    consoleUrl: 'https://console.anthropic.com/settings/keys',
  },
}

export const DEFAULT_PROVIDER: Provider = 'openai'

export function defaultModelFor(provider: Provider): string {
  return PROVIDERS[provider].models[0].id
}

export function isKnownModel(provider: Provider, model: string): boolean {
  return PROVIDERS[provider].models.some((m) => m.id === model)
}

const MAX_TOKENS = 1024

export function buildSystemPrompt(title: string, url: string, context: string): string {
  return [
    "You are Ask Genie, a helpful assistant embedded in the user's web browser.",
    'Answer the user’s questions about the web page they are currently viewing.',
    'Ground your answers in the page content below. If the answer is not present on',
    'the page, say so briefly and then answer from general knowledge, making clear it',
    'is not from the page. Be concise and format answers with Markdown.',
    '',
    `Page title: ${title || 'Untitled'}`,
    `Page URL: ${url}`,
    '',
    '--- BEGIN PAGE CONTENT ---',
    context || '(No readable content could be extracted from this page.)',
    '--- END PAGE CONTENT ---',
  ].join('\n')
}

export interface ProviderRequest {
  url: string
  headers: Record<string, string>
  body: string
}

export function buildRequest(
  provider: Provider,
  model: string,
  apiKey: string,
  system: string,
  history: StoredMessage[],
): ProviderRequest {
  const messages = history.map((m) => ({ role: m.role, content: m.content }))

  if (provider === 'anthropic') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Required for calls originating from a browser/extension context.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system, messages }),
    }
  }

  return {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  }
}

export function parseResponse(provider: Provider, data: unknown): string {
  const d = data as any
  if (provider === 'anthropic') {
    const blocks = d?.content
    if (!Array.isArray(blocks)) return ''
    return blocks
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text as string)
      .join('')
      .trim()
  }
  return String(d?.choices?.[0]?.message?.content ?? '').trim()
}

export function parseError(status: number, data: unknown): string {
  const d = data as any
  const detail = d?.error?.message || d?.error?.type
  if (status === 401) return 'Invalid API key. Check your key in Settings.'
  if (status === 403) return 'Your API key does not have access to this model.'
  if (status === 429) return 'Rate limited or out of quota. Please try again later.'
  return `Request failed (${status})${detail ? `: ${detail}` : ''}`
}

export async function callProvider(
  config: { provider: Provider; model: string; apiKey: string },
  system: string,
  history: StoredMessage[],
): Promise<string> {
  const req = buildRequest(config.provider, config.model, config.apiKey, system, history)
  let res: Response
  try {
    res = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body })
  } catch {
    throw new Error('Network error. Check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(parseError(res.status, data))
  const text = parseResponse(config.provider, data)
  if (!text) throw new Error('The model returned an empty response.')
  return text
}
