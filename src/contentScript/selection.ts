// Floating on-selection toolbar: primary "Ask Genie" (opens panel w/ selection
// added) + quiet "+" (adds context silently). Positions above the selection,
// flips below near the top, clamps to the viewport. Lives in the Shadow DOM.
import { el, iconSpan } from './index'
import { selectionToAnchor, selectionLabelInput } from './dom-text'
import { labelSelection } from '../lib/labeler'
import { sendMessage, type AddContextResponse } from '../lib/messages'

interface ToolbarOpts {
  getPageKey: () => string
  onAdded: () => void
  onAsk: () => void
}

const GUTTER = 12
const GAP = 8

export function initSelectionToolbar(shadow: ShadowRoot, opts: ToolbarOpts): void {
  let bar: HTMLDivElement | null = null

  const remove = () => {
    bar?.remove()
    bar = null
  }

  async function capture(): Promise<boolean> {
    const sel = window.getSelection()
    if (!sel) return false
    const anchor = selectionToAnchor(sel)
    if (!anchor) return false
    const { type, label } = labelSelection(selectionLabelInput(sel))
    const res = await sendMessage<AddContextResponse>({
      type: 'ADD_CONTEXT',
      pageKey: opts.getPageKey(),
      url: location.href,
      title: document.title,
      context: { type, label, text: anchor.exact, anchor },
    })
    return res.ok
  }

  function position(rect: DOMRect) {
    if (!bar) return
    const bw = bar.offsetWidth || 180
    const bh = bar.offsetHeight || 40
    let top = rect.top - bh - GAP
    let flip = false
    if (top < GUTTER) {
      top = rect.bottom + GAP
      flip = true
    }
    let left = rect.left + rect.width / 2 - bw / 2
    left = Math.max(GUTTER, Math.min(left, window.innerWidth - bw - GUTTER))
    bar.style.top = `${top}px`
    bar.style.left = `${left}px`
    bar.classList.toggle('ag-tb-below', flip)
  }

  function show(rect: DOMRect) {
    remove()
    const ask = el('button', { class: 'ag-tb-ask', attrs: { 'aria-label': 'Ask Genie about selection' } })
    ask.append(iconSpan('sparkles', 'ag-tb-ic'), el('span', { text: 'Ask Genie' }))
    const add = el('button', { class: 'ag-tb-add', attrs: { 'aria-label': 'Add selection as context', title: 'Add as context' } })
    add.appendChild(iconSpan('plus', 'ag-tb-ic'))

    bar = el('div', { class: 'ag-toolbar', attrs: { role: 'toolbar', 'aria-label': 'Ask Genie selection actions' } }, [
      ask,
      el('span', { class: 'ag-tb-div' }),
      add,
    ]) as HTMLDivElement

    ask.addEventListener('mousedown', (e) => e.preventDefault())
    add.addEventListener('mousedown', (e) => e.preventDefault())
    ask.addEventListener('click', async () => {
      await capture()
      remove()
      opts.onAsk()
      opts.onAdded()
    })
    add.addEventListener('click', async () => {
      const ok = await capture()
      if (ok) {
        add.replaceChildren(iconSpan('check', 'ag-tb-ic'), el('span', { text: 'Added' }))
        bar?.classList.add('ag-tb-added')
        opts.onAdded()
        window.setTimeout(remove, 700)
      }
    })

    shadow.appendChild(bar)
    position(rect)
    requestAnimationFrame(() => bar?.classList.add('ag-tb-in'))
  }

  function evaluate() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 2) {
      remove()
      return
    }
    // Ignore selections inside editable fields or our own UI.
    const anchorNode = sel.anchorNode
    const anchorEl = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : (anchorNode as Element | null)
    if (anchorEl?.closest('input, textarea, [contenteditable=""], [contenteditable="true"]')) {
      remove()
      return
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      remove()
      return
    }
    show(rect)
  }

  document.addEventListener('selectionchange', () => {
    // Debounce to the end of the user's drag.
    window.clearTimeout((evaluate as any)._t)
    ;(evaluate as any)._t = window.setTimeout(evaluate, 120)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') remove()
  })
  document.addEventListener('keydown', async (e) => {
    const target = e.target as HTMLElement | null
    if (target?.closest('input, textarea, [contenteditable=""], [contenteditable="true"]')) return
    const mod = e.metaKey || e.ctrlKey
    // Add selection as context: Cmd/Ctrl+Shift+J (A and S are reserved by Chrome).
    if (mod && e.shiftKey && (e.key === 'j' || e.key === 'J')) {
      const ok = await capture()
      if (ok) {
        opts.onAdded()
        e.preventDefault()
      }
    }
    // Ask about selection while the toolbar is live: Cmd/Ctrl+Enter.
    if (mod && e.key === 'Enter' && bar) {
      await capture()
      remove()
      opts.onAsk()
      opts.onAdded()
      e.preventDefault()
    }
  })
  window.addEventListener('scroll', remove, { passive: true })
  window.addEventListener('resize', remove)
}
