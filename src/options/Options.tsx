import { useState, useEffect } from 'react'
import { animate } from '@motionone/dom'
import './Options.css'

export const Options = () => {
  const [apiKey, setApiKey] = useState('')
  const [autoClearChats, setAutoClearChats] = useState(true)
  const [saved, setSaved] = useState(false)

  // Load saved settings
  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'autoClearChats'], (result) => {
      if (result.apiKey !== undefined) {
        setApiKey(result.apiKey)
      }
      if (result.autoClearChats !== undefined) {
        setAutoClearChats(result.autoClearChats)
      }
    })
  }, [])

  // Save settings
  const saveSettings = () => {
    chrome.storage.local.set({
      apiKey,
      autoClearChats,
    }, () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  // Add motion to elements after they mount
  useEffect(() => {
    // Animate the main container
    const container = document.querySelector('.options-container');
    if (container) {
      animate(container, 
        { opacity: [0, 1], y: [20, 0] }, 
        { duration: 0.5 }
      );
    }

    // Animate the heading
    const heading = document.querySelector('h1');
    if (heading) {
      animate(heading, 
        { opacity: [0, 1] }, 
        { duration: 0.5, delay: 0.2 }
      );
    }

    // Animate the settings groups
    const settingsGroups = document.querySelectorAll('.settings-group');
    settingsGroups.forEach((group, index) => {
      animate(group, 
        { opacity: [0, 1], x: [-20, 0] }, 
        { duration: 0.5, delay: 0.3 + (index * 0.1) }
      );
    });

    // Animate the save button
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
      animate(saveButton, 
        { opacity: [0, 1], y: [20, 0] }, 
        { duration: 0.5, delay: 0.5 }
      );

      // Add hover and tap effects
      saveButton.addEventListener('mouseenter', () => {
        animate(saveButton, { scale: 1.05 }, { duration: 0.2 });
      });
      saveButton.addEventListener('mouseleave', () => {
        animate(saveButton, { scale: 1 }, { duration: 0.2 });
      });
      saveButton.addEventListener('mousedown', () => {
        animate(saveButton, { scale: 0.95 }, { duration: 0.1 });
      });
      saveButton.addEventListener('mouseup', () => {
        animate(saveButton, { scale: 1.05 }, { duration: 0.1 });
      });
    }
  }, []);

  // Effect for animating saved confirmation message
  useEffect(() => {
    if (saved) {
      const confirmation = document.querySelector('.save-confirmation');
      if (confirmation) {
        animate(confirmation, 
          { opacity: [0, 1], y: [-10, 0] }, 
          { duration: 0.3 }
        );
      }
    }
  }, [saved]);

  return (
    <main className="options-container">
      <h1>Settings</h1>
      
      <div className="settings-group">
        <label htmlFor="api-key">OpenAI API Key</label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your OpenAI API key"
          style={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            width: '100%',
            color: 'black',
          }}
        />
        <p className="help-text">
          Your API key is stored securely on your device and never shared.
        </p>
      </div>

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={autoClearChats}
            onChange={(e) => setAutoClearChats(e.target.checked)}
          />
          Auto-clear chats after 24 hours
        </label>
      </div>

      <button className="save-button" onClick={saveSettings}>
        Save Settings
      </button>
      
      {saved && <div className="save-confirmation">Settings saved!</div>}
    </main>
  )
}

export default Options 