import { useEffect, useState } from 'react'

import { sendMessage, type ConfigStatus } from '../lib/messages'
import { PROVIDERS } from '../lib/providers'
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
    <main className="popup">
      <header className="popup-head">
        <span className="popup-logo" aria-hidden="true">
          🧞
        </span>
        <div>
          <h1>Ask Genie</h1>
          <p className="popup-sub">AI for any web page</p>
        </div>
      </header>

      {status === null ? (
        <div className="popup-loading">Loading…</div>
      ) : (
        <>
          <div className={`status ${configured ? 'ok' : 'warn'}`}>
            {configured ? (
              <>
                <strong>Ready</strong>
                <span>
                  {providerLabel} · {status.model}
                </span>
              </>
            ) : (
              <>
                <strong>API key needed</strong>
                <span>Add your key in Settings to start.</span>
              </>
            )}
          </div>

          {configured && (
            <p className="popup-tip">
              Click the <span className="bubble-chip">🧞</span> bubble at the bottom-right of any
              page to chat about it.
            </p>
          )}

          <div className="popup-actions">
            <button className="primary" onClick={openOptions}>
              {configured ? 'Settings' : 'Add API key'}
            </button>
            <button className="ghost" onClick={openRepo}>
              About
            </button>
          </div>
        </>
      )}

      <footer className="popup-foot">v{chrome.runtime.getManifest().version}</footer>
    </main>
  )
}

export default Popup
