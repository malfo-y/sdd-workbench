import {
  buildCitationHref,
  parseBracketCitationText,
  type CitationTarget,
} from './citation-target'

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

function buildCitationLinkNode(
  target: CitationTarget,
  children: MarkdownNode[],
): MarkdownNode {
  return {
    type: 'link',
    url: buildCitationHref(target),
    children,
  }
}

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

    nextChildren.push(
      buildCitationLinkNode(target, [
        {
          type: 'text',
          value: rawCitation,
        },
      ]),
    )
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

function transformBracketWrappedInlineCodeCitation(
  children: MarkdownNode[],
  index: number,
): { nextChildren: MarkdownNode[]; consumedChildCount: number } | null {
  const previousText = children[index]
  const inlineCodeNode = children[index + 1]
  const nextText = children[index + 2]

  if (
    previousText?.type !== 'text' ||
    typeof previousText.value !== 'string' ||
    inlineCodeNode?.type !== 'inlineCode' ||
    typeof inlineCodeNode.value !== 'string' ||
    nextText?.type !== 'text' ||
    typeof nextText.value !== 'string'
  ) {
    return null
  }

  if (
    !previousText.value.endsWith('[') ||
    !nextText.value.startsWith(']')
  ) {
    return null
  }

  const target = parseBracketCitationText(`[${inlineCodeNode.value}]`)
  if (!target) {
    return null
  }

  const nextChildren: MarkdownNode[] = []
  const leadingText = previousText.value.slice(0, -1)
  const trailingText = nextText.value.slice(1)

  if (leadingText) {
    nextChildren.push({
      type: 'text',
      value: leadingText,
    })
  }

  nextChildren.push(
    buildCitationLinkNode(target, [
      {
        type: 'text',
        value: '[',
      },
      inlineCodeNode,
      {
        type: 'text',
        value: ']',
      },
    ]),
  )

  if (trailingText) {
    nextChildren.push({
      type: 'text',
      value: trailingText,
    })
  }

  return {
    nextChildren,
    consumedChildCount: 3,
  }
}

export function transformCitationTextNodes(node: MarkdownNode) {
  if (!Array.isArray(node.children) || SKIPPED_NODE_TYPES.has(node.type ?? '')) {
    return
  }

  let currentChildren = node.children

  while (true) {
    const nextChildren: MarkdownNode[] = []
    let didChange = false

    for (let index = 0; index < currentChildren.length; index += 1) {
      const inlineCodeCitation = transformBracketWrappedInlineCodeCitation(
        currentChildren,
        index,
      )
      if (inlineCodeCitation) {
        nextChildren.push(...inlineCodeCitation.nextChildren)
        didChange = true
        index += inlineCodeCitation.consumedChildCount - 1
        continue
      }

      const child = currentChildren[index]
      const transformedChildren = transformTextNode(child)
      if (transformedChildren) {
        nextChildren.push(...transformedChildren)
        didChange = true
        continue
      }

      nextChildren.push(child)
    }

    if (!didChange) {
      node.children = currentChildren
      break
    }

    currentChildren = nextChildren
  }

  for (const child of node.children) {
    transformCitationTextNodes(child)
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
