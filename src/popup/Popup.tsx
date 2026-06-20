import { useEffect, useState } from 'react'

import { sendMessage, type ConfigStatus } from '../lib/messages'
import { PROVIDERS } from '../lib/providers'
import { Coin, Glyph, Icon } from '../ui/Brand'
import './Popup.css'

export const Popup = () => {
  const [status, setStatus] = useState<ConfigStatus | null>(null)

  useEffect(() => {
    void sendMessage<ConfigStatus>({ type: 'GET_CONFIG_STATUS' }).then(setStatus)
  }, [])

  const openOptions = () => chrome.runtime.openOptionsPage()
  const openRepo = () => chrome.tabs.create({ url: 'https://github.com/user-64bit/ask-genie' })

  const configured = status?.configured ?? false
  const providerLabel = status?.provider ? PROVIDERS[status.provider].label : null

  return (
    <main className="pp">
      <header className="pp-head">
        <Coin className="pp-badge" />
        <div className="pp-headtext">
          <h1 className="pp-title">Ask Genie</h1>
          <p className="pp-tagline">AI for any web page</p>
        </div>
      </header>

      {status === null ? (
        <div className="pp-card pp-skeleton" aria-busy="true">
          <span className="pp-sk-line" />
          <span className="pp-sk-line pp-sk-short" />
        </div>
      ) : configured ? (
        <section className="pp-card pp-ready">
          <span className="pp-pulse" aria-hidden="true" />
          <div className="pp-ready-text">
            <strong>Ready to grant wishes</strong>
            <span className="pp-meta">
              {providerLabel} · {status.model}
            </span>
          </div>
        </section>
      ) : (
        <section className="pp-card pp-onboard">
          <Glyph className="pp-onboard-lamp" />
          <strong>Summon the genie</strong>
          <p>
            Add your AI API key to start chatting with any page. Bring your own key — nothing is
            proxied through us.
          </p>
        </section>
      )}

      {configured && (
        <p className="pp-tip">
          <Glyph className="pp-tip-lamp" />
          <span>
            Click the lamp at the bottom-right of any page to chat about what you’re reading.
          </span>
        </p>
      )}

      <div className="pp-actions">
        <button className="pp-btn pp-primary" onClick={openOptions}>
          <Icon name="key" />
          {configured ? 'Settings' : 'Add API key'}
        </button>
        <button className="pp-btn pp-ghost" onClick={openRepo}>
          <Icon name="external" />
          About
        </button>
      </div>

      <div className="pp-trust">
        <Icon name="shield" />
        <span>Your key stays in this browser — sent only to your AI provider.</span>
      </div>

      <footer className="pp-foot">
        <span>v{chrome.runtime.getManifest().version}</span>
        <span className="pp-foot-sep">·</span>
        <span>Private by design</span>
      </footer>
    </main>
  )
}

export default Popup
