export const SOURCE_LINE_ATTRIBUTE = 'data-source-line'
export const SOURCE_LINE_START_ATTRIBUTE = 'data-source-line-start'
export const SOURCE_LINE_END_ATTRIBUTE = 'data-source-line-end'
export const SOURCE_OFFSET_START_ATTRIBUTE = 'data-source-offset-start'
export const SOURCE_OFFSET_END_ATTRIBUTE = 'data-source-offset-end'
export const SOURCE_TEXT_LEAF_ATTRIBUTE = 'data-source-text-leaf'

export type MarkdownNodeWithPosition = {
  type?: string
  tagName?: string
  position?: {
    start?: {
      line?: number
      offset?: number
    }
    end?: {
      line?: number
      offset?: number
    }
  }
  properties?: Record<string, unknown>
  children?: MarkdownNodeWithPosition[]
}

export type SourceLineSpan = {
  startLine: number
  endLine: number
}

export type SourceOffsetSpan = {
  startOffset: number
  endOffset: number
}

function normalizeSourceLine(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  const normalized = Math.trunc(value)
  return normalized >= 1 ? normalized : undefined
}

function normalizeSourceOffset(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  const normalized = Math.trunc(value)
  return normalized >= 0 ? normalized : undefined
}

export function getMarkdownNodeSourceLineSpan(
  node: MarkdownNodeWithPosition | undefined,
): SourceLineSpan | undefined {
  const startLine = normalizeSourceLine(node?.position?.start?.line)
  const endLine = normalizeSourceLine(node?.position?.end?.line)
  if (startLine === undefined && endLine === undefined) {
    return undefined
  }

  const normalizedStartLine = startLine ?? endLine
  const normalizedEndLine = endLine ?? startLine
  if (normalizedStartLine === undefined || normalizedEndLine === undefined) {
    return undefined
  }

  return {
    startLine: Math.min(normalizedStartLine, normalizedEndLine),
    endLine: Math.max(normalizedStartLine, normalizedEndLine),
  }
}

export function getMarkdownNodeSourceLine(
  node: MarkdownNodeWithPosition | undefined,
) {
  return getMarkdownNodeSourceLineSpan(node)?.startLine
}

export function getMarkdownNodeSourceOffsetSpan(
  node: MarkdownNodeWithPosition | undefined,
): SourceOffsetSpan | undefined {
  const startOffset = normalizeSourceOffset(node?.position?.start?.offset)
  const endOffset = normalizeSourceOffset(node?.position?.end?.offset)
  if (startOffset === undefined && endOffset === undefined) {
    return undefined
  }

  const normalizedStartOffset = startOffset ?? endOffset
  const normalizedEndOffset = endOffset ?? startOffset
  if (
    normalizedStartOffset === undefined ||
    normalizedEndOffset === undefined ||
    normalizedStartOffset >= normalizedEndOffset
  ) {
    return undefined
  }

  return {
    startOffset: normalizedStartOffset,
    endOffset: normalizedEndOffset,
  }
}

export function buildSourceLineAttributes(
  node: MarkdownNodeWithPosition | undefined,
  options?: {
    includeAnchorLine?: boolean
  },
) {
  const span = getMarkdownNodeSourceLineSpan(node)
  const offsetSpan = getMarkdownNodeSourceOffsetSpan(node)
  if (!span) {
    return {
      [SOURCE_LINE_ATTRIBUTE]: undefined,
      [SOURCE_LINE_START_ATTRIBUTE]: undefined,
      [SOURCE_LINE_END_ATTRIBUTE]: undefined,
      [SOURCE_OFFSET_START_ATTRIBUTE]: offsetSpan?.startOffset,
      [SOURCE_OFFSET_END_ATTRIBUTE]: offsetSpan?.endOffset,
    }
  }

  return {
    [SOURCE_LINE_ATTRIBUTE]:
      options?.includeAnchorLine === false ? undefined : span.startLine,
    [SOURCE_LINE_START_ATTRIBUTE]: span.startLine,
    [SOURCE_LINE_END_ATTRIBUTE]: span.endLine,
    [SOURCE_OFFSET_START_ATTRIBUTE]: offsetSpan?.startOffset,
    [SOURCE_OFFSET_END_ATTRIBUTE]: offsetSpan?.endOffset,
  }
}
