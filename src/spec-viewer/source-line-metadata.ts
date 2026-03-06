export const SOURCE_LINE_ATTRIBUTE = 'data-source-line'
export const SOURCE_LINE_START_ATTRIBUTE = 'data-source-line-start'
export const SOURCE_LINE_END_ATTRIBUTE = 'data-source-line-end'

export type MarkdownNodeWithPosition = {
  type?: string
  tagName?: string
  position?: {
    start?: {
      line?: number
    }
    end?: {
      line?: number
    }
  }
  children?: MarkdownNodeWithPosition[]
}

export type SourceLineSpan = {
  startLine: number
  endLine: number
}

function normalizeSourceLine(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  const normalized = Math.trunc(value)
  return normalized >= 1 ? normalized : undefined
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

export function buildSourceLineAttributes(
  node: MarkdownNodeWithPosition | undefined,
  options?: {
    includeAnchorLine?: boolean
  },
) {
  const span = getMarkdownNodeSourceLineSpan(node)
  if (!span) {
    return {
      [SOURCE_LINE_ATTRIBUTE]: undefined,
      [SOURCE_LINE_START_ATTRIBUTE]: undefined,
      [SOURCE_LINE_END_ATTRIBUTE]: undefined,
    }
  }

  return {
    [SOURCE_LINE_ATTRIBUTE]:
      options?.includeAnchorLine === false ? undefined : span.startLine,
    [SOURCE_LINE_START_ATTRIBUTE]: span.startLine,
    [SOURCE_LINE_END_ATTRIBUTE]: span.endLine,
  }
}
