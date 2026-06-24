// Ask Genie content script: injects a floating lamp + chat panel on every page.
// All AI work goes through the background worker — this script never sees the
// API key. UI lives in a Shadow DOM so the host page's CSS can't break it and
// ours can't leak out.

import styles from './styles.css?inline'
import { extractPageContent } from '../lib/extract'
import { renderMarkdown } from '../lib/markdown'
import { makePageKey, type StoredMessage } from '../lib/chats'
import { genieGlyph, icon, type IconName } from '../ui/marks'
import {
  sendMessage,
  type AskResponse,
  type ChatResponse,
  type ConfigStatus,
  type ContextsResponse,
} from '../lib/messages'
import { initSelectionToolbar } from './selection'
import { renderPills, renderTray, HighlightController } from './contexts-ui'

const ROOT_ID = 'ask-genie-root'

// One-click "wishes": a label, the icon that fronts it, and the prompt it sends.
const QUICK_ACTIONS: { label: string; icon: IconName; prompt: string }[] = [
  {
    label: 'Summarize',
    icon: 'summarize',
    prompt: 'Summarize this page in 5 concise bullet points.',
  },
  {
    label: 'Key insights',
    icon: 'insights',
    prompt: 'What are the most important takeaways from this page?',
  },
  {
    label: 'Explain simply',
    icon: 'explain',
    prompt: 'Explain the main idea of this page in simple terms.',
  },
  {
    label: 'Action items',
    icon: 'actions',
    prompt: 'List concrete action items based on this page.',
  },
  {
    label: 'Translate',
    icon: 'translate',
    prompt:
      'Translate the main content of this page into English, keeping it faithful and well-structured. If it is already in English, say so and tell me to name a target language.',
  },
]

interface El {
  bubble: HTMLDivElement
  panel: HTMLDivElement
  messages: HTMLDivElement
  quick: HTMLDivElement
  pills: HTMLDivElement
  input: HTMLTextAreaElement
  send: HTMLButtonElement
}

let chatLoaded = false
let configured = false
let busy = false
let pageKey = makePageKey(location.href)
let activeContextIds: string[] = []
const highlighter = new HighlightController()
let mo: MutationObserver | null = null
let reanchorTimer = 0
const MO_OPTS: MutationObserverInit = { childList: true, subtree: true, characterData: true }

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: { class?: string; text?: string; attrs?: Record<string, string> } = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (opts.class) node.className = opts.class
  if (opts.text) node.textContent = opts.text
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v)
  for (const child of children) node.appendChild(child)
  return node
}

/** Build an element from one of our trusted, author-controlled SVG strings. */
export function svgFrom(raw: string): SVGElement {
  const tpl = document.createElement('template')
  tpl.innerHTML = raw.trim()
  return tpl.content.firstElementChild as SVGElement
}

export function iconSpan(name: IconName, cls = 'ag-ic'): HTMLSpanElement {
  const span = el('span', { class: cls })
  span.appendChild(svgFrom(icon(name)))
  return span
}

function scrollToBottom(messages: HTMLElement) {
  messages.scrollTop = messages.scrollHeight
}

function renderMessage(
  messages: HTMLElement,
  role: StoredMessage['role'],
  content: string,
): HTMLElement {
  const row = el('div', { class: `ag-row ag-row-${role}` })
  const bubble = el('div', { class: `ag-msg ag-${role}` })
  if (role === 'assistant') {
    const avatar = el('span', { class: 'ag-avatar' })
    avatar.appendChild(svgFrom(genieGlyph()))
    row.appendChild(avatar)
    bubble.appendChild(renderMarkdown(content))
  } else {
    bubble.textContent = content // user input rendered as plain text
  }
  row.appendChild(bubble)
  messages.appendChild(row)
  scrollToBottom(messages)
  return bubble
}

function showNotice(
  messages: HTMLElement,
  title: string,
  body: string,
  action?: { label: string; onClick: () => void },
) {
  messages.replaceChildren()
  const lamp = el('div', { class: 'ag-notice-lamp' })
  lamp.appendChild(svgFrom(genieGlyph()))
  const notice = el('div', { class: 'ag-notice' }, [
    lamp,
    el('p', { class: 'ag-notice-title', text: title }),
    el('p', { class: 'ag-notice-body', text: body }),
  ])
  if (action) {
    const btn = el('button', { class: 'ag-btn-primary' })
    btn.append(iconSpan('key'), el('span', { text: action.label }))
    btn.addEventListener('click', action.onClick)
    notice.appendChild(btn)
  }
  messages.appendChild(notice)
}

function renderEmptyState(messages: HTMLElement) {
  const lamp = el('div', { class: 'ag-empty-lamp' })
  lamp.appendChild(svgFrom(genieGlyph()))
  messages.appendChild(
    el('div', { class: 'ag-empty' }, [
      lamp,
      el('p', { class: 'ag-empty-title', text: 'Make a wish' }),
      el('p', {
        class: 'ag-empty-body',
        text: 'Ask anything about this page — or grant yourself a quick wish below.',
      }),
    ]),
  )
}

function build(): El {
  const host = el('div', { attrs: { id: ROOT_ID } })
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.appendChild(el('style', { text: styles }))

  // Bubble: gold lamp glyph on a glowing violet coin.
  const bubble = el('div', {
    class: 'ag-bubble',
    attrs: { role: 'button', tabindex: '0', 'aria-label': 'Open Ask Genie', title: 'Ask Genie' },
  })
  bubble.append(el('span', { class: 'ag-bubble-aura' }), svgFrom(genieGlyph()))

  const messages = el('div', { class: 'ag-messages' })

  const quick = el('div', { class: 'ag-quick' })
  for (const action of QUICK_ACTIONS) {
    const chip = el('button', { class: 'ag-chip', attrs: { title: action.label } })
    chip.append(iconSpan(action.icon, 'ag-chip-ic'), el('span', { text: action.label }))
    chip.addEventListener('click', () => submit(action.prompt))
    quick.appendChild(chip)
  }

  const input = el('textarea', {
    class: 'ag-input',
    attrs: { rows: '1', placeholder: 'Ask about this page…', 'aria-label': 'Ask about this page' },
  }) as HTMLTextAreaElement

  const send = el('button', { class: 'ag-send', attrs: { 'aria-label': 'Send' } })
  send.appendChild(iconSpan('send', 'ag-send-ic'))

  const clearBtn = el('button', {
    class: 'ag-icon-btn',
    attrs: { title: 'Clear this chat', 'aria-label': 'Clear chat' },
  })
  clearBtn.appendChild(iconSpan('trash'))
  const closeBtn = el('button', {
    class: 'ag-icon-btn',
    attrs: { title: 'Close', 'aria-label': 'Close' },
  })
  closeBtn.appendChild(iconSpan('close'))

  const badge = el('span', { class: 'ag-badge' })
  badge.appendChild(svgFrom(genieGlyph()))

  const titleBlock = el('div', { class: 'ag-titleblock' }, [
    el('span', { class: 'ag-title', text: 'Ask Genie' }),
    el('span', { class: 'ag-context' }, [
      iconSpan('explain', 'ag-context-ic'),
      el('span', { text: `Reading ${location.hostname}` }),
    ]),
  ])

  const header = el('div', { class: 'ag-header' }, [
    el('div', { class: 'ag-brand' }, [badge, titleBlock]),
    el('div', { class: 'ag-header-actions' }, [clearBtn, closeBtn]),
  ])

  const note = el('div', { class: 'ag-note' }, [
    iconSpan('shield', 'ag-note-ic'),
    el('span', {
      text: 'Private — your key stays in your browser. Chats vanish 24h after they start.',
    }),
  ])
  const inputBar = el('div', { class: 'ag-inputbar' }, [input, send])
  const pills = el('div', { class: 'ag-pills ag-hidden', attrs: { role: 'list', 'aria-label': 'Selected contexts' } })
  const composer = el('div', { class: 'ag-composer' }, [pills, quick, inputBar, note])

  const panel = el('div', { class: 'ag-panel ag-hidden' }, [header, messages, composer])

  shadow.append(bubble, panel)
  ;(document.documentElement || document.body).appendChild(host)

  const refs: El = { bubble, panel, messages, quick, pills, input, send }

  bubble.addEventListener('click', () => openPanel(refs))
  bubble.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPanel(refs)
    }
  })
  closeBtn.addEventListener('click', () => closePanel(refs))
  clearBtn.addEventListener('click', () => clearChat(refs))
  send.addEventListener('click', () => submit(refs.input.value))
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(refs.input.value)
    }
    if (e.key === 'Escape') closePanel(refs)
  })
  input.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`
  })

  return refs
}

let elements: El

async function openPanel(refs: El) {
  refs.bubble.classList.add('ag-hidden')
  refs.panel.classList.remove('ag-hidden')
  // Restart the summon animation each open.
  refs.panel.classList.remove('ag-in')
  void refs.panel.offsetWidth
  refs.panel.classList.add('ag-in')

  // Re-check config each open so a key added mid-session is picked up.
  const status = await sendMessage<ConfigStatus>({ type: 'GET_CONFIG_STATUS' })
  configured = status.configured

  if (!configured) {
    setEnabled(refs, false)
    showNotice(
      refs.messages,
      'Summon the genie',
      'Add your AI API key to start chatting about this page.',
      { label: 'Open Settings', onClick: () => void sendMessage({ type: 'OPEN_OPTIONS' }) },
    )
    return
  }

  setEnabled(refs, true)
  if (!chatLoaded) {
    chatLoaded = true
    const { messages } = await sendMessage<ChatResponse>({ type: 'GET_CHAT', pageKey })
    refs.messages.replaceChildren()
    if (messages.length === 0) {
      renderEmptyState(refs.messages)
    } else {
      for (const m of messages) renderMessage(refs.messages, m.role, m.content)
    }
  }
  void refreshContexts()
  refs.input.focus()
}

function closePanel(refs: El) {
  refs.panel.classList.add('ag-out')
  const finish = () => {
    refs.panel.classList.add('ag-hidden')
    refs.panel.classList.remove('ag-in', 'ag-out')
    refs.bubble.classList.remove('ag-hidden')
  }
  // Animate out, but fall back if animations are disabled (reduced motion).
  const t = window.setTimeout(finish, 200)
  refs.panel.addEventListener(
    'animationend',
    () => {
      window.clearTimeout(t)
      finish()
    },
    { once: true },
  )
}

function setEnabled(refs: El, enabled: boolean) {
  refs.input.disabled = !enabled
  refs.send.disabled = !enabled || busy
  refs.quick
    .querySelectorAll('button')
    .forEach((b) => ((b as HTMLButtonElement).disabled = !enabled || busy))
}

async function clearChat(refs: El) {
  await sendMessage({ type: 'CLEAR_CHAT', pageKey })
  refs.messages.replaceChildren()
  if (configured) renderEmptyState(refs.messages)
}

async function submit(rawText: string) {
  const text = rawText.trim()
  if (!text || busy || !configured) return

  const refs = elements
  // Drop the empty-state hint on first real message.
  const empty = refs.messages.querySelector('.ag-empty')
  if (empty) empty.remove()

  refs.input.value = ''
  refs.input.style.height = 'auto'
  renderMessage(refs.messages, 'user', text)

  busy = true
  setEnabled(refs, false)
  const typing = el('div', { class: 'ag-row ag-row-assistant' }, [
    (() => {
      const avatar = el('span', { class: 'ag-avatar' })
      avatar.appendChild(svgFrom(genieGlyph()))
      return avatar
    })(),
    el('div', { class: 'ag-msg ag-assistant ag-typing' }, [
      el('span', { class: 'ag-dot' }),
      el('span', { class: 'ag-dot' }),
      el('span', { class: 'ag-dot' }),
    ]),
  ])
  refs.messages.appendChild(typing)
  scrollToBottom(refs.messages)

  const context = extractPageContent(document)
  const res = await sendMessage<AskResponse>({
    type: 'ASK',
    pageKey,
    url: location.href,
    title: document.title,
    question: text,
    context,
    contextIds: activeContextIds,
  })

  typing.remove()
  if (res.ok && res.reply) {
    renderMessage(refs.messages, 'assistant', res.reply)
  } else {
    const err = renderMessage(refs.messages, 'assistant', res.error || 'Something went wrong.')
    err.classList.add('ag-error')
  }

  busy = false
  setEnabled(refs, true)
  refs.input.focus()
}

async function refreshContexts(): Promise<void> {
  const { contexts } = await sendMessage<ContextsResponse>({ type: 'LIST_CONTEXTS', pageKey })
  activeContextIds = contexts.map((c) => c.id)
  mo?.disconnect()
  const anchored = highlighter.sync(contexts)
  mo?.observe(document.body, MO_OPTS)
  const lost = new Set(anchored.filter((a) => !a.found).map((a) => a.id))
  renderPills(elements.pills, contexts, {
    onRemove: async (id) => {
      highlighter.clear(id)
      await sendMessage({ type: 'REMOVE_CONTEXT', id })
      void refreshContexts()
    },
    onClick: (c) => highlighter.flash(c.id),
    onHover: (id) => highlighter.emphasize(id, true),
    onHoverEnd: (id) => highlighter.emphasize(id, false),
  })
  // Mark pills whose source can't be found on the current page.
  for (const id of lost) {
    elements.pills.querySelector(`[data-ctx-id="${id}"]`)?.classList.add('ag-pill-lost')
  }
  renderTray(elements.panel.getRootNode() as ShadowRoot, contexts.length, () => openPanel(elements))
}

function injectPageStyles() {
  const id = 'ask-genie-hl-styles'
  if (document.getElementById(id)) return
  const tag = document.createElement('style')
  tag.id = id
  tag.textContent = `
    mark.ag-ctx-hl{background:rgba(255,198,97,.22);border-bottom:2px solid rgba(255,198,97,.7);color:inherit;border-radius:2px;padding:0 1px;transition:background .2s}
    mark.ag-ctx-hl:hover{background:rgba(255,198,97,.34)}
    mark.ag-ctx-emph{background:rgba(255,198,97,.4)}
    mark.ag-ctx-flash{animation:ag-ctx-sweep 1s ease}
    @keyframes ag-ctx-sweep{0%{background:rgba(255,198,97,.55)}100%{background:rgba(255,198,97,.22)}}
    @media (prefers-reduced-motion:reduce){mark.ag-ctx-flash{animation:none}}
  `
  document.head.appendChild(tag)
}

function init() {
  injectPageStyles()
  if (document.getElementById(ROOT_ID)) return // idempotent: never inject twice
  elements = build()
  initSelectionToolbar(elements.panel.getRootNode() as ShadowRoot, {
    pageKey,
    url: location.href,
    title: document.title,
    onAdded: () => void refreshContexts(),
    onAsk: () => openPanel(elements),
  })
  void sendMessage({ type: 'REGISTER_PAGE', pageKey })
  void refreshContexts()
  window.setTimeout(() => void refreshContexts(), 600)
  window.addEventListener('load', () => void refreshContexts(), { once: true })

  mo = new MutationObserver(() => {
    if (activeContextIds.length === 0) return // nothing to re-anchor; don't walk the DOM
    window.clearTimeout(reanchorTimer)
    reanchorTimer = window.setTimeout(() => void refreshContexts(), 500)
  })
  mo.observe(document.body, MO_OPTS)
}

function onUrlChange() {
  const next = makePageKey(location.href)
  if (next === pageKey) return
  pageKey = next
  chatLoaded = false
  mo?.disconnect()
  highlighter.clear()
  mo?.observe(document.body, MO_OPTS)
  void sendMessage({ type: 'REGISTER_PAGE', pageKey })
  void refreshContexts()
}

;(['pushState', 'replaceState'] as const).forEach((m) => {
  const orig = history[m]
  history[m] = function (this: History, ...args: Parameters<History['pushState']>) {
    const ret = orig.apply(this, args)
    window.dispatchEvent(new Event('ag-locationchange'))
    return ret
  } as History[typeof m]
})
window.addEventListener('popstate', () => window.dispatchEvent(new Event('ag-locationchange')))
window.addEventListener('ag-locationchange', () => window.setTimeout(onUrlChange, 300))

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true })
} else {
  init()
}
