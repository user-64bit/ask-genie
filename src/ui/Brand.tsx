// React wrappers around the shared SVG marks (src/ui/marks.ts). The strings are
// author-controlled constants, so rendering them as markup is safe. Memoized so
// the unique gradient ids stay stable across re-renders.

import { useMemo } from 'react'
import { genieCoin, genieGlyph, icon, type IconName } from './marks'

function Svg({ raw, className }: { raw: string; className?: string }) {
  return <span className={`ag-svg ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: raw }} />
}

export function Coin({ className }: { className?: string }) {
  const raw = useMemo(() => genieCoin(), [])
  return <Svg raw={raw} className={className} />
}

export function Glyph({ className }: { className?: string }) {
  const raw = useMemo(() => genieGlyph(), [])
  return <Svg raw={raw} className={className} />
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const raw = useMemo(() => icon(name), [name])
  return <Svg raw={raw} className={className} />
}
