// Selected-context types and pure helpers. No DOM, no chrome — node-testable.
import { truncate } from './extract'

export type ContextType =
  | 'code'
  | 'table'
  | 'doc'
  | 'error'
  | 'pricing'
  | 'list'
  | 'quote'
  | 'text'

export interface Anchor {
  exact: string
  prefix: string
  suffix: string
  startPos: number
  endPos: number
}

export interface NewContextInput {
  type: ContextType
  label: string
  text: string
  anchor: Anchor
}

export interface SelectionContext {
  id: string
  pageKey: string
  url: string
  title: string
  type: ContextType
  label: string
  text: string
  anchor: Anchor
  createdAt: number
  order: number
  locked: boolean
  saved: boolean
  lastSeenAt: number
}

/** Per-context and total caps for what we send to the model. */
export const CONTEXT_MAX_CHARS = 8000
export const TOTAL_CONTEXT_BUDGET = 20000

export function createContext(
  input: NewContextInput,
  meta: { pageKey: string; url: string; title: string; order: number; now: number },
): SelectionContext {
  return {
    id: crypto.randomUUID(),
    pageKey: meta.pageKey,
    url: meta.url,
    title: meta.title,
    type: input.type,
    label: input.label,
    text: input.text,
    anchor: input.anchor,
    createdAt: meta.now,
    order: meta.order,
    locked: false,
    saved: false,
    lastSeenAt: meta.now,
  }
}

/** Stable identity for a selection, used to dedupe re-captures of the same range. */
export function anchorKey(a: Anchor): string {
  return `${a.startPos}:${a.endPos}:${a.exact.slice(0, 64)}`
}

export function findDuplicate(
  list: SelectionContext[],
  a: Anchor,
): SelectionContext | undefined {
  const key = anchorKey(a)
  return list.find((c) => anchorKey(c.anchor) === key)
}

export function nextOrder(list: SelectionContext[]): number {
  return list.length ? Math.max(...list.map((c) => c.order)) + 1 : 0
}

export function sortByOrder(list: SelectionContext[]): SelectionContext[] {
  return [...list].sort((a, b) => a.order - b.order)
}

/** Returns a new list whose `order` matches the given id sequence. */
export function reorder(list: SelectionContext[], orderedIds: string[]): SelectionContext[] {
  const rank = new Map(orderedIds.map((id, i) => [id, i]))
  return list.map((c) => (rank.has(c.id) ? { ...c, order: rank.get(c.id)! } : c))
}

/** Oldest-first ids that may be evicted (never locked or saved), up to `needed`. */
export function selectEvictions(list: SelectionContext[], needed: number): string[] {
  return [...list]
    .filter((c) => !c.locked && !c.saved)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, Math.max(0, needed))
    .map((c) => c.id)
}

/** Cap each context, then drop trailing contexts so the total stays under budget. */
export function buildContextBlock(
  contexts: { label: string; type: ContextType; text: string }[],
  budget = TOTAL_CONTEXT_BUDGET,
): { label: string; type: ContextType; text: string }[] {
  const out: { label: string; type: ContextType; text: string }[] = []
  let used = 0
  for (const c of contexts) {
    const text = truncate(c.text, CONTEXT_MAX_CHARS)
    if (used + text.length > budget && out.length > 0) break
    out.push({ label: c.label, type: c.type, text })
    used += text.length
  }
  return out
}
