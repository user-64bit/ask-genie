// Minimal, XSS-safe Markdown -> DOM renderer.
//
// SAFETY: every piece of model output is inserted via textContent or as an
// attribute we construct ourselves — innerHTML is never used. Links are only
// created for http(s) URLs. A subset of Markdown is supported (headings, bold,
// italic, inline code, fenced code, lists, blockquotes, links); anything else
// renders as plain text.

function appendInline(parent: Node, text: string): void {
  // Tokenize inline: `code`, **bold**, *italic*, [label](url)
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
    }
    const token = match[0]
    if (token.startsWith('`')) {
      const code = document.createElement('code')
      code.textContent = token.slice(1, -1)
      parent.appendChild(code)
    } else if (token.startsWith('**')) {
      const strong = document.createElement('strong')
      strong.textContent = token.slice(2, -2)
      parent.appendChild(strong)
    } else if (token.startsWith('*')) {
      const em = document.createElement('em')
      em.textContent = token.slice(1, -1)
      parent.appendChild(em)
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
      if (linkMatch) appendLink(parent, linkMatch[1], linkMatch[2])
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < text.length) {
    parent.appendChild(document.createTextNode(text.slice(lastIndex)))
  }
}

function appendLink(parent: Node, label: string, url: string): void {
  const safe = /^https?:\/\//i.test(url)
  if (!safe) {
    parent.appendChild(document.createTextNode(label))
    return
  }
  const a = document.createElement('a')
  a.href = url
  a.textContent = label
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  parent.appendChild(a)
}

export function renderMarkdown(md: string): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const lines = md.replace(/\r/g, '').split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        code.push(lines[i])
        i++
      }
      i++ // closing fence
      const pre = document.createElement('pre')
      const codeEl = document.createElement('code')
      codeEl.textContent = code.join('\n')
      pre.appendChild(codeEl)
      fragment.appendChild(pre)
      continue
    }

    // Blank line
    if (line.trim() === '') {
      i++
      continue
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = Math.min(heading[1].length, 6)
      const h = document.createElement(`h${level}`)
      appendInline(h, heading[2])
      fragment.appendChild(h)
      i++
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      const bq = document.createElement('blockquote')
      appendInline(bq, quote.join(' '))
      fragment.appendChild(bq)
      continue
    }

    // Lists (unordered or ordered)
    const isUnordered = /^\s*[-*+]\s+/.test(line)
    const isOrdered = /^\s*\d+\.\s+/.test(line)
    if (isUnordered || isOrdered) {
      const list = document.createElement(isOrdered ? 'ol' : 'ul')
      const itemRe = isOrdered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/
      while (i < lines.length && itemRe.test(lines[i])) {
        const li = document.createElement('li')
        appendInline(li, lines[i].replace(itemRe, ''))
        list.appendChild(li)
        i++
      }
      fragment.appendChild(list)
      continue
    }

    // Paragraph (consume consecutive non-blank, non-special lines)
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trimStart().startsWith('```') &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    const p = document.createElement('p')
    appendInline(p, para.join(' '))
    fragment.appendChild(p)
  }

  return fragment
}
