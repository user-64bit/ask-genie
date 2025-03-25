// Background service worker for Ask-Genie

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize storage with default settings
    chrome.storage.local.set({
      apiKey: '', // User's OpenAI API key (will be encrypted)
      autoClearChats: true, // Auto-clear chats after 24 hours by default
      settings: {
        chatExpiry: 24, // Hours until chat expires
      }
    });
    
    console.log('Ask-Genie has been installed. Default settings initialized.');
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle messages here in the future
  if (request.type === 'GET_API_KEY') {
    chrome.storage.local.get(['apiKey'], (result) => {
      sendResponse({ apiKey: result.apiKey || '' });
    });
    return true; // Required for async response
  }
}); 