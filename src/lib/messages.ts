// Typed message protocol between content script / popup and the background
// service worker. The background is the only holder of the API key.

import type { StoredMessage } from './chats'
import type { Provider } from './config'
import type { SelectionContext, NewContextInput } from './contexts'

export type RuntimeRequest =
  | { type: 'GET_CONFIG_STATUS' }
  | { type: 'OPEN_OPTIONS' }
  | { type: 'REGISTER_PAGE'; pageKey: string }
  | { type: 'GET_CHAT'; pageKey: string }
  | { type: 'CLEAR_CHAT'; pageKey: string }
  | { type: 'CLEAR_ALL' }
  | {
      type: 'ASK'
      pageKey: string
      url: string
      title: string
      question: string
      context: string
      contextIds: string[]
    }
  | { type: 'ADD_CONTEXT'; pageKey: string; url: string; title: string; context: NewContextInput }
  | { type: 'LIST_CONTEXTS'; pageKey: string }
  | { type: 'REMOVE_CONTEXT'; id: string }
  | { type: 'REORDER_CONTEXTS'; pageKey: string; orderedIds: string[] }
  | { type: 'CLEAR_CONTEXTS'; pageKey: string }
  | { type: 'LOCK_CONTEXT'; id: string; locked: boolean }
  | { type: 'SAVE_CONTEXT'; id: string; saved: boolean }
  | { type: 'LIST_SAVED' }

export interface ConfigStatus {
  configured: boolean
  provider: Provider | null
  model: string | null
}

export interface ChatResponse {
  messages: StoredMessage[]
}

export interface ContextsResponse {
  contexts: SelectionContext[]
}

export interface AddContextResponse {
  ok: boolean
  context?: SelectionContext
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
