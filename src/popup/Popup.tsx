import { useState, useEffect } from 'react'
import { animate } from '@motionone/dom'

import './Popup.css'

export const Popup = () => {
  const [apiKeySet, setApiKeySet] = useState(false)
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab | null>(null)

  // Check if API key is set
  useEffect(() => {
    chrome.storage.local.get(['apiKey'], (result) => {
      setApiKeySet(!!result.apiKey)
    })

    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setActiveTab(tabs[0])
      }
    })
  }, [])

  // Open options page
  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  // Open settings
  const openDocs = () => {
    chrome.tabs.create({ url: 'https://github.com/user-64bit/ask-genie' })
  }

  // Add animations after component mounts
  useEffect(() => {
    // Animate popup container
    const container = document.querySelector('.popup-container')
    if (container) {
      animate(container, { opacity: [0, 1] }, { duration: 0.4 })
    }

    // Animate header
    const header = document.querySelector('.popup-header')
    if (header) {
      animate(header, { opacity: [0, 1], y: [-20, 0] }, { duration: 0.5, delay: 0.1 })
    }

    // Animate subtitle with slight delay
    const subtitle = document.querySelector('.popup-subtitle')
    if (subtitle) {
      animate(subtitle, { opacity: [0, 1] }, { duration: 0.5, delay: 0.2 })
    }

    // Animate status items
    const statusItems = document.querySelectorAll('.status-item')
    statusItems.forEach((item, index) => {
      animate(item, { opacity: [0, 1], x: [-20, 0] }, { duration: 0.5, delay: 0.3 + index * 0.1 })
    })

    // Animate buttons
    const buttons = document.querySelectorAll('.popup-button')
    buttons.forEach((button, index) => {
      animate(button, { opacity: [0, 1], y: [10, 0] }, { duration: 0.4, delay: 0.5 + index * 0.1 })

      // Add hover and tap effects
      button.addEventListener('mouseenter', () => {
        animate(button, { scale: 1.05 }, { duration: 0.2 })
      })
      button.addEventListener('mouseleave', () => {
        animate(button, { scale: 1 }, { duration: 0.2 })
      })
      button.addEventListener('mousedown', () => {
        animate(button, { scale: 0.95 }, { duration: 0.1 })
      })
      button.addEventListener('mouseup', () => {
        animate(button, { scale: 1.05 }, { duration: 0.1 })
      })
    })

    // Animate footer
    const footer = document.querySelector('.popup-footer')
    if (footer) {
      animate(footer, { opacity: [0, 1] }, { duration: 0.5, delay: 0.7 })
    }
  }, [])

  return (
    <main className="popup-container">
      <div className="popup-header">
        <h1>Ask Genie</h1>
        <div className="popup-subtitle">AI Assistant for any webpage</div>
      </div>

      <div className="popup-content">
        <div className="status-section">
          <div className="status-item">
            <div className="status-label">API Key:</div>
            <div className={`status-value ${apiKeySet ? 'status-success' : 'status-error'}`}>
              {apiKeySet ? 'Set ✓' : 'Not set ✗'}
            </div>
          </div>
          <div className="status-item">
            {!apiKeySet && (
              <p className="status-error">Please set your API key in the settings page.</p>
            )}
          </div>
        </div>

        <div className="popup-buttons">
          <button className="popup-button settings-button" onClick={openOptions}>
            Settings
          </button>
          <button className="popup-button docs-button" onClick={openDocs}>
            Documentation
          </button>
        </div>
      </div>

      <div className="popup-footer">
        <div className="popup-version">v0.0.1</div>
      </div>
    </main>
  )
}

export default Popup
