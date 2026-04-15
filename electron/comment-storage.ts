type StoredCodeCommentAnchor = {
  snippet: string
  hash: string
  before?: string
  after?: string
  startOffset?: number
  endOffset?: number
}

export type StoredCodeCommentRecord = {
  id: string
  relativePath: string
  startLine: number
  endLine: number
  body: string
  anchor: StoredCodeCommentAnchor
  createdAt: string
  exportedAt?: string
}

export type NormalizeStoredCodeCommentsResult = {
  comments: StoredCodeCommentRecord[]
  error: string | null
  isFatal: boolean
}

export function parseStoredCodeCommentsJson(
  rawJson: string,
): NormalizeStoredCodeCommentsResult {
  if (!rawJson.trim()) {
    return {
      comments: [],
      error: null,
      isFatal: false,
    }
  }

  try {
    const parsed = JSON.parse(rawJson)
    return normalizeStoredCodeComments(parsed)
  } catch {
    return {
      comments: [],
      error: 'Invalid comments JSON.',
      isFatal: true,
    }
  }
}

export function normalizeStoredCodeComments(
  rawValue: unknown,
): NormalizeStoredCodeCommentsResult {
  if (!Array.isArray(rawValue)) {
    return {
      comments: [],
      error: 'Invalid comments file format: expected an array.',
      isFatal: true,
    }
  }

  const comments = rawValue
    .map((entry) => parseStoredCodeComment(entry))
    .filter((entry): entry is StoredCodeCommentRecord => entry !== null)

  if (comments.length !== rawValue.length) {
    return {
      comments,
      error: 'Some comments were skipped due to invalid schema.',
      isFatal: false,
    }
  }

  return {
    comments,
    error: null,
    isFatal: false,
  }
}

export function serializeStoredCodeComments(rawValue: unknown): string {
  const normalized = normalizeStoredCodeComments(rawValue)
  if (normalized.isFatal || normalized.error) {
    throw new Error(normalized.error ?? 'Invalid comments schema.')
  }

  return `${JSON.stringify(normalized.comments, null, 2)}\n`
}

function parseStoredCodeComment(rawComment: unknown): StoredCodeCommentRecord | null {
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
  const anchor = parseStoredCommentAnchor(commentRecord.anchor)
  const exportedAt = parseStoredCommentExportedAt(commentRecord.exportedAt)

  if (!relativePath || !body || !createdAt || !anchor) {
    return null
  }

  const startLine = normalizeStoredCommentLineNumber(commentRecord.startLine)
  const endLine = normalizeStoredCommentLineNumber(commentRecord.endLine)
  if (startLine === null || endLine === null) {
    return null
  }

  const normalizedStartLine = Math.min(startLine, endLine)
  const normalizedEndLine = Math.max(startLine, endLine)
  const id =
    typeof commentRecord.id === 'string' && commentRecord.id.length > 0
      ? commentRecord.id
      : `${relativePath}:${normalizedStartLine}-${normalizedEndLine}:${anchor.hash}:${createdAt}`

  return {
    id,
    relativePath,
    startLine: normalizedStartLine,
    endLine: normalizedEndLine,
    body,
    anchor,
    createdAt,
    ...(exportedAt ? { exportedAt } : {}),
  }
}

function parseStoredCommentAnchor(rawAnchor: unknown): StoredCodeCommentAnchor | null {
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

  const parsedStartOffset = parseOptionalNonNegativeFiniteInteger(
    anchorRecord.startOffset,
  )
  const parsedEndOffset = parseOptionalNonNegativeFiniteInteger(
    anchorRecord.endOffset,
  )
  if (parsedStartOffset === null || parsedEndOffset === null) {
    return null
  }

  const normalizedOffsetRange = normalizeStoredCommentOffsetRange(
    parsedStartOffset,
    parsedEndOffset,
  )
  if (normalizedOffsetRange === null) {
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
    ...(normalizedOffsetRange ?? {}),
  }
}

function normalizeStoredCommentLineNumber(rawValue: unknown): number | null {
  const parsed =
    typeof rawValue === 'number' ? rawValue : Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.max(1, Math.trunc(parsed))
}

function parseOptionalNonNegativeFiniteInteger(
  rawValue: unknown,
): number | undefined | null {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return undefined
  }

  const parsed =
    typeof rawValue === 'number' ? rawValue : Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return null
  }

  const normalized = Math.trunc(parsed)
  return normalized >= 0 ? normalized : null
}

function normalizeStoredCommentOffsetRange(
  startOffset: number | undefined,
  endOffset: number | undefined,
):
  | {
      startOffset: number
      endOffset: number
    }
  | undefined
  | null {
  if (startOffset === undefined || endOffset === undefined) {
    return undefined
  }

  if (startOffset >= endOffset) {
    return null
  }

  return {
    startOffset,
    endOffset,
  }
}

function parseStoredCommentExportedAt(rawValue: unknown): string | undefined {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return undefined
  }

  const parsedTimestamp = Date.parse(rawValue)
  if (Number.isNaN(parsedTimestamp)) {
    return undefined
  }

  return rawValue
}

function sanitizeCommentBody(body: string): string {
  return body.replace(/\r\n?/g, '\n').trim()
}
