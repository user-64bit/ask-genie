// Bridges the live DOM to the pure anchor offsets in lib/anchor. We build a
// single normalized text string of the page's visible text plus a segment map
// so offsets convert back to DOM Ranges. Skips our own UI and non-visible nodes.
import { buildAnchor } from '../lib/anchor'
import type { Anchor } from '../lib/contexts'
import type { LabelInput } from '../lib/labeler'

const ROOT_ID = 'ask-genie-root'
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'])

export interface DomText {
  text: string
  segments: { node: Text; start: number; end: number }[]
}

export function getDomText(root: HTMLElement = document.body): DomText {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (parent.id === ROOT_ID || parent.closest(`#${ROOT_ID}`)) return NodeFilter.FILTER_REJECT
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT
      if (!(node as Text).data.trim()) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const segments: DomText['segments'] = []
  let text = ''
  let n = walker.nextNode() as Text | null
  while (n) {
    const start = text.length
    text += n.data
    segments.push({ node: n, start, end: text.length })
    n = walker.nextNode() as Text | null
  }
  return { text, segments }
}

/** Global offset of a (node, nodeOffset) point within the DomText. */
function pointToOffset(dt: DomText, node: Node, offset: number): number | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const seg = dt.segments.find((s) => s.node === node)
    return seg ? seg.start + Math.min(offset, (node as Text).data.length) : null
  }
  // Element point: map to the start of the first descendant text segment.
  const first = dt.segments.find((s) => node.contains(s.node))
  return first ? first.start : null
}

export function selectionToAnchor(sel: Selection): Anchor | null {
  if (!sel.rangeCount || sel.isCollapsed) return null
  const exact = sel.toString()
  if (exact.trim().length < 2) return null

  const dt = getDomText()
  const range = sel.getRangeAt(0)
  let start = pointToOffset(dt, range.startContainer, range.startOffset)
  let end = pointToOffset(dt, range.endContainer, range.endOffset)
  if (start == null || end == null) return null
  if (start > end) [start, end] = [end, start]

  // Trust the live selection text for `exact`; align offsets if the slice drifts
  // (whitespace at node boundaries). Fall back to searching the exact string.
  if (dt.text.slice(start, end) !== exact) {
    const idx = dt.text.indexOf(exact, Math.max(0, start - 64))
    if (idx !== -1) {
      start = idx
      end = idx + exact.length
    }
  }
  return buildAnchor(dt.text, start, end)
}

function ancestorTags(node: Node | null): string[] {
  const tags: string[] = []
  let el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element | null)
  while (el && el.id !== ROOT_ID && el.tagName !== 'BODY') {
    tags.push(el.tagName.toLowerCase())
    el = el.parentElement
  }
  return tags
}

function nearestHeading(node: Node | null): string | null {
  let el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element | null)
  // Walk previous siblings / ancestors looking for the closest heading.
  while (el && el.tagName !== 'BODY') {
    let sib: Element | null = el
    while (sib) {
      if (/^H[1-6]$/.test(sib.tagName)) return (sib.textContent || '').trim() || null
      sib = sib.previousElementSibling
    }
    el = el.parentElement
  }
  const h = document.querySelector('h1')
  return h ? (h.textContent || '').trim() || null : null
}

export function selectionLabelInput(sel: Selection): LabelInput {
  const range = sel.rangeCount ? sel.getRangeAt(0) : null
  const container = range?.commonAncestorContainer ?? null
  return {
    text: sel.toString(),
    ancestorTags: ancestorTags(container),
    nearestHeading: nearestHeading(container),
  }
}

/** Convert global offsets back into a live Range (used by the highlighter). */
export function offsetsToRange(start: number, end: number): Range | null {
  const dt = getDomText()
  const startSeg = dt.segments.find((s) => start >= s.start && start < s.end)
  const endSeg = dt.segments.find((s) => end > s.start && end <= s.end)
  if (!startSeg || !endSeg) return null
  const range = document.createRange()
  range.setStart(startSeg.node, start - startSeg.start)
  range.setEnd(endSeg.node, end - endSeg.start)
  return range
}
