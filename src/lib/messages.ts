// Typed message protocol between content script / popup and the background
// service worker. The background is the only holder of the API key.

import type { StoredMessage } from './chats'
import type { Provider } from './config'

export type RuntimeRequest =
  | { type: 'GET_CONFIG_STATUS' }
  | { type: 'OPEN_OPTIONS' }
  | { type: 'REGISTER_PAGE'; pageKey: string }
  | { type: 'GET_CHAT'; pageKey: string }
  | { type: 'CLEAR_CHAT'; pageKey: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'ASK'; pageKey: string; url: string; title: string; question: string; context: string }

export interface ConfigStatus {
  configured: boolean
  provider: Provider | null
  model: string | null
}

export interface ChatResponse {
  messages: StoredMessage[]
}

export interface AskResponse {
  ok: boolean
  reply?: string
  error?: string
}

export interface OkResponse {
  ok: boolean
}

export function sendMessage<T = unknown>(message: RuntimeRequest): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>
}
