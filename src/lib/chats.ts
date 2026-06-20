// Per-page chat storage shapes and pure helpers.
// Pure functions only (no chrome / no DOM) so they are unit-testable.

export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Chat {
  createdAt: number
  updatedAt: number
  messages: StoredMessage[]
}

export type ChatMap = Record<string, Chat>

/**
 * A stable key identifying a page's conversation. Query string and hash are
 * dropped so reloads and in-page anchors share one chat, while different paths
 * (and different sites) stay isolated.
 */
export function makePageKey(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`
  } catch {
    return url
  }
}

/** Returns a new map with conversations older than maxAgeMs removed. */
export function pruneExpired(chats: ChatMap, now: number, maxAgeMs: number): ChatMap {
  const result: ChatMap = {}
  for (const [key, chat] of Object.entries(chats)) {
    if (now - chat.createdAt < maxAgeMs) result[key] = chat
  }
  return result
}
