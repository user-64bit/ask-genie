# Ask-Genie

Ask-Genie is a privacy-first Chrome extension that allows users to have AI-powered conversations about any webpage they are currently viewing.

Instead of copying content into ChatGPT or another AI tool, users can simply open Ask-Genie directly on the page and ask questions. The extension automatically understands the page content, provides context-aware responses, and helps users summarize, analyze, explain, translate, or explore information without leaving the website.

The extension does not use a centralized backend or shared API infrastructure. Users bring their own AI API key, and all communication happens directly between the browser and the AI provider.

---

# Problem

When reading articles, documentation, research papers, blogs, tutorials, product pages, or any long-form content, users often want to:

- Understand complex concepts
- Get quick summaries
- Ask follow-up questions
- Extract key insights
- Translate content
- Simplify technical explanations

Today this usually requires:

1. Copying content
2. Opening ChatGPT
3. Pasting content
4. Asking questions
5. Repeating the process whenever context changes

This creates friction and breaks the reading flow.

---

# Solution

Ask-Genie brings AI directly onto the webpage.

A floating assistant is available on every page. Users can instantly open the chat interface and start asking questions about the content they are currently viewing.

The extension automatically extracts relevant page content and sends it as context alongside the user's question, allowing the AI to answer with awareness of the page.

---

# How It Works

## Step 1: Install Extension

User installs Ask-Genie from Chrome.

After installation, the extension becomes available on all webpages.

---

## Step 2: Add API Key

On first launch, Ask-Genie asks the user to provide their own AI API key.

Examples:

- OpenAI
- Anthropic (future)
- Gemini (future)
- Other supported providers

The key is stored securely inside the browser.

No API key ever touches our servers.

---

## Step 3: Browse Normally

The user continues browsing the web normally.

A floating Ask-Genie button remains available in the bottom-right corner.

---

## Step 4: Open Chat

Clicking the floating bubble opens the Ask-Genie panel.

The extension automatically gathers context from the current page.

This includes:

- Main content
- Articles
- Documentation
- Blog posts
- Product descriptions
- Visible text

The extension attempts to ignore:

- Advertisements
- Navigation menus
- Sidebars
- Headers
- Footers
- Cookie banners

---

## Step 5: Ask Questions

Examples:

### Documentation

> How do I implement authentication in this library?

### Blog Post

> Summarize this article in 5 bullet points.

### Research Paper

> Explain the methodology section in simple terms.

### Product Page

> What are the key features of this product?

### Tutorial

> Give me a step-by-step action plan based on this tutorial.

The AI receives:

```text
Page Context
+
User Question
```

and generates a contextual response.

---

# Privacy Model

Privacy is one of the primary goals of Ask-Genie.

## No Backend

Ask-Genie does not require a backend server.

The extension communicates directly with the AI provider using the user's API key.

```text
Browser
  ↓
AI Provider
  ↓
Response
```

No middleman.

No proxy.

No centralized storage.

---

## User-Owned API Keys

Users provide and control their own API keys.

Benefits:

- Full ownership
- Transparent costs
- No subscription required
- No shared infrastructure

---

## Local-First Storage

All extension data remains inside the user's browser.

This includes:

- Settings
- API keys
- Chat history
- Preferences

Nothing is uploaded elsewhere.

---

# Security

## API Key Storage

The key is stored in `chrome.storage.local`, which is sandboxed per extension
and not readable by web pages or other extensions.

Just as important is where the key is *not*:

1. It is held only by the background service worker.
2. It never enters the content script or any web page.
3. It is sent only to the provider's official API endpoint, never to any
   Ask-Genie server (there isn't one).

We deliberately do not claim at-rest encryption of the key. In an MV3 extension,
deriving an encryption key from public values (extension id, user agent) would
be security theater, and a real passphrase would have to be re-entered every
time the service worker restarts. Honest local storage with a tight key-handling
boundary is the better tradeoff. (See `src/lib/config.ts`.)

---

## Principle of Least Privilege

The extension requests only the permissions it needs:

- `storage` — settings, API key, and chat history
- `tabs` — current tab info for the popup; clearing a chat when its tab closes
- `alarms` — periodic cleanup of expired chats
- `host_permissions` scoped to the two provider API hosts only (no `<all_urls>`)
- Content script injection for the on-page chat bubble

No unnecessary permissions.

---

# Chat System

Each webpage gets its own isolated conversation.

For example:

```text
github.com/page-a
  → Chat A

docs.example.com/auth
  → Chat B

blog.example.com/article
  → Chat C
```

Chats do not mix across pages.

This helps maintain accurate context.

---

# Chat Retention

Ask-Genie is designed to stay lightweight.

## Automatic Cleanup

Chats automatically expire after:

```text
24 Hours
```

from the moment the conversation starts.

This prevents unnecessary browser storage growth.

A warning is displayed inside the chat interface:

> Chat history will automatically be deleted after 24 hours.

---

## Clear on Tab Close

Users can optionally enable:

```text
Clear Chat On Tab Close
```

When enabled:

- Closing a tab immediately removes the chat for that page.
- Nothing remains after the browsing session ends.

This mode is ideal for privacy-conscious users.

---

## Manual Cleanup

Users can:

- Clear current chat
- Clear all chats

at any time.

---

# User Experience

The extension should feel more like a modern AI product than a traditional browser extension.

Goals:

- Beautiful interface
- Smooth animations
- Fast interactions
- Minimal distractions
- Native-feeling experience

---

# Quick Actions

Ask-Genie provides one-click actions for common workflows.

Examples:

### Summarize

Generate a concise summary of the current page.

### Explain

Simplify complex concepts.

### Translate

Translate page content into another language.

### Key Insights

Extract the most important takeaways.

### Action Items

Generate actionable next steps.

---

# Future Roadmap

## Multi-Provider Support

Support additional AI providers:

- Anthropic
- Gemini
- OpenRouter
- Groq
- Local models

---

## Model Selection

Allow users to choose:

- GPT-4o
- GPT-4.1
- Claude
- Gemini
- Other supported models

---

## Chat Export

Export conversations as:

- TXT
- Markdown
- PDF

---

## Advanced Page Understanding

Improve content extraction using:

- Readability algorithms
- Semantic parsing
- Structured document understanding

---

# Vision

The long-term vision of Ask-Genie is simple:

> Turn every webpage into an interactive conversation.

Instead of passively consuming information, users should be able to ask questions, explore ideas, understand concepts faster, and learn directly from the content they are reading—without ever leaving the page.
