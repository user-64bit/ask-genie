// Single source of truth for Ask Genie's brand marks and UI icons.
//
// Everything here returns a plain SVG *string*. The React surfaces (popup,
// options) render these via a tiny <Svg> wrapper; the vanilla content script
// turns them into elements. The same coin string is also rasterized into the
// extension's PNG icons by `scripts/gen-icons.ts`, so the lamp you see in the
// toolbar, the popup, and the on-page bubble are literally the same artwork.
//
// These are static, author-controlled constants — never user or model output —
// so injecting them as markup is safe.

let _uid = 0
/** Unique gradient/clip ids so multiple inlined marks never collide. */
const uid = (p = 'ag') => `${p}${(++_uid).toString(36)}`

/**
 * The lamp + rising spark, drawn on a 128×128 grid. Shared by the coin badge
 * and the standalone glyph so the silhouette can never drift between them.
 * `brass` is a gradient id (url(#brass)); `spark` is a solid colour.
 */
function lamp(brass: string, handle: string, spark: string): string {
  return `
    <path d="M34 82C24 76 16.5 66 13.5 57.5C22 63.5 32 71 42.5 80Z" fill="url(#${brass})"/>
    <path d="M88 78C104 74 106.5 92 86.5 91.5" fill="none" stroke="${handle}" stroke-width="7.5" stroke-linecap="round"/>
    <path d="M26 84C26 73 41 66.5 60 66.5C79 66.5 94 73 94 84C94 91 80 97 60 97C40 97 26 91 26 84Z" fill="url(#${brass})"/>
    <path d="M36 79C44.5 74 75.5 74 84 79C75.5 82 44.5 82 36 79Z" fill="#FFFFFF" opacity="0.28"/>
    <circle cx="60" cy="61.5" r="5" fill="url(#${brass})"/>
    <path d="M50.5 97L69.5 97L66 104L54 104Z" fill="url(#${brass})"/>
    <path d="M95 29.5C96.2 37.8 99 40.8 107.5 42C99 43.2 96.2 46.2 95 54.5C93.8 46.2 91 43.2 82.5 42C91 40.8 93.8 37.8 95 29.5Z" fill="${spark}"/>
    <circle cx="78.5" cy="31.5" r="2.1" fill="${spark}"/>
    <circle cx="106" cy="60" r="1.6" fill="${spark}" opacity="0.85"/>`
}

const BRASS_STOPS = `
  <stop offset="0" stop-color="#FFE7A6"/>
  <stop offset="0.5" stop-color="#F6BC57"/>
  <stop offset="1" stop-color="#E2902C"/>`

/** Full gradient "coin" badge — the master mark. Used for headers + raster icons. */
export function genieCoin(): string {
  const coin = uid('coin')
  const brass = uid('brass')
  const glow = uid('glow')
  return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${coin}" x1="14" y1="10" x2="116" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9A82FF"/>
      <stop offset="0.55" stop-color="#5E3CE4"/>
      <stop offset="1" stop-color="#3A1F9E"/>
    </linearGradient>
    <radialGradient id="${glow}" cx="62" cy="58" r="46" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFE3A8" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFE3A8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${brass}" x1="60" y1="55" x2="60" y2="104" gradientUnits="userSpaceOnUse">${BRASS_STOPS}</linearGradient>
  </defs>
  <rect x="2" y="2" width="124" height="124" rx="30" fill="url(#${coin})"/>
  <rect x="2.75" y="2.75" width="122.5" height="122.5" rx="29.25" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1.5"/>
  <path d="M14 30C44 18 84 18 114 30C114 30 110 6 64 6C18 6 14 30 14 30Z" fill="#FFFFFF" opacity="0.10"/>
  <ellipse cx="62" cy="60" rx="48" ry="40" fill="url(#${glow})"/>
  ${lamp(brass, '#EFA63A', '#FFF7DD')}
</svg>`
}

/** Lamp + spark only, on a transparent background. Used inside the bubble + as accents. */
export function genieGlyph(): string {
  const brass = uid('brass')
  const glow = uid('glow')
  return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="${glow}" cx="64" cy="58" r="50" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFE3A8" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#FFE3A8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${brass}" x1="60" y1="55" x2="60" y2="104" gradientUnits="userSpaceOnUse">${BRASS_STOPS}</linearGradient>
  </defs>
  <ellipse cx="62" cy="62" rx="52" ry="44" fill="url(#${glow})"/>
  ${lamp(brass, '#F4AE40', '#FFFDF4')}
</svg>`
}

// ── Line icons ──────────────────────────────────────────────────────────────
// 24×24, inherit `currentColor`, sized by CSS. Minimal + consistent stroke.

const PATHS: Record<string, string> = {
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash:
    '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6"/>',
  send: '<path d="M12 20V5M6 11l6-6 6 6"/>',
  sparkles:
    '<path d="M12 3l1.7 4.6L18.5 9.5 13.7 11.4 12 16l-1.7-4.6L5.5 9.5l4.8-1.9L12 3Z"/><path d="M19 13.5l.8 2.1 2.2.9-2.2.9-.8 2.1-.8-2.1-2.2-.9 2.2-.9.8-2.1Z"/>',
  shield: '<path d="M12 3l7 3v5c0 4.6-3 7.7-7 9-4-1.3-7-4.4-7-9V6l7-3Z"/><path d="M9 12l2 2 4-4"/>',
  key: '<circle cx="15" cy="9" r="4.2"/><path d="M12 12L4 20M7 17l2.4 2.4M9.6 14.4 12 16.8"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.5 5.2A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-3.1 4M6.2 6.2A18.3 18.3 0 0 0 2 12s3.6 7 10 7a10.7 10.7 0 0 0 2.6-.3"/>',
  check: '<path d="M5 12l4.5 4.5L19 7"/>',
  external:
    '<path d="M14 4h6v6M20 4l-8.5 8.5M18 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  // quick-action glyphs
  summarize: '<path d="M8 6h12M8 12h12M8 18h8M4 6h.01M4 12h.01M4 18h.01"/>',
  insights:
    '<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z"/>',
  explain:
    '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z"/><path d="M9 11h6M9 14h3.5"/>',
  actions:
    '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>',
  translate:
    '<path d="M4 6h9M8.5 4v2c0 4-2.2 7.2-5 8.6M6 10.5c.6 2 2.3 3.6 4.5 4.4M13 20l3.5-8 3.5 8M14.2 17h4.6"/>',
}

/** Returns a 24×24 line-icon SVG string that inherits the current text colour. */
export function icon(name: keyof typeof PATHS): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`
}

export type IconName = keyof typeof PATHS
