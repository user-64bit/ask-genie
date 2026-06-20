// Generates the extension's brand assets from a single source of truth: the
// `genieCoin()` mark in src/ui/marks.ts. Run with `bun run icons` whenever the
// mark changes — it rewrites public/icons/logo.svg and the PNG sizes Chrome
// needs for the toolbar/store. Dev-only; nothing here ships in the bundle.

import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { genieCoin } from '../src/ui/marks'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svg = genieCoin()

// Master vector (also used as the popup/options favicon).
const svgPath = resolve(root, 'public/icons/logo.svg')
mkdirSync(dirname(svgPath), { recursive: true })
writeFileSync(svgPath, svg + '\n')
console.log('wrote public/icons/logo.svg')

const sizes = [16, 32, 48, 128]
for (const size of sizes) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  const out = resolve(root, `public/img/logo-${size}.png`)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, png)
  console.log(`wrote public/img/logo-${size}.png (${size}px, ${png.length} bytes)`)
}
