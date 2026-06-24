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

export function openExpandSheet(
  shadow: ShadowRoot,
  c: SelectionContext,
  handlers: {
    onLock: (locked: boolean) => void
    onSave: (saved: boolean) => void
    onRemove: () => void
  },
): void {
  shadow.querySelector('.ag-sheet-backdrop')?.remove()
  const close = () => backdrop.remove()

  const lockBtn = el('button', { class: 'ag-sheet-btn' })
  lockBtn.append(iconSpan(c.locked ? 'lock' : 'unlock', 'ag-ic'), el('span', { text: c.locked ? 'Locked' : 'Lock' }))
  lockBtn.addEventListener('click', () => {
    handlers.onLock(!c.locked)
    close()
  })

  const saveBtn = el('button', { class: 'ag-sheet-btn' })
  saveBtn.append(iconSpan('bookmark', 'ag-ic'), el('span', { text: c.saved ? 'Saved' : 'Save for later' }))
  saveBtn.addEventListener('click', () => {
    handlers.onSave(!c.saved)
    close()
  })

  const rmBtn = el('button', { class: 'ag-sheet-btn ag-sheet-danger' })
  rmBtn.append(iconSpan('trash', 'ag-ic'), el('span', { text: 'Remove' }))
  rmBtn.addEventListener('click', () => {
    handlers.onRemove()
    close()
  })

  const sheet = el('div', { class: 'ag-sheet', attrs: { role: 'dialog', 'aria-label': c.label } }, [
    el('div', { class: 'ag-sheet-head' }, [
      iconSpan(iconForType(c.type), 'ag-pill-ic'),
      el('span', { class: 'ag-sheet-title', text: c.label }),
    ]),
    el('pre', { class: 'ag-sheet-body', text: c.text }),
    el('div', { class: 'ag-sheet-actions' }, [lockBtn, saveBtn, rmBtn]),
  ])
  const backdrop = el('div', { class: 'ag-sheet-backdrop' }, [sheet])
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close()
  })
  shadow.appendChild(backdrop)
}

export function renderPills(
  container: HTMLElement,
  contexts: SelectionContext[],
  handlers: {
    onRemove: (id: string) => void
    onClick: (c: SelectionContext) => void
    onHover?: (id: string) => void
    onHoverEnd?: (id: string) => void
    onReorder?: (draggedId: string, targetId: string) => void
    onExpand?: (c: SelectionContext) => void
  },
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
    pill.addEventListener('mouseenter', () => handlers.onHover?.(c.id))
    pill.addEventListener('mouseleave', () => handlers.onHoverEnd?.(c.id))
    pill.appendChild(rm)

    pill.setAttribute('draggable', 'true')
    pill.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', c.id)
      pill.classList.add('ag-pill-dragging')
    })
    pill.addEventListener('dragend', () => pill.classList.remove('ag-pill-dragging'))
    pill.addEventListener('dragover', (e) => e.preventDefault())
    pill.addEventListener('drop', (e) => {
      e.preventDefault()
      const dragged = e.dataTransfer?.getData('text/plain')
      if (dragged && dragged !== c.id) handlers.onReorder?.(dragged, c.id)
    })
    const grip = el('button', { class: 'ag-pill-grip', attrs: { 'aria-label': `Open ${c.label}` } })
    grip.appendChild(iconSpan('grip', 'ag-pill-x-ic'))
    grip.addEventListener('click', (e) => {
      e.stopPropagation()
      handlers.onExpand?.(c)
    })
    pill.insertBefore(grip, pill.firstChild)

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

      // Fast path: selection entirely within one text node (the common case).
      // A TreeWalker never visits its own root, so the walker below would yield
      // nothing when commonAncestorContainer is itself a Text node.
      if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
        const r = document.createRange()
        r.setStart(range.startContainer, range.startOffset)
        r.setEnd(range.endContainer, range.endOffset)
        if (!r.collapsed) {
          const mark = document.createElement('mark')
          mark.setAttribute(HL_ATTR, id)
          mark.className = 'ag-ctx-hl'
          try {
            r.surroundContents(mark)
            marks.push(mark)
          } catch {
            /* partial overlap; skip */
          }
        }
        return marks.length > 0
      }

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

  emphasize(id: string, on: boolean): void {
    document
      .querySelectorAll<HTMLElement>(`mark.ag-ctx-hl[${HL_ATTR}="${id}"]`)
      .forEach((m) => m.classList.toggle('ag-ctx-emph', on))
  }
}
