// Context pills (above the composer) + the floating Context Tray counter.
import { el, iconSpan } from './index'
import type { SelectionContext, ContextType } from '../lib/contexts'
import type { IconName } from '../ui/marks'
import { offsetsToRange, getDomText } from './dom-text'
import { reanchor } from '../lib/anchor'

export function iconForType(type: ContextType): IconName {
  switch (type) {
    case 'code':
      return 'code'
    case 'table':
      return 'table'
    case 'error':
      return 'alert'
    case 'pricing':
      return 'insights'
    case 'doc':
      return 'summarize'
    case 'list':
      return 'actions'
    case 'quote':
      return 'explain'
    case 'text':
      return 'sparkles'
    default:
      return 'sparkles'
  }
}

export function renderPills(
  container: HTMLElement,
  contexts: SelectionContext[],
  handlers: { onRemove: (id: string) => void; onClick: (c: SelectionContext) => void },
): void {
  container.replaceChildren()
  container.classList.toggle('ag-hidden', contexts.length === 0)
  for (const c of contexts) {
    const pill = el('div', {
      class: 'ag-pill',
      attrs: { role: 'listitem', 'data-ctx-id': c.id, title: c.text.slice(0, 280) },
    })
    pill.append(
      iconSpan(iconForType(c.type), 'ag-pill-ic'),
      el('span', { class: 'ag-pill-label', text: c.label }),
    )
    const rm = el('button', { class: 'ag-pill-x', attrs: { 'aria-label': `Remove ${c.label}` } })
    rm.appendChild(iconSpan('close', 'ag-pill-x-ic'))
    rm.addEventListener('click', (e) => {
      e.stopPropagation()
      handlers.onRemove(c.id)
    })
    pill.addEventListener('click', () => handlers.onClick(c))
    pill.appendChild(rm)
    container.appendChild(pill)
  }
}

export function renderTray(host: ShadowRoot, count: number, onOpen: () => void): void {
  let tray = host.querySelector<HTMLDivElement>('.ag-tray')
  if (count === 0) {
    tray?.remove()
    return
  }
  if (!tray) {
    tray = el('div', {
      class: 'ag-tray',
      attrs: { role: 'button', tabindex: '0', 'aria-label': 'Open Ask Genie with collected context' },
    }) as HTMLDivElement
    tray.append(
      el('span', { class: 'ag-tray-dot' }),
      el('span', { class: 'ag-tray-count' }),
      el('span', { class: 'ag-tray-label', text: 'contexts' }),
    )
    tray.addEventListener('click', onOpen)
    tray.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onOpen()
      }
    })
    host.appendChild(tray)
  }
  const countEl = tray.querySelector('.ag-tray-count')!
  countEl.textContent = String(count)
  tray.classList.remove('ag-tray-bump')
  void tray.offsetWidth
  tray.classList.add('ag-tray-bump')
}

const HL_ATTR = 'data-ag-ctx'

export class HighlightController {
  /** Wrap a Range's text nodes in <mark> spans tagged with the context id. */
  private mark(range: Range, id: string): boolean {
    try {
      const marks: HTMLElement[] = []
      // Wrap per intersecting text node to survive multi-element ranges.
      const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (n) =>
            range.intersectsNode(n) && (n as Text).data.trim()
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT,
        },
      )
      let node = walker.nextNode() as Text | null
      const nodes: Text[] = []
      while (node) {
        nodes.push(node)
        node = walker.nextNode() as Text | null
      }
      for (const n of nodes) {
        const r = document.createRange()
        r.selectNodeContents(n)
        if (n === range.startContainer) r.setStart(n, range.startOffset)
        if (n === range.endContainer) r.setEnd(n, range.endOffset)
        if (r.collapsed) continue
        const mark = document.createElement('mark')
        mark.setAttribute(HL_ATTR, id)
        mark.className = 'ag-ctx-hl'
        try {
          r.surroundContents(mark)
          marks.push(mark)
        } catch {
          /* node spans element boundary; skip this fragment */
        }
      }
      return marks.length > 0
    } catch {
      return false
    }
  }

  clear(id?: string): void {
    const sel = id ? `mark.ag-ctx-hl[${HL_ATTR}="${id}"]` : 'mark.ag-ctx-hl'
    document.querySelectorAll<HTMLElement>(sel).forEach((m) => {
      const parent = m.parentNode
      if (!parent) return
      while (m.firstChild) parent.insertBefore(m.firstChild, m)
      parent.removeChild(m)
      parent.normalize()
    })
  }

  sync(contexts: SelectionContext[]): { id: string; found: boolean }[] {
    this.clear()
    const dt = getDomText()
    const results: { id: string; found: boolean }[] = []
    for (const c of contexts) {
      const hit = reanchor(dt.text, c.anchor)
      let found = false
      if (hit) {
        const range = offsetsToRange(hit.start, hit.end)
        if (range) found = this.mark(range, c.id)
      }
      results.push({ id: c.id, found })
    }
    return results
  }

  flash(id: string): void {
    const marks = document.querySelectorAll<HTMLElement>(`mark.ag-ctx-hl[${HL_ATTR}="${id}"]`)
    if (!marks.length) return
    marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
    marks.forEach((m) => {
      m.classList.remove('ag-ctx-flash')
      void m.offsetWidth
      m.classList.add('ag-ctx-flash')
    })
  }
}
