import type { LineSelectionRange } from '../workspace/workspace-model'
import {
  normalizeSourceOffsetRange,
  type SourceOffsetRange,
} from '../source-selection'
import {
  normalizeCommentSelection,
  sanitizeCommentBody,
  type CodeComment,
  type CodeCommentAnchor,
} from './comment-types'

const MAX_ANCHOR_SNIPPET_CHARS = 600
const MAX_CONTEXT_CHARS = 220
const EMPTY_ANCHOR_SNIPPET_SENTINEL = '__SDD_EMPTY_COMMENT_ANCHOR__'

export type BuildCodeCommentInput = {
  relativePath: string
  selectionRange: LineSelectionRange
  sourceOffsetRange?: SourceOffsetRange
  body: string
  fileContent: string
  createdAt?: string
}

function clampLine(lineNumber: number, maxLine: number): number {
  return Math.min(Math.max(lineNumber, 1), Math.max(maxLine, 1))
}

function trimContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text
  }
  return text.slice(0, maxChars)
}

function trimTrailingContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text
  }
  return text.slice(text.length - maxChars)
}

function normalizeForHash(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function materializeAnchorSnippet(snippet: string): string {
  return snippet.length > 0 ? snippet : EMPTY_ANCHOR_SNIPPET_SENTINEL
}

function hashFnv1a64(text: string): string {
  let hash = 0xcbf29ce484222325n
  const fnvPrime = 0x100000001b3n
  const mask = 0xffffffffffffffffn

  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index))
    hash = (hash * fnvPrime) & mask
  }

  return hash.toString(16).padStart(16, '0')
}

function countNormalizedLines(text: string): number {
  if (!text) {
    return 1
  }

  return text.replace(/\r\n?/g, '\n').split('\n').length
}

function buildSelectionRangeFromOffsets(
  fileContent: string,
  sourceOffsetRange: SourceOffsetRange,
): LineSelectionRange {
  const startOffset = Math.max(0, sourceOffsetRange.startOffset)
  const endOffset = Math.max(startOffset, sourceOffsetRange.endOffset)
  const startLine = countNormalizedLines(fileContent.slice(0, startOffset))
  const selectedText = fileContent.slice(startOffset, endOffset)
  const endLine =
    startLine + Math.max(0, countNormalizedLines(selectedText) - 1)

  return {
    startLine,
    endLine,
  }
}

function scoreAnchorCandidate(
  fileContent: string,
  anchor: CodeCommentAnchor,
  sourceOffsetRange: SourceOffsetRange,
): number {
  let score = 0
  const { startOffset, endOffset } = sourceOffsetRange

  if (anchor.before) {
    const precedingText = normalizeForHash(
      fileContent.slice(
        Math.max(0, startOffset - anchor.before.length - 4),
        startOffset,
      ),
    )
    if (precedingText.endsWith(normalizeForHash(anchor.before))) {
      score += 4
    }
  }

  if (anchor.after) {
    const followingText = normalizeForHash(
      fileContent.slice(
        endOffset,
        endOffset + anchor.after.length + 4,
      ),
    )
    if (followingText.startsWith(normalizeForHash(anchor.after))) {
      score += 4
    }
  }

  return score
}

export function relocateCommentSelection(
  fileContent: string,
  comment: Pick<CodeComment, 'startLine' | 'endLine' | 'anchor'>,
): LineSelectionRange {
  const originalSelection = normalizeCommentSelection({
    startLine: comment.startLine,
    endLine: comment.endLine,
  })
  const anchorSnippet = comment.anchor.snippet
  if (
    !anchorSnippet ||
    anchorSnippet === EMPTY_ANCHOR_SNIPPET_SENTINEL
  ) {
    return originalSelection
  }

  const exactSourceOffsetRange =
    typeof comment.anchor.startOffset === 'number' &&
      typeof comment.anchor.endOffset === 'number'
      ? normalizeSourceOffsetRange(
          {
            startOffset: comment.anchor.startOffset,
            endOffset: comment.anchor.endOffset,
          },
          fileContent.length,
        )
      : null
  if (
    exactSourceOffsetRange &&
    fileContent.slice(
      exactSourceOffsetRange.startOffset,
      exactSourceOffsetRange.endOffset,
    ) === anchorSnippet
  ) {
    return buildSelectionRangeFromOffsets(fileContent, exactSourceOffsetRange)
  }

  const candidateRanges: Array<{
    selectionRange: LineSelectionRange
    score: number
    lineDistance: number
    startOffset: number
  }> = []
  let searchOffset = 0

  while (searchOffset <= fileContent.length) {
    const matchOffset = fileContent.indexOf(anchorSnippet, searchOffset)
    if (matchOffset < 0) {
      break
    }

    const sourceOffsetRange = {
      startOffset: matchOffset,
      endOffset: matchOffset + anchorSnippet.length,
    }
    const selectionRange = buildSelectionRangeFromOffsets(
      fileContent,
      sourceOffsetRange,
    )
    candidateRanges.push({
      selectionRange,
      score: scoreAnchorCandidate(fileContent, comment.anchor, sourceOffsetRange),
      lineDistance:
        Math.abs(selectionRange.startLine - originalSelection.startLine) +
        Math.abs(selectionRange.endLine - originalSelection.endLine),
      startOffset: matchOffset,
    })
    searchOffset = matchOffset + Math.max(anchorSnippet.length, 1)
  }

  if (candidateRanges.length === 0) {
    return originalSelection
  }

  candidateRanges.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score
    }
    if (left.lineDistance !== right.lineDistance) {
      return left.lineDistance - right.lineDistance
    }
    return left.startOffset - right.startOffset
  })

  return candidateRanges[0]?.selectionRange ?? originalSelection
}

export function createCommentAnchor(
  fileContent: string,
  selectionRange: LineSelectionRange,
  sourceOffsetRange?: SourceOffsetRange,
): CodeCommentAnchor {
  const lines = fileContent.replace(/\r\n?/g, '\n').split('\n')
  const normalizedSelection = normalizeCommentSelection(selectionRange)
  const startLine = clampLine(normalizedSelection.startLine, lines.length)
  const endLine = clampLine(normalizedSelection.endLine, lines.length)
  const normalizedSourceOffsetRange = normalizeSourceOffsetRange(
    sourceOffsetRange,
    fileContent.length,
  )

  if (normalizedSourceOffsetRange) {
    const snippet = fileContent
      .slice(
        normalizedSourceOffsetRange.startOffset,
        normalizedSourceOffsetRange.endOffset,
      )
      .slice(0, MAX_ANCHOR_SNIPPET_CHARS)
    const materializedSnippet = materializeAnchorSnippet(snippet)
    const before = trimTrailingContext(
      fileContent.slice(0, normalizedSourceOffsetRange.startOffset),
      MAX_CONTEXT_CHARS,
    )
    const after = trimContext(
      fileContent.slice(normalizedSourceOffsetRange.endOffset),
      MAX_CONTEXT_CHARS,
    )
    const hashInput = [
      startLine,
      endLine,
      normalizedSourceOffsetRange.startOffset,
      normalizedSourceOffsetRange.endOffset,
      before,
      materializedSnippet,
      after,
    ].join('|')
    const hash = hashFnv1a64(normalizeForHash(hashInput))

    return {
      snippet: materializedSnippet,
      hash,
      startOffset: normalizedSourceOffsetRange.startOffset,
      endOffset: normalizedSourceOffsetRange.endOffset,
      ...(before ? { before } : {}),
      ...(after ? { after } : {}),
    }
  }

  const snippet = lines
    .slice(startLine - 1, endLine)
    .join('\n')
    .slice(0, MAX_ANCHOR_SNIPPET_CHARS)
  const materializedSnippet = materializeAnchorSnippet(snippet)
  const before =
    startLine > 1 ? trimContext(lines[startLine - 2] ?? '', MAX_CONTEXT_CHARS) : ''
  const after =
    endLine < lines.length
      ? trimContext(lines[endLine] ?? '', MAX_CONTEXT_CHARS)
      : ''

  const hashInput = [
    startLine,
    endLine,
    before,
    materializedSnippet,
    after,
  ].join('|')
  const hash = hashFnv1a64(normalizeForHash(hashInput))

  return {
    snippet: materializedSnippet,
    hash,
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
  }
}

export function buildCodeComment(input: BuildCodeCommentInput): CodeComment {
  const createdAt = input.createdAt ?? new Date().toISOString()
  const selection = normalizeCommentSelection(input.selectionRange)
  const body = sanitizeCommentBody(input.body)

  if (!body) {
    throw new Error('Comment body is required.')
  }

  const anchor = createCommentAnchor(
    input.fileContent,
    selection,
    input.sourceOffsetRange,
  )

  return {
    id: `${input.relativePath}:${selection.startLine}-${selection.endLine}:${anchor.hash}:${createdAt}`,
    relativePath: input.relativePath,
    startLine: selection.startLine,
    endLine: selection.endLine,
    body,
    anchor,
    createdAt,
  }
}
