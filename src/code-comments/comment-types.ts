export type CodeCommentAnchor = {
  snippet: string
  hash: string
  before?: string
  after?: string
}

export type CodeComment = {
  id: string
  relativePath: string
  startLine: number
  endLine: number
  body: string
  anchor: CodeCommentAnchor
  createdAt: string
  exportedAt?: string
}

export type CodeCommentSelection = {
  startLine: number
  endLine: number
}

export function normalizeCommentLineNumber(lineNumber: number): number {
  if (!Number.isFinite(lineNumber)) {
    return 1
  }

  return Math.max(1, Math.trunc(lineNumber))
}

export function normalizeCommentSelection(
  selection: CodeCommentSelection,
): CodeCommentSelection {
  const startLine = normalizeCommentLineNumber(selection.startLine)
  const endLine = normalizeCommentLineNumber(selection.endLine)

  if (startLine <= endLine) {
    return {
      startLine,
      endLine,
    }
  }

  return {
    startLine: endLine,
    endLine: startLine,
  }
}

export function sanitizeCommentBody(body: string): string {
  return body.replace(/\r\n?/g, '\n').trim()
}

export function compareCodeComments(left: CodeComment, right: CodeComment): number {
  const byPath = left.relativePath.localeCompare(right.relativePath)
  if (byPath !== 0) {
    return byPath
  }

  if (left.startLine !== right.startLine) {
    return left.startLine - right.startLine
  }

  if (left.endLine !== right.endLine) {
    return left.endLine - right.endLine
  }

  const byCreatedAt = left.createdAt.localeCompare(right.createdAt)
  if (byCreatedAt !== 0) {
    return byCreatedAt
  }

  return left.id.localeCompare(right.id)
}

export function sortCodeComments(comments: CodeComment[]): CodeComment[] {
  return [...comments].sort(compareCodeComments)
}
