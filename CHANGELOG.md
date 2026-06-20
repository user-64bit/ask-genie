# CHANGELOG

```txt
Summary
  1. document grouping follow 'SemVer2.0' protocol
  2. use 'PATCH' as a minimum granularity
  3. use concise descriptions
  4. type: feat \ fix \ update \ perf \ remove \ docs \ chore
  5. version timestamp follow the yyyy.MM.dd format
```

## 0.1.0 [2026.06.20]

- feat: working on-page AI chat — extract page content, ask OpenAI/Anthropic via
  the background worker, render Markdown answers
- feat: provider + model selection (OpenAI, Anthropic) with bring-your-own key
- feat: per-page chat history with 24h auto-expiry and optional clear-on-tab-close
- feat: quick actions (Summarize, Key insights, Explain simply, Action items)
- feat: Shadow-DOM content UI isolated from host-page styles
- remove: fake "wallet-style" key encryption + cosmetic password gate (the key is
  now stored honestly and kept only in the background worker)
- remove: unused boilerplate pages (newtab, sidepanel, devtools) and crypto/motion deps
- test: unit tests for provider requests, page keys, expiry, and text extraction
- docs: rewrite README to match the actual product

## 0.0.0 [2025.03.26]

- feat: initial
- feat: generator by ![create-chrome-ext](https://github.com/guocaoyi/create-chrome-ext)
