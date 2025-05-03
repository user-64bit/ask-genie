import { useState, useEffect } from 'react'
import { animate } from '@motionone/dom'

import './Popup.css'

export const Popup = () => {
  // App state
  const [apiKeySet, setApiKeySet] = useState(false)
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab | null>(null)
  
  // Password authentication states
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Check if password is required on component mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'CHECK_PASSWORD_REQUIRED' }, (response) => {
      setPasswordRequired(response.passwordRequired);
      setIsAuthenticated(!response.passwordRequired);
      setIsLoading(false);
      
      // If password is not required, get API key immediately
      if (!response.passwordRequired) {
        checkApiKey();
      }
    });
    
    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setActiveTab(tabs[0])
      }
    });
  }, []);

  // Check if API key is set
  const checkApiKey = (userPassword?: string) => {
    // Use the message API to get the decrypted API key from the background script
    chrome.runtime.sendMessage({ 
      type: 'GET_API_KEY',
      password: userPassword || password
    }, (response) => {
      if (response.error === 'Authentication required') {
        setIsAuthenticated(false);
        return;
      }
      
      setApiKeySet(!!response.apiKey);
    });
  };
  
  // Handle authentication
  const handleAuthenticate = () => {
    setIsLoading(true);
    setAuthError('');
    
    chrome.runtime.sendMessage({ 
      type: 'VERIFY_PASSWORD', 
      password
    }, (response) => {
      setIsLoading(false);
      
      if (response.verified) {
        setIsAuthenticated(true);
        checkApiKey(password);
      } else {
        setAuthError('Incorrect password');
      }
    });
  };
  
  // Handle password input keydown
  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAuthenticate();
    }
  };

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
    applyAnimations();
  }, [isAuthenticated]);

  // Apply animations to the UI
  const applyAnimations = () => {
    // Animate the main container
    const container = document.querySelector('.popup-container');
    if (container) {
      animate(container, { opacity: [0, 1] }, { duration: 0.4 });
    }

    // Animate header
    const header = document.querySelector('.popup-header')
    if (header) {
      animate(header, { opacity: [0, 1], y: [-20, 0] }, { duration: 0.5, delay: 0.1 })
    }

    // Animate other elements with staggered delays
    const elements = document.querySelectorAll('.animate-in')
    elements.forEach((element, index) => {
      animate(element, { opacity: [0, 1], y: [10, 0] }, { duration: 0.4, delay: 0.2 + index * 0.1 })
    });

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
  };

  return (
    <main className="popup-container">
      <div className="popup-header">
        <h1>Ask Genie</h1>
        <div className="popup-subtitle">AI Assistant for any webpage</div>
      </div>

      {isLoading ? (
        <div className="popup-content animate-in">
          <div className="loading-indicator">Loading...</div>
        </div>
      ) : passwordRequired && !isAuthenticated ? (
        <div className="popup-content animate-in">
          <div className="password-form">
            <h3>Enter Password</h3>
            <p>This extension is password protected.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handlePasswordKeyDown}
              placeholder="Enter your password"
              className="password-input"
              autoFocus
            />
            {authError && <p className="auth-error">{authError}</p>}
            <button 
              className="popup-button auth-button" 
              onClick={handleAuthenticate}
              disabled={!password}
            >
              Unlock
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="popup-content">
            <div className="status-section animate-in">
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

            <div className="popup-buttons animate-in">
              <button className="popup-button settings-button" onClick={openOptions}>
                Settings
              </button>
              <button className="popup-button docs-button" onClick={openDocs}>
                Documentation
              </button>
            </div>
          </div>
        </>
      )}

      <div className="popup-footer">
        <div className="popup-version">v0.0.1</div>
      </div>
    </main>
  )
}

export default Popup
