// Extracts the readable main content of a page to send as AI context.
// cleanText / truncate are pure and unit-tested; extractPageContent needs a DOM.

/** Collapse runs of whitespace while preserving paragraph breaks. */
export function cleanText(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars).trimEnd() + '\n\n[content truncated]'
}

const STRIP_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'nav',
  'aside',
  'footer',
  'header',
  'form',
  'button',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[aria-hidden="true"]',
]

/**
 * Best-effort main-content extraction: prefer <article>/<main>, strip chrome
 * (nav, ads, headers/footers, scripts), then collapse to plain text capped at
 * maxChars. Intentionally lightweight — no heavy Readability dependency.
 */
export function extractPageContent(doc: Document, maxChars = 12000): string {
  const root =
    doc.querySelector('article') ||
    doc.querySelector('main') ||
    doc.querySelector('[role="main"]') ||
    doc.body
  if (!root) return ''

  const clone = root.cloneNode(true) as HTMLElement
  for (const selector of STRIP_SELECTORS) {
    clone.querySelectorAll(selector).forEach((el) => el.remove())
  }
  const raw = clone.textContent || ''
  return truncate(cleanText(raw), maxChars)
}
