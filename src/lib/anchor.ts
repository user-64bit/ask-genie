// Text-quote + text-position anchoring (Hypothesis-style). Pure string logic:
// the DOM <-> offset binding lives in the content script (dom-text.ts).
import type { Anchor } from './contexts'

const DEFAULT_CTX = 32

export function buildAnchor(
  pageText: string,
  start: number,
  end: number,
  ctxLen = DEFAULT_CTX,
): Anchor {
  return {
    exact: pageText.slice(start, end),
    prefix: pageText.slice(Math.max(0, start - ctxLen), start),
    suffix: pageText.slice(end, end + ctxLen),
    startPos: start,
    endPos: end,
  }
}

/** Count of matching chars between two strings read from their adjacent ends. */
function tailMatch(a: string, b: string): number {
  let n = 0
  let i = a.length - 1
  let j = b.length - 1
  while (i >= 0 && j >= 0 && a[i] === b[j]) {
    n++
    i--
    j--
  }
  return n
}

function headMatch(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n]) n++
  return n
}

export function scoreMatch(pageText: string, idx: number, anchor: Anchor): number {
  const before = pageText.slice(Math.max(0, idx - anchor.prefix.length), idx)
  const after = pageText.slice(idx + anchor.exact.length, idx + anchor.exact.length + anchor.suffix.length)
  const prefixScore = tailMatch(before, anchor.prefix)
  const suffixScore = headMatch(after, anchor.suffix)
  // Proximity: small bonus for being near the original position.
  const dist = Math.abs(idx - anchor.startPos)
  const proximity = 1 / (1 + dist / 500)
  return prefixScore + suffixScore + proximity
}

export function reanchor(
  pageText: string,
  anchor: Anchor,
): { start: number; end: number } | null {
  const { exact, startPos, endPos } = anchor
  if (!exact) return null

  // Fast-path: unchanged document.
  if (pageText.slice(startPos, endPos) === exact) {
    return { start: startPos, end: endPos }
  }

  // Collect all occurrences of the exact text.
  const matches: number[] = []
  let from = 0
  for (;;) {
    const idx = pageText.indexOf(exact, from)
    if (idx === -1) break
    matches.push(idx)
    from = idx + Math.max(1, exact.length)
  }
  if (matches.length === 0) return null
  if (matches.length === 1) return { start: matches[0], end: matches[0] + exact.length }

  let best = matches[0]
  let bestScore = -Infinity
  for (const idx of matches) {
    const s = scoreMatch(pageText, idx, anchor)
    if (s > bestScore) {
      bestScore = s
      best = idx
    }
  }
  return { start: best, end: best + exact.length }
}
