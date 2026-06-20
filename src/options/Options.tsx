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
import { sendMessage } from '../lib/messages'
import { PROVIDERS, defaultModelFor, isKnownModel } from '../lib/providers'
import { Coin, Icon } from '../ui/Brand'
import './Options.css'

type Status = 'idle' | 'saving' | 'saved'
type ClearState = 'idle' | 'confirm' | 'done'

export const Options = () => {
  const [provider, setProvider] = useState<Provider>('openai')
  const [model, setModel] = useState<string>(defaultModelFor('openai'))
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState<Status>('idle')
  const [clearState, setClearState] = useState<ClearState>('idle')
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

  const clearAll = async () => {
    if (clearState !== 'confirm') {
      setClearState('confirm')
      setTimeout(() => setClearState((s) => (s === 'confirm' ? 'idle' : s)), 4000)
      return
    }
    await sendMessage({ type: 'CLEAR_ALL' })
    setClearState('done')
    setTimeout(() => setClearState('idle'), 2500)
  }

  return (
    <main className="opt">
      <div className="opt-glow" aria-hidden="true" />
      <header className="opt-head">
        <Coin className="opt-badge" />
        <div>
          <h1 className="opt-title">Ask Genie</h1>
          <p className="opt-tagline">Settings · bring your own AI key</p>
        </div>
      </header>

      <section className="opt-card">
        <div className="opt-card-head">
          <span className="opt-card-ic">
            <Icon name="key" />
          </span>
          <div>
            <h2>AI provider</h2>
            <p className="opt-card-sub">
              Your key is stored locally, sent only to the provider you pick, and never to any Ask
              Genie server.
            </p>
          </div>
        </div>

        <label className="opt-field">
          <span className="opt-label">Provider</span>
          <div className="opt-select">
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
            <Icon name="chevron" />
          </div>
        </label>

        <label className="opt-field">
          <span className="opt-label">Model</span>
          <div className="opt-select">
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={loading}>
              {info.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <Icon name="chevron" />
          </div>
        </label>

        <label className="opt-field">
          <span className="opt-label">API key</span>
          <div className={`opt-key ${keyLooksWrong ? 'is-wrong' : ''}`}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={info.apiKeyHint}
              spellCheck={false}
              autoComplete="off"
              disabled={loading}
            />
            <button
              type="button"
              className="opt-key-toggle"
              onClick={() => setShowKey((s) => !s)}
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
              title={showKey ? 'Hide' : 'Show'}
            >
              <Icon name={showKey ? 'eyeOff' : 'eye'} />
            </button>
          </div>
          {keyLooksWrong && (
            <span className="opt-warn">
              That doesn’t look like a {info.label} key (expected “{info.apiKeyPrefix}…”).
            </span>
          )}
          <a className="opt-link" href={info.consoleUrl} target="_blank" rel="noopener noreferrer">
            Get a {info.label} key
            <Icon name="external" />
          </a>
        </label>
      </section>

      <section className="opt-card">
        <div className="opt-card-head">
          <span className="opt-card-ic">
            <Icon name="shield" />
          </span>
          <div>
            <h2>Chat &amp; privacy</h2>
            <p className="opt-card-sub">Control how long conversations live in your browser.</p>
          </div>
        </div>

        <label className="opt-switch">
          <input
            type="checkbox"
            checked={settings.autoClearChats}
            onChange={(e) => setSettingsState((s) => ({ ...s, autoClearChats: e.target.checked }))}
            disabled={loading}
          />
          <span className="opt-switch-track" aria-hidden="true" />
          <span className="opt-switch-text">
            Auto-delete each chat 24 hours after it starts
            <small>Keeps stored history small.</small>
          </span>
        </label>

        <label className="opt-switch">
          <input
            type="checkbox"
            checked={settings.clearOnTabClose}
            onChange={(e) => setSettingsState((s) => ({ ...s, clearOnTabClose: e.target.checked }))}
            disabled={loading}
          />
          <span className="opt-switch-track" aria-hidden="true" />
          <span className="opt-switch-text">
            Clear a page’s chat when its tab closes
            <small>Best-effort, for privacy-conscious browsing.</small>
          </span>
        </label>

        <div className="opt-danger">
          <div className="opt-danger-text">
            <strong>Clear all chats now</strong>
            <small>Removes every stored conversation across all pages.</small>
          </div>
          <button
            type="button"
            className={`opt-danger-btn ${clearState !== 'idle' ? 'is-active' : ''}`}
            onClick={clearAll}
            disabled={loading || clearState === 'done'}
          >
            {clearState === 'idle' && (
              <>
                <Icon name="trash" />
                Clear all
              </>
            )}
            {clearState === 'confirm' && 'Click again to confirm'}
            {clearState === 'done' && (
              <>
                <Icon name="check" />
                Cleared
              </>
            )}
          </button>
        </div>
      </section>

      <div className="opt-actions">
        <button className="opt-save" onClick={save} disabled={loading || status === 'saving'}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save settings'}
          {status === 'saved' && <Icon name="check" />}
        </button>
        <span className="opt-foot">Private by design · no backend · no telemetry</span>
      </div>
    </main>
  )
}

export default Options
