import { compareCodeComments, type CodeComment } from '../code-comments/comment-types'
import {
  getMarkdownNodeSourceLine,
  getMarkdownNodeSourceLineSpan,
  getMarkdownNodeSourceOffsetSpan,
  type MarkdownNodeWithPosition,
} from './source-line-metadata'
import { getElementDepth } from './source-line-resolver'

export const COMMENT_MARKER_ANCHOR_ATTRIBUTE = 'data-comment-marker-anchor'
export const COMMENT_MARKER_KEY_ATTRIBUTE = 'data-comment-marker-key'

export function isMarkerContainerTag(tagName: string) {
  return tagName === 'blockquote' || tagName === 'li'
}

export function isPreferredMarkerChildType(type: string | undefined) {
  return (
    type === 'paragraph' ||
    type === 'listItem' ||
    type === 'heading' ||
    type === 'code' ||
    type === 'table'
  )
}

export function isPreferredMarkerChildTagName(tagName: string | undefined) {
  return (
    tagName === 'p' ||
    tagName === 'li' ||
    tagName === 'pre' ||
    tagName === 'table' ||
    tagName === 'h1' ||
    tagName === 'h2' ||
    tagName === 'h3' ||
    tagName === 'h4' ||
    tagName === 'h5' ||
    tagName === 'h6'
  )
}

export function shouldSuppressMarkerForNestedSameLineChild(
  tagName: string,
  node: MarkdownNodeWithPosition | undefined,
  sourceLine: number | undefined,
) {
  if (!isMarkerContainerTag(tagName) || !node || sourceLine === undefined) {
    return false
  }

  const childNodes = Array.isArray(node.children) ? node.children : []
  for (const childNode of childNodes) {
    if (getMarkdownNodeSourceLine(childNode) !== sourceLine) {
      continue
    }

    if (
      isPreferredMarkerChildType(childNode.type) ||
      isPreferredMarkerChildTagName(childNode.tagName)
    ) {
      return true
    }
  }

  return false
}

export function areLineCountMapsEqual(
  left: ReadonlyMap<string, number>,
  right: ReadonlyMap<string, number>,
) {
  if (left.size !== right.size) {
    return false
  }

  for (const [line, count] of left.entries()) {
    if ((right.get(line) ?? 0) !== count) {
      return false
    }
  }

  return true
}

export function areLineCommentMapsEqual(
  left: ReadonlyMap<string, readonly CodeComment[]>,
  right: ReadonlyMap<string, readonly CodeComment[]>,
) {
  if (left.size !== right.size) {
    return false
  }

  for (const [line, comments] of left.entries()) {
    const rightComments = right.get(line)
    if (!rightComments || rightComments.length !== comments.length) {
      return false
    }

    for (let index = 0; index < comments.length; index += 1) {
      if (comments[index]?.id !== rightComments[index]?.id) {
        return false
      }
    }
  }

  return true
}

export function areLineArraysEqual(
  left: readonly number[],
  right: readonly number[],
) {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

export function collectRenderedSourceLines(containerElement: HTMLElement): number[] {
  const values = new Set<number>()
  const sourceLineElements = Array.from(
    containerElement.querySelectorAll<HTMLElement>('[data-source-line]'),
  )
  for (const element of sourceLineElements) {
    const lineNumber = Number(element.getAttribute('data-source-line'))
    if (!Number.isFinite(lineNumber)) {
      continue
    }
    const normalizedLine = Math.trunc(lineNumber)
    if (normalizedLine >= 1) {
      values.add(normalizedLine)
    }
  }
  return Array.from(values)
}

export type RenderedCommentMarkerAnchor = {
  key: string
  tagName: string
  startLine: number
  endLine: number
  startOffset: number | null
  endOffset: number | null
  spanLength: number
  depth: number
}


function readNumericAttribute(
  element: HTMLElement,
  attributeName: string,
): number | null {
  const rawValue = element.getAttribute(attributeName)
  if (!rawValue) {
    return null
  }
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return null
  }
  const normalized = Math.trunc(parsed)
  return normalized >= 0 ? normalized : null
}

export function buildCommentMarkerAnchorKey(
  node: MarkdownNodeWithPosition | undefined,
): string | null {
  const lineSpan = getMarkdownNodeSourceLineSpan(node)
  if (!lineSpan) {
    return null
  }

  const offsetSpan = getMarkdownNodeSourceOffsetSpan(node)
  const tagName =
    typeof node?.tagName === 'string' && node.tagName.length > 0
      ? node.tagName
      : node?.type ?? 'node'

  return [
    tagName,
    lineSpan.startLine,
    lineSpan.endLine,
    offsetSpan?.startOffset ?? 'na',
    offsetSpan?.endOffset ?? 'na',
  ].join(':')
}

export function collectRenderedCommentMarkerAnchors(
  containerElement: HTMLElement,
): RenderedCommentMarkerAnchor[] {
  const anchors = Array.from(
    containerElement.querySelectorAll<HTMLElement>(
      `[${COMMENT_MARKER_ANCHOR_ATTRIBUTE}="true"]`,
    ),
  )

  return anchors
    .map((element) => {
      const key = element.getAttribute(COMMENT_MARKER_KEY_ATTRIBUTE)
      if (!key) {
        return null
      }

      const lineNumber =
        readNumericAttribute(element, 'data-source-line') ??
        readNumericAttribute(element, 'data-source-line-start')
      const startLine = readNumericAttribute(element, 'data-source-line-start')
      const endLine = readNumericAttribute(element, 'data-source-line-end')
      const normalizedStartLine = startLine ?? lineNumber
      const normalizedEndLine = endLine ?? lineNumber ?? startLine
      if (
        normalizedStartLine === null ||
        normalizedEndLine === null ||
        normalizedStartLine < 1 ||
        normalizedEndLine < 1
      ) {
        return null
      }

      const startOffset = readNumericAttribute(element, 'data-source-offset-start')
      const endOffset = readNumericAttribute(element, 'data-source-offset-end')
      const spanLength =
        startOffset !== null &&
        endOffset !== null &&
        endOffset >= startOffset
          ? endOffset - startOffset
          : Number.POSITIVE_INFINITY

      return {
        key,
        tagName: element.tagName.toLowerCase(),
        startLine: Math.min(normalizedStartLine, normalizedEndLine),
        endLine: Math.max(normalizedStartLine, normalizedEndLine),
        startOffset,
        endOffset,
        spanLength,
        depth: getElementDepth(element),
      } satisfies RenderedCommentMarkerAnchor
    })
    .filter((anchor): anchor is RenderedCommentMarkerAnchor => anchor !== null)
}

function compareMarkerAnchorDistance(
  anchor: RenderedCommentMarkerAnchor,
  lineNumber: number,
) {
  if (lineNumber < anchor.startLine) {
    return anchor.startLine - lineNumber
  }
  if (lineNumber > anchor.endLine) {
    return lineNumber - anchor.endLine
  }
  return 0
}

function selectNeutralTableAnchor(
  anchors: readonly RenderedCommentMarkerAnchor[],
  lineNumber: number,
): RenderedCommentMarkerAnchor | null {
  const containingTableAnchors = anchors
    .filter(
      (anchor) =>
        anchor.tagName === 'table' && compareMarkerAnchorDistance(anchor, lineNumber) === 0,
    )
    .sort((left, right) => {
      if (left.spanLength !== right.spanLength) {
        return left.spanLength - right.spanLength
      }
      if (left.depth !== right.depth) {
        return right.depth - left.depth
      }
      if (left.startLine !== right.startLine) {
        return left.startLine - right.startLine
      }
      return left.key.localeCompare(right.key)
    })

  return containingTableAnchors[0] ?? null
}

export function selectBestRenderedCommentMarkerAnchor(
  anchors: readonly RenderedCommentMarkerAnchor[],
  comment: CodeComment,
): RenderedCommentMarkerAnchor | null {
  const startOffset = comment.anchor.startOffset
  const endOffset = comment.anchor.endOffset
  if (
    typeof startOffset === 'number' &&
    Number.isFinite(startOffset) &&
    typeof endOffset === 'number' &&
    Number.isFinite(endOffset)
  ) {
    const offsetMatches = anchors
      .filter(
        (anchor) =>
          anchor.startOffset !== null &&
          anchor.endOffset !== null &&
          anchor.startOffset <= startOffset &&
          anchor.endOffset >= endOffset,
      )
      .sort((left, right) => {
        if (left.spanLength !== right.spanLength) {
          return left.spanLength - right.spanLength
        }
        if (left.depth !== right.depth) {
          return right.depth - left.depth
        }
        if (left.startLine !== right.startLine) {
          return left.startLine - right.startLine
        }
        return left.key.localeCompare(right.key)
      })

    if (offsetMatches.length > 0) {
      return offsetMatches[0] ?? null
    }
  }

  const commentLine = Math.max(1, comment.startLine)
  const neutralTableAnchor = selectNeutralTableAnchor(anchors, commentLine)
  if (neutralTableAnchor) {
    return neutralTableAnchor
  }

  return (
    [...anchors].sort((left, right) => {
      const leftDistance = compareMarkerAnchorDistance(left, commentLine)
      const rightDistance = compareMarkerAnchorDistance(right, commentLine)
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance
      }
      if (left.startLine !== right.startLine) {
        return left.startLine - right.startLine
      }
      if (left.depth !== right.depth) {
        return right.depth - left.depth
      }
      return left.key.localeCompare(right.key)
    })[0] ?? null
  )
}

function selectBestRenderedCommentMarkerAnchorForLine(
  anchors: readonly RenderedCommentMarkerAnchor[],
  lineNumber: number,
): RenderedCommentMarkerAnchor | null {
  const neutralTableAnchor = selectNeutralTableAnchor(anchors, lineNumber)
  if (neutralTableAnchor) {
    return neutralTableAnchor
  }

  return (
    [...anchors].sort((left, right) => {
      const leftDistance = compareMarkerAnchorDistance(left, lineNumber)
      const rightDistance = compareMarkerAnchorDistance(right, lineNumber)
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance
      }
      if (left.startLine !== right.startLine) {
        return left.startLine - right.startLine
      }
      if (left.depth !== right.depth) {
        return right.depth - left.depth
      }
      return left.key.localeCompare(right.key)
    })[0] ?? null
  )
}

export function mapCommentEntriesToMarkerAnchors(
  commentLineEntries: ReadonlyMap<number, readonly CodeComment[]>,
  anchors: readonly RenderedCommentMarkerAnchor[],
) {
  const mappedEntries = new Map<string, CodeComment[]>()
  const mappedCounts = new Map<string, number>()
  const entryCountsByLine = new Map<number, number>()

  for (const [commentLine, entries] of commentLineEntries.entries()) {
    entryCountsByLine.set(
      commentLine,
      (entryCountsByLine.get(commentLine) ?? 0) + entries.length,
    )
    for (const comment of entries) {
      const anchor = selectBestRenderedCommentMarkerAnchor(anchors, comment)
      if (!anchor) {
        continue
      }

      const nextEntries = mappedEntries.get(anchor.key) ?? []
      nextEntries.push(comment)
      mappedEntries.set(anchor.key, nextEntries)
      mappedCounts.set(anchor.key, (mappedCounts.get(anchor.key) ?? 0) + 1)
    }
  }

  for (const [key, entries] of mappedEntries.entries()) {
    mappedEntries.set(
      key,
      [...entries].sort(compareCodeComments),
    )
  }

  return {
    counts: mappedCounts as ReadonlyMap<string, number>,
    entries: mappedEntries as ReadonlyMap<string, readonly CodeComment[]>,
    lineEntryCounts: entryCountsByLine as ReadonlyMap<number, number>,
  }
}

export function mapCommentCountsToMarkerAnchors(
  commentLineCounts: ReadonlyMap<number, number>,
  anchors: readonly RenderedCommentMarkerAnchor[],
  entryCountsByLine: ReadonlyMap<number, number>,
): ReadonlyMap<string, number> {
  const mappedCounts = new Map<string, number>()

  for (const [commentLine, count] of commentLineCounts.entries()) {
    const remainingCount = count - (entryCountsByLine.get(commentLine) ?? 0)
    if (remainingCount <= 0) {
      continue
    }

    const anchor = selectBestRenderedCommentMarkerAnchorForLine(anchors, commentLine)
    if (!anchor) {
      continue
    }

    mappedCounts.set(anchor.key, (mappedCounts.get(anchor.key) ?? 0) + remainingCount)
  }

  return mappedCounts
}
