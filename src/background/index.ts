// Background service worker for Ask-Genie
import { decryptData, verifyPassword } from '../utils/encryption';

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize storage with default settings
    chrome.storage.local.set({
      encryptedApiKey: '', // User's OpenAI API key (encrypted with wallet-style encryption)
      autoClearChats: true, // Auto-clear chats after 24 hours by default
      passwordHash: null, // Will be set when user creates a password
      settings: {
        chatExpiry: 24, // Hours until chat expires
      }
    });
    
    console.log('Ask-Genie has been installed. Default settings initialized.');
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle API key requests
  if (request.type === 'GET_API_KEY') {
    chrome.storage.local.get(['encryptedApiKey', 'passwordHash'], async (result) => {
      // If password is set but not provided or is invalid, don't return the API key
      if (result.passwordHash && (!request.password || !(await verifyPassword(request.password, result.passwordHash)))) {
        sendResponse({ apiKey: '', error: 'Authentication required' });
        return;
      }

      try {
        // Decrypt the API key using wallet-style encryption
        const apiKey = result.encryptedApiKey ? await decryptData(result.encryptedApiKey) : '';
        sendResponse({ apiKey });
      } catch (error) {
        console.error('Failed to decrypt API key:', error);
        sendResponse({ apiKey: '', error: 'Decryption failed' });
      }
    });
    return true; // Required for async response
  }
  
  // Handle password verification requests
  if (request.type === 'VERIFY_PASSWORD') {
    chrome.storage.local.get(['passwordHash'], async (result) => {
      if (!result.passwordHash) {
        // No password set yet
        sendResponse({ verified: false, passwordSet: false });
        return;
      }
      
      const verified = await verifyPassword(request.password, result.passwordHash);
      sendResponse({ verified, passwordSet: true });
    });
    return true; // Required for async response
  }
  
  // Check if password is required
  if (request.type === 'CHECK_PASSWORD_REQUIRED') {
    chrome.storage.local.get(['passwordHash'], (result) => {
      sendResponse({ passwordRequired: !!result.passwordHash });
    });
    return true; // Required for async response
  }
}); 