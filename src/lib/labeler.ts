// Pure heuristic labeling. DOM facts are gathered by the caller into LabelInput
// so this stays node-testable.
import type { ContextType } from './contexts'

export interface LabelInput {
  text: string
  ancestorTags: string[] // lowercased tag names, selection's container upward
  nearestHeading: string | null
}

export interface Label {
  type: ContextType
  label: string
}

const LABEL_MAX = 32

const ERROR_RE =
  /\b(error|exception|traceback|stack ?trace|fatal|panic|warning)\b|\bat\s+\S+\s*\(.*:\d+:\d+\)|\bstatus\s+[45]\d{2}\b|\b[45]\d{2}\b\s+(error|status)/i
const CURRENCY_RE = /(\$|€|£|₹|usd|inr|eur|gbp)\s?\d/i
const PRICING_KW_RE = /(\/mo|\/yr|\/month|\/year|per month|per year|billed|\bplan\b|pricing|free tier|\/user|\/seat)/i

function has(tags: string[], ...names: string[]): boolean {
  return tags.some((t) => names.includes(t))
}

function clamp(s: string): string {
  const t = s.trim()
  return t.length > LABEL_MAX ? t.slice(0, LABEL_MAX - 1).trimEnd() + '…' : t
}

function firstWords(text: string, n: number): string {
  const words = text.trim().split(/\s+/).slice(0, n)
  const joined = words.join(' ')
  return clamp(text.trim().split(/\s+/).length > n ? joined + '…' : joined)
}

function detectType(input: LabelInput): ContextType {
  const { text, ancestorTags, nearestHeading } = input
  if (has(ancestorTags, 'pre', 'code')) return 'code'
  if (has(ancestorTags, 'table', 'thead', 'tbody', 'tr', 'td', 'th')) return 'table'
  if (ERROR_RE.test(text)) return 'error'
  if (CURRENCY_RE.test(text) && PRICING_KW_RE.test(text)) return 'pricing'
  if (has(ancestorTags, 'blockquote', 'q')) return 'quote'
  if (nearestHeading) return 'doc'
  if (has(ancestorTags, 'ul', 'ol', 'li')) return 'list'
  return 'text'
}

export function labelSelection(input: LabelInput): Label {
  const type = detectType(input)
  const h = input.nearestHeading ? clamp(input.nearestHeading) : null
  let label: string
  switch (type) {
    case 'code':
      label = h ? `${h} · Code` : 'Code Block'
      break
    case 'table':
      label = h ? `${h} · Table` : 'Data Table'
      break
    case 'error':
      label = 'Error Log'
      break
    case 'pricing':
      label = h ?? 'Pricing'
      break
    case 'doc':
      label = h ?? firstWords(input.text, 5)
      break
    case 'list':
      label = h ? `${h} · List` : 'List'
      break
    case 'quote':
      label = 'Quote'
      break
    default:
      label = h ?? firstWords(input.text, 5)
  }
  return { type, label }
}
