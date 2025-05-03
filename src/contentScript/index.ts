console.info('contentScript is running')

// Main content script for Ask-Genie
import './styles.css';

// Store authentication state
let userPassword = '';
let isAuthenticated = false;

// Check if password is required
function checkPasswordRequired(callback: (required: boolean) => void) {
  chrome.runtime.sendMessage({ type: 'CHECK_PASSWORD_REQUIRED' }, (response) => {
    callback(response.passwordRequired);
  });
}

// Authenticate with password
function authenticate(password: string, callback: (success: boolean) => void) {
  chrome.runtime.sendMessage({ 
    type: 'VERIFY_PASSWORD', 
    password 
  }, (response) => {
    if (response.verified) {
      userPassword = password;
      isAuthenticated = true;
      callback(true);
    } else {
      callback(false);
    }
  });
}

// Create and inject the chat bubble and chat container
function createChatBubble() {
  // Create the chat bubble element
  const chatBubble = document.createElement('div');
  chatBubble.className = 'ask-genie-bubble';
  chatBubble.innerHTML = '🧞‍♂️';
  chatBubble.title = 'Ask Genie';
  
  // Create the chat container (initially hidden)
  const chatContainer = document.createElement('div');
  chatContainer.className = 'ask-genie-container';
  
  // Check if password is required before showing content
  checkPasswordRequired((passwordRequired) => {
    if (!passwordRequired) {
      // No password required, show normal interface
      isAuthenticated = true;
      renderChatInterface(chatContainer);
    } else {
      // Password required, show authentication interface
      renderAuthInterface(chatContainer);
    }
  });
  
  chatContainer.style.display = 'none';
  
  // Append elements to the body
  document.body.appendChild(chatBubble);
  document.body.appendChild(chatContainer);
  
  // Event listeners
  chatBubble.addEventListener('click', () => {
    chatContainer.style.display = 'flex';
    chatBubble.style.display = 'none';
  });
  
  // Prevent clicks within the chat container from propagating to the document
  chatContainer.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Render authentication interface
function renderAuthInterface(container: HTMLElement) {
  container.innerHTML = `
    <div class="ask-genie-header">
      <h3>Ask Genie</h3>
      <button class="ask-genie-close">×</button>
    </div>
    <div class="ask-genie-auth">
      <h4>Password Required</h4>
      <p>Please enter your password to use Ask Genie</p>
      <input type="password" class="ask-genie-password" placeholder="Enter password">
      <button class="ask-genie-auth-button">Unlock</button>
      <p class="ask-genie-auth-error" style="display: none; color: red;"></p>
    </div>
  `;
  
  const closeButton = container.querySelector('.ask-genie-close');
  const passwordInput = container.querySelector('.ask-genie-password') as HTMLInputElement;
  const authButton = container.querySelector('.ask-genie-auth-button');
  const errorMessage = container.querySelector('.ask-genie-auth-error');
  
  // Close button event
  closeButton?.addEventListener('click', () => {
    container.style.display = 'none';
    const bubble = document.querySelector('.ask-genie-bubble');
    if (bubble instanceof HTMLElement) {
      bubble.style.display = 'flex';
    }
  });
  
  // Authentication logic
  const attemptAuth = () => {
    if (!passwordInput || !passwordInput.value) return;
    
    const password = passwordInput.value;
    authButton?.setAttribute('disabled', 'true');
    authButton!.textContent = 'Verifying...';
    
    authenticate(password, (success) => {
      if (success) {
        // Show chat interface on success
        renderChatInterface(container);
      } else {
        // Show error on failure
        authButton?.removeAttribute('disabled');
        authButton!.textContent = 'Unlock';
        errorMessage!.textContent = 'Incorrect password';
        if (errorMessage instanceof HTMLElement) {
          errorMessage.style.display = 'block';
        }
      }
    });
  };
  
  // Auth button click
  authButton?.addEventListener('click', attemptAuth);
  
  // Enter key press
  passwordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptAuth();
  });
}

// Render chat interface
function renderChatInterface(container: HTMLElement) {
  container.innerHTML = `
    <div class="ask-genie-header">
      <h3>Ask Genie</h3>
      <button class="ask-genie-close">×</button>
    </div>
    <div class="ask-genie-messages"></div>
    <div class="ask-genie-input-area">
      <input type="text" class="ask-genie-input" placeholder="Ask about this page...">
      <button class="ask-genie-send">Send</button>
    </div>
  `;
  
  const closeButton = container.querySelector('.ask-genie-close');
  const sendButton = container.querySelector('.ask-genie-send');
  const input = container.querySelector('.ask-genie-input') as HTMLInputElement;
  
  // Close button event
  closeButton?.addEventListener('click', () => {
    container.style.display = 'none';
    const bubble = document.querySelector('.ask-genie-bubble');
    if (bubble instanceof HTMLElement) {
      bubble.style.display = 'flex';
    }
  });
  
  // Send message logic (to be implemented with API calls)
  const sendMessage = () => {
    if (!input || !input.value.trim()) return;
    
    const message = input.value.trim();
    const messagesContainer = container.querySelector('.ask-genie-messages');
    
    // Add user message
    const userMessageEl = document.createElement('div');
    userMessageEl.className = 'ask-genie-message user-message';
    userMessageEl.textContent = message;
    messagesContainer?.appendChild(userMessageEl);
    
    // Clear input
    input.value = '';
    
    // TODO: Send to API with authenticated password
    // For now, show a placeholder response
    setTimeout(() => {
      const aiMessageEl = document.createElement('div');
      aiMessageEl.className = 'ask-genie-message ai-message';
      aiMessageEl.textContent = 'This is a placeholder response. API integration coming soon!';
      messagesContainer?.appendChild(aiMessageEl);
    }, 1000);
  };
  
  // Send button click
  sendButton?.addEventListener('click', sendMessage);
  
  // Enter key press
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  createChatBubble();
});

// In case the content script loads after DOMContentLoaded has already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  createChatBubble();
}
