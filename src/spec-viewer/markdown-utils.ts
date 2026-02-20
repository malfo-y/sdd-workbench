import GithubSlugger from 'github-slugger'

export type MarkdownHeading = {
  depth: number
  text: string
  id: string
}

const ATX_HEADING_PATTERN = /^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/
const FENCE_PATTERN = /^ {0,3}(```|~~~)/

function normalizeHeadingText(rawText: string) {
  return rawText
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractMarkdownHeadings(markdown: string, maxDepth = 3) {
  const slugger = new GithubSlugger()
  const headings: MarkdownHeading[] = []
  const lines = markdown.split(/\r?\n/)
  let activeFenceMarker: '`' | '~' | null = null

  for (const line of lines) {
    const fenceMatch = line.match(FENCE_PATTERN)
    if (fenceMatch) {
      const marker = fenceMatch[1].startsWith('`') ? '`' : '~'
      if (activeFenceMarker === null) {
        activeFenceMarker = marker
      } else if (activeFenceMarker === marker) {
        activeFenceMarker = null
      }
      continue
    }

    if (activeFenceMarker !== null) {
      continue
    }

    const headingMatch = line.match(ATX_HEADING_PATTERN)
    if (!headingMatch) {
      continue
    }

    const depth = headingMatch[1].length
    if (depth > maxDepth) {
      continue
    }

    const text = normalizeHeadingText(headingMatch[2])
    if (!text) {
      continue
    }

    headings.push({
      depth,
      text,
      id: slugger.slug(text),
    })
  }

  return headings
}
