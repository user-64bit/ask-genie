# Ask Genie

A privacy-first Chrome extension (Manifest V3) that lets you chat with AI about
the web page you're currently viewing. Bring your own API key — there is no
backend and no shared infrastructure.

Built with Vite, React, TypeScript, and [@crxjs/vite-plugin](https://crxjs.dev/).

## What it does

- A floating 🧞 bubble sits at the bottom-right of every page. Click it to open
  a chat panel about the current page.
- The extension extracts the page's main content and sends it as context with
  your question, so answers are grounded in what you're reading.
- One-click **quick actions**: Summarize, Key insights, Explain simply, Action
  items.
- Each page gets its own conversation, kept in local storage and auto-deleted
  24 hours after it starts (optionally cleared when the tab closes).

## Providers

Bring your own key for either provider; pick the model in Settings.

| Provider  | Models                                  |
| --------- | --------------------------------------- |
| OpenAI    | `gpt-4o-mini`, `gpt-4o`                 |
| Anthropic | `claude-haiku-4-5`, `claude-sonnet-4-6` |

## Privacy & security model

- Your API key is stored in `chrome.storage.local` (sandboxed per-extension,
  not readable by web pages or other extensions).
- The key is held **only** in the background service worker and is sent
  **only** to your chosen provider's official API endpoint. It never enters the
  content script or any web page.
- No Ask Genie backend exists; nothing is proxied or logged anywhere.
- We deliberately do **not** claim at-rest encryption of the key — see
  `src/lib/config.ts` for why that would be theater in an MV3 extension.

## Architecture

```
content script (per page)         background service worker        provider API
─────────────────────────         ─────────────────────────        ────────────
bubble + chat panel (Shadow DOM)  holds API key + chat history
extract page text ───ASK────────▶ build prompt, call provider ───▶ OpenAI / Anthropic
render Markdown answer ◀──reply─── persist per-page chat ◀──────────
```

- `src/lib/` — framework-free, unit-tested core (providers, chats, extraction,
  Markdown, config).
- `src/background/` — message router, AI proxy, chat storage, expiry.
- `src/contentScript/` — Shadow-DOM chat UI.
- `src/options/`, `src/popup/` — React settings and status UI.

## Develop

Requires Node 18+ (this repo uses [Bun](https://bun.sh) for installs).

```sh
bun install
bun run dev        # Vite dev server with HMR
bun run build      # type-check + production build into build/
bun run test       # vitest unit tests
```

### Load the unpacked extension

1. Run `bun run build`.
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select the `build/` folder.
4. Open the extension's **Settings**, add your API key, and pick a model.

## Packaging

```sh
bun run zip        # builds, then writes a store-ready zip into package/
```
