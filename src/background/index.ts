// Background service worker for Ask Genie.
//
// This is the only component that holds the API key and talks to AI providers.
// The content script and popup communicate with it exclusively via messages;
// the key never leaves this worker.

import { CHAT_EXPIRY_MS, getConfig, getSettings, isConfigured, setSettings } from '../lib/config'
import { pruneExpired, type ChatMap } from '../lib/chats'
import { buildSystemPrompt, callProvider } from '../lib/providers'
import type {
  AskResponse,
  ChatResponse,
  ConfigStatus,
  OkResponse,
  RuntimeRequest,
} from '../lib/messages'

const CHATS_KEY = 'chats'
const PRUNE_ALARM = 'ask-genie-prune'

// Maps an open tab to the page it last reported, so we can honor
// "clear chat on tab close". Best-effort: lost if the worker restarts.
const tabPageKeys = new Map<number, string>()

async function getChats(): Promise<ChatMap> {
  const stored = await chrome.storage.local.get(CHATS_KEY)
  return (stored[CHATS_KEY] as ChatMap | undefined) ?? {}
}

async function setChats(chats: ChatMap): Promise<void> {
  await chrome.storage.local.set({ [CHATS_KEY]: chats })
}

/** Load chats, dropping expired conversations when auto-clear is enabled. */
async function loadChats(): Promise<ChatMap> {
  const settings = await getSettings()
  const chats = await getChats()
  if (!settings.autoClearChats) return chats
  const pruned = pruneExpired(chats, Date.now(), CHAT_EXPIRY_MS)
  if (Object.keys(pruned).length !== Object.keys(chats).length) {
    await setChats(pruned)
    return pruned
  }
  return chats
}

chrome.runtime.onInstalled.addListener(async () => {
  // Persist default settings without clobbering anything already set.
  await setSettings(await getSettings())
  chrome.alarms.create(PRUNE_ALARM, { periodInMinutes: 60 })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PRUNE_ALARM) void loadChats()
})

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const pageKey = tabPageKeys.get(tabId)
  tabPageKeys.delete(tabId)
  if (!pageKey) return

  const settings = await getSettings()
  if (!settings.clearOnTabClose) return

  // Keep the chat if another open tab is on the same page.
  for (const key of tabPageKeys.values()) {
    if (key === pageKey) return
  }
  const chats = await getChats()
  if (chats[pageKey]) {
    delete chats[pageKey]
    await setChats(chats)
  }
})

async function handleAsk(req: Extract<RuntimeRequest, { type: 'ASK' }>): Promise<AskResponse> {
  const config = await getConfig()
  if (!isConfigured(config)) {
    return { ok: false, error: 'No API key configured. Open Settings to add one.' }
  }

  const chats = await loadChats()
  const now = Date.now()
  const existing = chats[req.pageKey]
  const chat = existing
    ? { ...existing, messages: [...existing.messages] }
    : { createdAt: now, updatedAt: now, messages: [] }

  chat.messages.push({ role: 'user', content: req.question })

  try {
    const system = buildSystemPrompt(req.title, req.url, req.context)
    const reply = await callProvider(config, system, chat.messages)
    chat.messages.push({ role: 'assistant', content: reply })
    chat.updatedAt = Date.now()
    chats[req.pageKey] = chat
    await setChats(chats)
    return { ok: true, reply }
  } catch (error) {
    // Failed turn is not persisted, so the user can simply retry.
    return { ok: false, error: error instanceof Error ? error.message : 'Something went wrong.' }
  }
}

async function handle(req: RuntimeRequest, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (req.type) {
    case 'GET_CONFIG_STATUS': {
      const config = await getConfig()
      const status: ConfigStatus = {
        configured: isConfigured(config),
        provider: config?.provider ?? null,
        model: config?.model ?? null,
      }
      return status
    }

    case 'OPEN_OPTIONS': {
      await chrome.runtime.openOptionsPage()
      return { ok: true } satisfies OkResponse
    }

    case 'REGISTER_PAGE': {
      if (sender.tab?.id != null) tabPageKeys.set(sender.tab.id, req.pageKey)
      return { ok: true } satisfies OkResponse
    }

    case 'GET_CHAT': {
      const chats = await loadChats()
      const response: ChatResponse = { messages: chats[req.pageKey]?.messages ?? [] }
      return response
    }

    case 'CLEAR_CHAT': {
      const chats = await getChats()
      if (chats[req.pageKey]) {
        delete chats[req.pageKey]
        await setChats(chats)
      }
      return { ok: true } satisfies OkResponse
    }

    case 'CLEAR_ALL': {
      await setChats({})
      return { ok: true } satisfies OkResponse
    }

    case 'ASK':
      return handleAsk(req)
  }
}

chrome.runtime.onMessage.addListener((req: RuntimeRequest, sender, sendResponse) => {
  handle(req, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: String(error) }))
  return true // keep the channel open for the async response
})
