import {
  normalizeCommentSelection,
  sanitizeCommentBody,
  sortCodeComments,
  type CodeComment,
  type CodeCommentAnchor,
} from './comment-types'
import { normalizeSourceOffsetRange } from '../source-selection'

type ParsedCommentsResult = {
  comments: CodeComment[]
  error: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseOptionalFiniteNumber(rawValue: unknown): number | undefined | null {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return undefined
  }

  const parsed =
    typeof rawValue === 'number' ? rawValue : Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}

function parseRequiredFiniteLineNumber(rawValue: unknown): number | null {
  const parsed =
    typeof rawValue === 'number' ? rawValue : Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}

function parseAnchor(rawAnchor: unknown): CodeCommentAnchor | null {
  if (!isRecord(rawAnchor)) {
    return null
  }

  const snippet =
    typeof rawAnchor.snippet === 'string' ? rawAnchor.snippet : null
  const hash = typeof rawAnchor.hash === 'string' ? rawAnchor.hash : null

  if (!snippet || !hash) {
    return null
  }

  const parsedStartOffset = parseOptionalFiniteNumber(rawAnchor.startOffset)
  const parsedEndOffset = parseOptionalFiniteNumber(rawAnchor.endOffset)
  if (parsedStartOffset === null || parsedEndOffset === null) {
    return null
  }

  const sourceOffsetRange =
    parsedStartOffset !== undefined && parsedEndOffset !== undefined
      ? normalizeSourceOffsetRange({
          startOffset: parsedStartOffset,
          endOffset: parsedEndOffset,
        })
      : null

  return {
    snippet,
    hash,
    ...(typeof rawAnchor.before === 'string'
      ? { before: rawAnchor.before }
      : {}),
    ...(typeof rawAnchor.after === 'string'
      ? { after: rawAnchor.after }
      : {}),
    ...(sourceOffsetRange
      ? {
          startOffset: sourceOffsetRange.startOffset,
          endOffset: sourceOffsetRange.endOffset,
        }
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
  if (!isRecord(rawComment)) {
    return null
  }

  const relativePath =
    typeof rawComment.relativePath === 'string'
      ? rawComment.relativePath
      : null
  const body =
    typeof rawComment.body === 'string'
      ? sanitizeCommentBody(rawComment.body)
      : null
  const createdAt =
    typeof rawComment.createdAt === 'string' ? rawComment.createdAt : null
  const anchor = parseAnchor(rawComment.anchor)
  const exportedAt = parseExportedAt(rawComment.exportedAt)

  if (!relativePath || !body || !createdAt || !anchor) {
    return null
  }

  const parsedStartLine = parseRequiredFiniteLineNumber(rawComment.startLine)
  const parsedEndLine = parseRequiredFiniteLineNumber(rawComment.endLine)
  if (parsedStartLine === null || parsedEndLine === null) {
    return null
  }

  const normalizedSelection = normalizeCommentSelection({
    startLine: parsedStartLine,
    endLine: parsedEndLine,
  })

  const id =
    typeof rawComment.id === 'string' && rawComment.id.length > 0
      ? rawComment.id
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
