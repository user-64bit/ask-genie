// Context pills (above the composer) + the floating Context Tray counter.
import { el, iconSpan } from './index'
import type { SelectionContext, ContextType } from '../lib/contexts'
import type { IconName } from '../ui/marks'

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
