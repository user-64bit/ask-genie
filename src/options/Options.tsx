import { useEffect, useMemo, useState } from 'react'

import {
  DEFAULT_SETTINGS,
  getConfig,
  getSettings,
  setConfig,
  setSettings,
  type Provider,
  type Settings,
} from '../lib/config'
import { PROVIDERS, defaultModelFor, isKnownModel } from '../lib/providers'
import './Options.css'

type Status = 'idle' | 'saving' | 'saved'

export const Options = () => {
  const [provider, setProvider] = useState<Provider>('openai')
  const [model, setModel] = useState<string>(defaultModelFor('openai'))
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState<Status>('idle')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [config, savedSettings] = await Promise.all([getConfig(), getSettings()])
      if (config) {
        setProvider(config.provider)
        setModel(config.model)
        setApiKey(config.apiKey)
      }
      setSettingsState(savedSettings)
      setLoading(false)
    })()
  }, [])

  const info = PROVIDERS[provider]

  const keyLooksWrong = useMemo(
    () => apiKey.trim().length > 0 && !apiKey.trim().startsWith(info.apiKeyPrefix),
    [apiKey, info.apiKeyPrefix],
  )

  const onProviderChange = (next: Provider) => {
    setProvider(next)
    // Keep the model valid for the newly selected provider.
    setModel((current) => (isKnownModel(next, current) ? current : defaultModelFor(next)))
  }

  const save = async () => {
    setStatus('saving')
    await Promise.all([
      setConfig({ provider, model, apiKey: apiKey.trim() }),
      setSettings(settings),
    ])
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <main className="options">
      <header className="options-head">
        <span className="options-logo" aria-hidden="true">
          🧞
        </span>
        <div>
          <h1>Ask Genie</h1>
          <p className="options-tagline">AI assistant for any web page</p>
        </div>
      </header>

      <section className="card">
        <h2>AI provider</h2>
        <p className="hint">
          Ask Genie uses your own API key. It is stored locally in your browser, sent only to the
          provider you choose, and never to any Ask Genie server.
        </p>

        <label className="field">
          <span>Provider</span>
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as Provider)}
            disabled={loading}
          >
            {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDERS[p].label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Model</span>
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={loading}>
            {info.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>API key</span>
          <div className="key-row">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={info.apiKeyHint}
              spellCheck={false}
              autoComplete="off"
              disabled={loading}
            />
            <button type="button" className="ghost" onClick={() => setShowKey((s) => !s)}>
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          {keyLooksWrong && (
            <span className="warn">
              That doesn’t look like a {info.label} key (expected “{info.apiKeyPrefix}…”).
            </span>
          )}
          <a className="hint-link" href={info.consoleUrl} target="_blank" rel="noopener noreferrer">
            Get a {info.label} key →
          </a>
        </label>
      </section>

      <section className="card">
        <h2>Chat &amp; privacy</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.autoClearChats}
            onChange={(e) => setSettingsState((s) => ({ ...s, autoClearChats: e.target.checked }))}
            disabled={loading}
          />
          <span>
            Auto-delete each chat 24 hours after it starts
            <small>Keeps stored history small.</small>
          </span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.clearOnTabClose}
            onChange={(e) => setSettingsState((s) => ({ ...s, clearOnTabClose: e.target.checked }))}
            disabled={loading}
          />
          <span>
            Clear a page’s chat when its tab closes
            <small>Best-effort, for privacy-conscious browsing.</small>
          </span>
        </label>
      </section>

      <div className="actions">
        <button className="primary" onClick={save} disabled={loading || status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save settings'}
        </button>
        {status === 'saved' && <span className="saved-note">Saved ✓</span>}
      </div>
    </main>
  )
}

export default Options
