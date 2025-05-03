import { useState, useEffect } from 'react'
import { animate } from '@motionone/dom'
import { encryptData, decryptData, hashPassword, PasswordHash } from '../utils/encryption'
import './Options.css'

export const Options = () => {
  const [apiKey, setApiKey] = useState('')
  const [autoClearChats, setAutoClearChats] = useState(true)
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Password states
  const [hasPassword, setHasPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Load saved settings
  useEffect(() => {
    setIsLoading(true)
    chrome.storage.local.get(['encryptedApiKey', 'autoClearChats', 'passwordHash'], async (result) => {
      if (result.encryptedApiKey !== undefined) {
        try {
          // Decrypt the API key using wallet-style encryption
          const decryptedKey = await decryptData(result.encryptedApiKey);
          setApiKey(decryptedKey);
        } catch (error) {
          console.error('Failed to decrypt API key:', error);
          // Clear the encrypted key if decryption fails
          setApiKey('');
        }
      }
      if (result.autoClearChats !== undefined) {
        setAutoClearChats(result.autoClearChats)
      }
      // Check if password is already set
      setHasPassword(!!result.passwordHash)
      setIsLoading(false)
    })
  }, [])

  // Validate password
  const validatePassword = () => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    
    setPasswordError('');
    return true;
  }

  // Save settings
  const saveSettings = async () => {
    // Validate password if being set for the first time
    if (!hasPassword && !validatePassword()) {
      return;
    }
    
    // Show loading state
    setSaved(false)
    setIsLoading(true)
    
    try {
      // Setup data to save
      const dataToSave: any = { autoClearChats };
      
      // Hash and save password if provided
      if (!hasPassword && password) {
        const passwordHash = await hashPassword(password);
        dataToSave.passwordHash = passwordHash;
      }
      
      // Encrypt the API key using wallet-style encryption
      if (apiKey) {
        const encryptedApiKey = await encryptData(apiKey);
        dataToSave.encryptedApiKey = encryptedApiKey;
      }
      
      // Save to storage
      chrome.storage.local.set(dataToSave, () => {
        setIsLoading(false)
        setSaved(true)
        
        // Update password state
        if (!hasPassword && password) {
          setHasPassword(true);
          setPassword('');
          setConfirmPassword('');
        }
        
        setTimeout(() => setSaved(false), 2000)
      })
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsLoading(false);
    }
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
          disabled={isLoading}
        />
        <p className="help-text">
          Your API key is stored securely on your device and never shared.
          <br />
          <strong>Note:</strong> Your API key is encrypted before storage.
        </p>
      </div>

      {!hasPassword && (
        <div className="settings-group">
          <h3>Set Extension Password</h3>
          <p className="help-text">
            Create a password to protect access to the extension. You'll need this password
            to use the extension after setup.
          </p>
          
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (min. 8 characters)"
            style={{
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px',
              width: '100%',
              color: 'black',
              marginBottom: '8px'
            }}
            disabled={isLoading}
          />
          
          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            style={{
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px',
              width: '100%',
              color: 'black',
            }}
            disabled={isLoading}
          />
          
          {passwordError && (
            <p className="error-text" style={{ color: 'red', marginTop: '4px' }}>
              {passwordError}
            </p>
          )}
        </div>
      )}
      
      {hasPassword && (
        <div className="settings-group">
          <p className="help-text">
            <strong>Password protection is enabled.</strong> You'll need your password to access the extension.
          </p>
        </div>
      )}

      <div className="settings-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={autoClearChats}
            onChange={(e) => setAutoClearChats(e.target.checked)}
            disabled={isLoading}
          />
          Auto-clear chats after 24 hours
        </label>
      </div>

      <button 
        className="save-button" 
        onClick={saveSettings}
        disabled={isLoading}
      >
        {isLoading ? 'Saving...' : 'Save Settings'}
      </button>
      
      {saved && <div className="save-confirmation">Settings saved!</div>}
    </main>
  )
}

export default Options 