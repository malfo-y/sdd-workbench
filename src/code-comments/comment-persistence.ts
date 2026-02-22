import {
  normalizeCommentSelection,
  sanitizeCommentBody,
  sortCodeComments,
  type CodeComment,
  type CodeCommentAnchor,
} from './comment-types'

type ParsedCommentsResult = {
  comments: CodeComment[]
  error: string | null
}

function parseAnchor(rawAnchor: unknown): CodeCommentAnchor | null {
  if (!rawAnchor || typeof rawAnchor !== 'object') {
    return null
  }
  const anchorRecord = rawAnchor as Record<string, unknown>

  const snippet =
    typeof anchorRecord.snippet === 'string' ? anchorRecord.snippet : null
  const hash = typeof anchorRecord.hash === 'string' ? anchorRecord.hash : null

  if (!snippet || !hash) {
    return null
  }

  return {
    snippet,
    hash,
    ...(typeof anchorRecord.before === 'string'
      ? { before: anchorRecord.before }
      : {}),
    ...(typeof anchorRecord.after === 'string'
      ? { after: anchorRecord.after }
      : {}),
  }
}

function parseExportedAt(rawValue: unknown): string | undefined {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return undefined
  }

  const parsedTimestamp = Date.parse(rawValue)
  if (Number.isNaN(parsedTimestamp)) {
    return undefined
  }

  return rawValue
}

function parseComment(rawComment: unknown): CodeComment | null {
  if (!rawComment || typeof rawComment !== 'object') {
    return null
  }
  const commentRecord = rawComment as Record<string, unknown>

  const relativePath =
    typeof commentRecord.relativePath === 'string'
      ? commentRecord.relativePath
      : null
  const body =
    typeof commentRecord.body === 'string'
      ? sanitizeCommentBody(commentRecord.body)
      : null
  const createdAt =
    typeof commentRecord.createdAt === 'string' ? commentRecord.createdAt : null
  const anchor = parseAnchor(commentRecord.anchor)
  const exportedAt = parseExportedAt(commentRecord.exportedAt)

  if (!relativePath || !body || !createdAt || !anchor) {
    return null
  }

  const normalizedSelection = normalizeCommentSelection({
    startLine:
      typeof commentRecord.startLine === 'number'
        ? commentRecord.startLine
        : Number(commentRecord.startLine),
    endLine:
      typeof commentRecord.endLine === 'number'
        ? commentRecord.endLine
        : Number(commentRecord.endLine),
  })

  const id =
    typeof commentRecord.id === 'string' && commentRecord.id.length > 0
      ? commentRecord.id
      : `${relativePath}:${normalizedSelection.startLine}-${normalizedSelection.endLine}:${anchor.hash}:${createdAt}`

  return {
    id,
    relativePath,
    startLine: normalizedSelection.startLine,
    endLine: normalizedSelection.endLine,
    body,
    anchor,
    createdAt,
    ...(exportedAt ? { exportedAt } : {}),
  }
}

export function normalizeCodeComments(rawValue: unknown): ParsedCommentsResult {
  if (!Array.isArray(rawValue)) {
    return {
      comments: [],
      error: 'Invalid comments file format: expected an array.',
    }
  }

  const comments = sortCodeComments(
    rawValue
      .map((entry) => parseComment(entry))
      .filter((entry): entry is CodeComment => entry !== null),
  )

  if (comments.length !== rawValue.length) {
    return {
      comments,
      error: 'Some comments were skipped due to invalid schema.',
    }
  }

  return {
    comments,
    error: null,
  }
}

export function parseCodeComments(rawJson: string): ParsedCommentsResult {
  if (!rawJson.trim()) {
    return {
      comments: [],
      error: null,
    }
  }

  try {
    const parsed = JSON.parse(rawJson)
    return normalizeCodeComments(parsed)
  } catch {
    return {
      comments: [],
      error: 'Invalid comments JSON.',
    }
  }
}

export function serializeCodeComments(comments: CodeComment[]): string {
  return `${JSON.stringify(sortCodeComments(comments), null, 2)}\n`
}
