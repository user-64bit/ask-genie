// Ask Genie content script: injects a floating bubble + chat panel on every
// page. All AI work goes through the background worker — this script never sees
// the API key. UI lives in a Shadow DOM so the host page's CSS can't break it
// and ours can't leak out.

import styles from './styles.css?inline'
import { extractPageContent } from '../lib/extract'
import { renderMarkdown } from '../lib/markdown'
import { makePageKey, type StoredMessage } from '../lib/chats'
import { sendMessage, type AskResponse, type ChatResponse, type ConfigStatus } from '../lib/messages'

const ROOT_ID = 'ask-genie-root'

const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  { label: 'Summarize', prompt: 'Summarize this page in 5 concise bullet points.' },
  { label: 'Key insights', prompt: 'What are the most important takeaways from this page?' },
  { label: 'Explain simply', prompt: 'Explain the main idea of this page in simple terms.' },
  { label: 'Action items', prompt: 'List concrete action items based on this page.' },
]

interface El {
  bubble: HTMLDivElement
  panel: HTMLDivElement
  messages: HTMLDivElement
  quick: HTMLDivElement
  input: HTMLTextAreaElement
  send: HTMLButtonElement
}

let chatLoaded = false
let configured = false
let busy = false
const pageKey = makePageKey(location.href)

function el<K extends keyof HTMLElementTagNameMap>(
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

function scrollToBottom(messages: HTMLElement) {
  messages.scrollTop = messages.scrollHeight
}

function renderMessage(messages: HTMLElement, role: StoredMessage['role'], content: string): HTMLElement {
  const wrap = el('div', { class: `ag-msg ag-${role}` })
  if (role === 'assistant') {
    wrap.appendChild(renderMarkdown(content))
  } else {
    wrap.textContent = content // user input rendered as plain text
  }
  messages.appendChild(wrap)
  scrollToBottom(messages)
  return wrap
}

function showNotice(messages: HTMLElement, text: string, action?: { label: string; onClick: () => void }) {
  messages.replaceChildren()
  const notice = el('div', { class: 'ag-notice' }, [el('p', { text })])
  if (action) {
    const btn = el('button', { class: 'ag-btn-primary', text: action.label })
    btn.addEventListener('click', action.onClick)
    notice.appendChild(btn)
  }
  messages.appendChild(notice)
}

function build(): El {
  const host = el('div', { attrs: { id: ROOT_ID } })
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.appendChild(el('style', { text: styles }))

  const bubble = el('div', {
    class: 'ag-bubble',
    text: '🧞',
    attrs: { role: 'button', tabindex: '0', 'aria-label': 'Open Ask Genie', title: 'Ask Genie' },
  })

  const messages = el('div', { class: 'ag-messages' })

  const quick = el('div', { class: 'ag-quick' })
  for (const action of QUICK_ACTIONS) {
    const chip = el('button', { class: 'ag-chip', text: action.label })
    chip.addEventListener('click', () => submit(action.prompt))
    quick.appendChild(chip)
  }

  const input = el('textarea', {
    class: 'ag-input',
    attrs: { rows: '1', placeholder: 'Ask about this page…', 'aria-label': 'Ask about this page' },
  }) as HTMLTextAreaElement

  const send = el('button', { class: 'ag-send', text: 'Send', attrs: { 'aria-label': 'Send' } })

  const clearBtn = el('button', { class: 'ag-icon', text: '🗑', attrs: { title: 'Clear this chat', 'aria-label': 'Clear chat' } })
  const closeBtn = el('button', { class: 'ag-icon', text: '✕', attrs: { title: 'Close', 'aria-label': 'Close' } })

  const header = el('div', { class: 'ag-header' }, [
    el('span', { class: 'ag-title', text: 'Ask Genie' }),
    el('div', { class: 'ag-header-actions' }, [clearBtn, closeBtn]),
  ])

  const note = el('div', { class: 'ag-note', text: 'Chats auto-delete 24h after they start.' })
  const inputBar = el('div', { class: 'ag-inputbar' }, [input, send])

  const panel = el('div', { class: 'ag-panel ag-hidden' }, [header, messages, quick, note, inputBar])

  shadow.append(bubble, panel)
  ;(document.documentElement || document.body).appendChild(host)

  const refs: El = { bubble, panel, messages, quick, input, send }

  bubble.addEventListener('click', () => openPanel(refs))
  bubble.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') openPanel(refs)
  })
  closeBtn.addEventListener('click', () => closePanel(refs))
  clearBtn.addEventListener('click', () => clearChat(refs))
  send.addEventListener('click', () => submit(refs.input.value))
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(refs.input.value)
    }
  })
  input.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`
  })

  return refs
}

let elements: El

async function openPanel(refs: El) {
  refs.panel.classList.remove('ag-hidden')
  refs.bubble.classList.add('ag-hidden')

  // Re-check config each open so a key added mid-session is picked up.
  const status = await sendMessage<ConfigStatus>({ type: 'GET_CONFIG_STATUS' })
  configured = status.configured

  if (!configured) {
    setEnabled(refs, false)
    showNotice(refs.messages, 'Add your AI API key to start chatting about this page.', {
      label: 'Open Settings',
      onClick: () => void sendMessage({ type: 'OPEN_OPTIONS' }),
    })
    return
  }

  setEnabled(refs, true)
  if (!chatLoaded) {
    chatLoaded = true
    const { messages } = await sendMessage<ChatResponse>({ type: 'GET_CHAT', pageKey })
    refs.messages.replaceChildren()
    if (messages.length === 0) {
      const empty = el('div', { class: 'ag-empty', text: 'Ask anything about this page, or pick a quick action below.' })
      refs.messages.appendChild(empty)
    } else {
      for (const m of messages) renderMessage(refs.messages, m.role, m.content)
    }
  }
  refs.input.focus()
}

function closePanel(refs: El) {
  refs.panel.classList.add('ag-hidden')
  refs.bubble.classList.remove('ag-hidden')
}

function setEnabled(refs: El, enabled: boolean) {
  refs.input.disabled = !enabled
  refs.send.disabled = !enabled || busy
  refs.quick.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = !enabled || busy))
}

async function clearChat(refs: El) {
  await sendMessage({ type: 'CLEAR_CHAT', pageKey })
  refs.messages.replaceChildren()
  if (configured) {
    refs.messages.appendChild(
      el('div', { class: 'ag-empty', text: 'Chat cleared. Ask something new about this page.' }),
    )
  }
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
  const typing = el('div', { class: 'ag-msg ag-assistant ag-typing' }, [
    el('span', { class: 'ag-dot' }),
    el('span', { class: 'ag-dot' }),
    el('span', { class: 'ag-dot' }),
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

function init() {
  if (document.getElementById(ROOT_ID)) return // idempotent: never inject twice
  elements = build()
  void sendMessage({ type: 'REGISTER_PAGE', pageKey })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true })
} else {
  init()
}
