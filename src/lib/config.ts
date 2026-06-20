// App configuration + settings, persisted in chrome.storage.local.
//
// Security model (honest, on purpose): the API key is stored in
// chrome.storage.local, which is sandboxed per-extension and not readable by
// web pages or other extensions. The key is held only in the background
// service worker and sent only to the chosen provider's official endpoint — it
// never enters the content script or any web page. We deliberately do NOT claim
// at-rest encryption: deriving a key from public values (extension id, user
// agent) would be security theater, and a real passphrase would have to be
// re-entered every time the MV3 worker restarts.

export type Provider = 'openai' | 'anthropic'

export interface AppConfig {
  provider: Provider
  model: string
  apiKey: string
}

export interface Settings {
  autoClearChats: boolean
  clearOnTabClose: boolean
}

/** Chats expire 24h after the conversation started. */
export const CHAT_EXPIRY_MS = 24 * 60 * 60 * 1000

const CONFIG_KEY = 'config'
const SETTINGS_KEY = 'settings'

export const DEFAULT_SETTINGS: Settings = {
  autoClearChats: true,
  clearOnTabClose: false,
}

export async function getConfig(): Promise<AppConfig | null> {
  const stored = await chrome.storage.local.get(CONFIG_KEY)
  return (stored[CONFIG_KEY] as AppConfig | undefined) ?? null
}

export async function setConfig(config: AppConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config })
}

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined) }
}

export async function setSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

export function isConfigured(config: AppConfig | null): config is AppConfig {
  return !!config && !!config.apiKey && !!config.provider && !!config.model
}
