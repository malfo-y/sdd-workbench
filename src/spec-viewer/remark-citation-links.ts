import { buildCitationHref, parseBracketCitationText } from './citation-target'

type MarkdownNode = {
  type?: string
  value?: string
  url?: string
  children?: MarkdownNode[]
}

const SKIPPED_NODE_TYPES = new Set([
  'code',
  'definition',
  'html',
  'image',
  'imageReference',
  'inlineCode',
  'link',
  'linkReference',
])

const BRACKET_CITATION_PATTERN = /\[[^\]\n]+\]/g

function transformTextNode(node: MarkdownNode): MarkdownNode[] | null {
  if (node.type !== 'text' || typeof node.value !== 'string') {
    return null
  }

  const nextChildren: MarkdownNode[] = []
  let lastIndex = 0

  for (const match of node.value.matchAll(BRACKET_CITATION_PATTERN)) {
    const rawCitation = match[0]
    const matchIndex = match.index ?? -1
    const target = parseBracketCitationText(rawCitation)
    if (matchIndex < 0 || !target) {
      continue
    }

    if (matchIndex > lastIndex) {
      nextChildren.push({
        type: 'text',
        value: node.value.slice(lastIndex, matchIndex),
      })
    }

    nextChildren.push({
      type: 'link',
      url: buildCitationHref(target),
      children: [
        {
          type: 'text',
          value: rawCitation,
        },
      ],
    })
    lastIndex = matchIndex + rawCitation.length
  }

  if (nextChildren.length === 0) {
    return null
  }

  if (lastIndex < node.value.length) {
    nextChildren.push({
      type: 'text',
      value: node.value.slice(lastIndex),
    })
  }

  return nextChildren
}

export function transformCitationTextNodes(node: MarkdownNode) {
  if (!Array.isArray(node.children) || SKIPPED_NODE_TYPES.has(node.type ?? '')) {
    return
  }

  const nextChildren: MarkdownNode[] = []
  let didChange = false

  for (const child of node.children) {
    const transformedChildren = transformTextNode(child)
    if (transformedChildren) {
      nextChildren.push(...transformedChildren)
      didChange = true
      continue
    }

    transformCitationTextNodes(child)
    nextChildren.push(child)
  }

  if (didChange) {
    node.children = nextChildren
  }
}

/**
 * Remark plugin that transforms bracket citations (`[path.py:Symbol]`) in
 * prose text into clickable internal link nodes. Skips inline code, existing
 * links, images, and HTML blocks.
 */
export function remarkCitationLinks() {
  return (tree: MarkdownNode) => {
    transformCitationTextNodes(tree)
  }
}
