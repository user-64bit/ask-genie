# Ask Genie

A privacy-first Chrome extension (Manifest V3) that lets you chat with AI about
the web page you're currently viewing. Bring your own API key — there is no
backend and no shared infrastructure.

Built with Vite, React, TypeScript, and [@crxjs/vite-plugin](https://crxjs.dev/).

## What it does

- A floating **genie lamp** sits at the bottom-right of every page. Click it to
  summon a chat panel about the current page.
- The extension extracts the page's main content and sends it as context with
  your question, so answers are grounded in what you're reading.
- One-click **quick actions**: Summarize, Key insights, Explain simply, Action
  items, Translate.
- Each page gets its own conversation, kept in local storage and auto-deleted
  24 hours after it starts (optionally cleared when the tab closes). Clear one
  chat from the panel, or all of them from Settings.
- A "Mystic Lamp" interface — indigo-night glass that follows your system
  light/dark preference, so it sits well over any site.

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
- `src/ui/` — single source of truth for the brand marks + line icons, shared by
  every surface.
- `scripts/gen-icons.ts` — rasterizes the lamp mark into the extension's PNG
  icons (`bun run icons`).

## Develop

Requires Node 18+ (this repo uses [Bun](https://bun.sh) for installs).

```sh
bun install
bun run dev        # Vite dev server with HMR
bun run build      # type-check + production build into build/
bun run test       # vitest unit tests
bun run icons      # regenerate icon PNGs from the lamp SVG
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
