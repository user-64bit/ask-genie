console.info('contentScript is running')

// Main content script for Ask-Genie
import './styles.css';

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
  chatContainer.innerHTML = `
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
  chatContainer.style.display = 'none';
  
  // Append elements to the body
  document.body.appendChild(chatBubble);
  document.body.appendChild(chatContainer);
  
  // Event listeners
  chatBubble.addEventListener('click', () => {
    chatContainer.style.display = 'flex';
    chatBubble.style.display = 'none';
  });
  
  const closeButton = chatContainer.querySelector('.ask-genie-close');
  closeButton?.addEventListener('click', () => {
    chatContainer.style.display = 'none';
    chatBubble.style.display = 'flex';
  });
  
  // Prevent clicks within the chat container from propagating to the document
  chatContainer.addEventListener('click', (e) => {
    e.stopPropagation();
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
