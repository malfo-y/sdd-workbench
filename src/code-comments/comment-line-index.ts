import { compareCodeComments, type CodeComment } from './comment-types'
import { relocateCommentSelection } from './comment-anchor'

export type CommentLineCountMap = Map<number, number>
export type CommentLineIndex = Map<string, CommentLineCountMap>
export type CommentLineEntryMap = Map<number, readonly CodeComment[]>
export type CommentLineEntryIndex = Map<string, Map<number, CodeComment[]>>
export type CommentDisplayMaps = {
  counts: ReadonlyMap<number, number>
  entries: ReadonlyMap<number, readonly CodeComment[]>
}

function incrementLineCount(lineCounts: CommentLineCountMap, line: number, count: number) {
  lineCounts.set(line, (lineCounts.get(line) ?? 0) + count)
}

function appendLineComment(
  lineEntries: Map<number, CodeComment[]>,
  line: number,
  comment: CodeComment,
) {
  const existingEntries = lineEntries.get(line)
  if (existingEntries) {
    existingEntries.push(comment)
    return
  }

  lineEntries.set(line, [comment])
}

export function buildCommentLineIndex(comments: CodeComment[]): CommentLineIndex {
  const index: CommentLineIndex = new Map()

  for (const comment of comments) {
    const lineCounts = index.get(comment.relativePath) ?? new Map<number, number>()
    incrementLineCount(lineCounts, comment.startLine, 1)

    index.set(comment.relativePath, lineCounts)
  }

  return index
}

export function buildCommentLineEntryIndex(
  comments: CodeComment[],
): CommentLineEntryIndex {
  const index: CommentLineEntryIndex = new Map()
  const sortedComments = [...comments].sort(compareCodeComments)

  for (const comment of sortedComments) {
    const lineEntries = index.get(comment.relativePath) ?? new Map<number, CodeComment[]>()
    appendLineComment(lineEntries, comment.startLine, comment)
    index.set(comment.relativePath, lineEntries)
  }

  return index
}

function relocateCommentForDisplay(
  comment: CodeComment,
  fileContent: string | null,
): CodeComment {
  if (typeof fileContent !== 'string') {
    return comment
  }

  const relocatedSelection = relocateCommentSelection(fileContent, comment)
  if (
    relocatedSelection.startLine === comment.startLine &&
    relocatedSelection.endLine === comment.endLine
  ) {
    return comment
  }

  return {
    ...comment,
    startLine: relocatedSelection.startLine,
    endLine: relocatedSelection.endLine,
  }
}

export function buildCommentDisplayMaps(
  comments: readonly CodeComment[],
  relativePath: string | null,
  fileContent: string | null,
): CommentDisplayMaps {
  if (!relativePath) {
    return {
      counts: EMPTY_LINE_COUNT_MAP,
      entries: EMPTY_LINE_ENTRY_MAP,
    }
  }

  const filteredComments = comments
    .filter((comment) => comment.relativePath === relativePath)
    .map((comment) => relocateCommentForDisplay(comment, fileContent))

  return {
    counts: getCommentLineCounts(
      buildCommentLineIndex(filteredComments),
      relativePath,
    ),
    entries: getCommentLineEntries(
      buildCommentLineEntryIndex(filteredComments),
      relativePath,
    ),
  }
}

export function getCommentLineCounts(
  index: CommentLineIndex,
  relativePath: string | null,
): ReadonlyMap<number, number> {
  if (!relativePath) {
    return EMPTY_LINE_COUNT_MAP
  }

  return index.get(relativePath) ?? EMPTY_LINE_COUNT_MAP
}

export function getCommentLineCount(
  index: CommentLineIndex,
  relativePath: string | null,
  line: number,
): number {
  return getCommentLineCounts(index, relativePath).get(line) ?? 0
}

export function getCommentLineEntries(
  index: CommentLineEntryIndex,
  relativePath: string | null,
): ReadonlyMap<number, readonly CodeComment[]> {
  if (!relativePath) {
    return EMPTY_LINE_ENTRY_MAP
  }

  return index.get(relativePath) ?? EMPTY_LINE_ENTRY_MAP
}

export function findMostRecentCommentInSelectionRange(
  commentLineEntries: ReadonlyMap<number, readonly CodeComment[]>,
  selectionRange: {
    startLine: number
    endLine: number
  },
): CodeComment | null {
  const startLine = Math.max(
    1,
    Math.min(selectionRange.startLine, selectionRange.endLine),
  )
  const endLine = Math.max(
    1,
    Math.max(selectionRange.startLine, selectionRange.endLine),
  )
  const matchingComments: CodeComment[] = []

  for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
    const lineComments = commentLineEntries.get(lineNumber)
    if (!lineComments || lineComments.length === 0) {
      continue
    }

    matchingComments.push(...lineComments)
  }

  if (matchingComments.length === 0) {
    return null
  }

  return [...matchingComments].sort(compareCodeComments).at(-1) ?? null
}

function findNearestRenderedSourceLine(
  sortedRenderedLines: readonly number[],
  sourceLine: number,
): number | null {
  if (sortedRenderedLines.length === 0) {
    return null
  }

  let low = 0
  let high = sortedRenderedLines.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = sortedRenderedLines[mid]
    if (candidate === sourceLine) {
      return candidate
    }
    if (candidate < sourceLine) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  const upperCandidate =
    low < sortedRenderedLines.length ? sortedRenderedLines[low] : null
  const lowerCandidate = high >= 0 ? sortedRenderedLines[high] : null

  if (upperCandidate === null) {
    return lowerCandidate
  }
  if (lowerCandidate === null) {
    return upperCandidate
  }

  const upperDistance = Math.abs(upperCandidate - sourceLine)
  const lowerDistance = Math.abs(sourceLine - lowerCandidate)

  if (lowerDistance <= upperDistance) {
    return lowerCandidate
  }
  return upperCandidate
}

export function mapCommentCountsToRenderedSourceLines(
  commentLineCounts: ReadonlyMap<number, number>,
  renderedSourceLines: readonly number[],
): Map<number, number> {
  const uniqueRenderedLines = Array.from(new Set(renderedSourceLines)).sort(
    (left, right) => left - right,
  )
  const renderedLineSet = new Set(uniqueRenderedLines)
  const mappedCounts = new Map<number, number>()

  for (const [commentLine, count] of commentLineCounts.entries()) {
    if (renderedLineSet.has(commentLine)) {
      incrementLineCount(mappedCounts, commentLine, count)
      continue
    }

    const nearestLine = findNearestRenderedSourceLine(
      uniqueRenderedLines,
      commentLine,
    )
    if (nearestLine === null) {
      continue
    }

    incrementLineCount(mappedCounts, nearestLine, count)
  }

  return mappedCounts
}

export function mapCommentEntriesToRenderedSourceLines(
  commentLineEntries: ReadonlyMap<number, readonly CodeComment[]>,
  renderedSourceLines: readonly number[],
): Map<number, readonly CodeComment[]> {
  const uniqueRenderedLines = Array.from(new Set(renderedSourceLines)).sort(
    (left, right) => left - right,
  )
  const renderedLineSet = new Set(uniqueRenderedLines)
  const mappedEntries = new Map<number, CodeComment[]>()

  for (const [commentLine, entries] of commentLineEntries.entries()) {
    if (entries.length === 0) {
      continue
    }

    const mappedLine = renderedLineSet.has(commentLine)
      ? commentLine
      : findNearestRenderedSourceLine(uniqueRenderedLines, commentLine)
    if (mappedLine === null) {
      continue
    }

    const nextEntries = mappedEntries.get(mappedLine) ?? []
    nextEntries.push(...entries)
    mappedEntries.set(mappedLine, nextEntries)
  }

  for (const [mappedLine, entries] of mappedEntries.entries()) {
    mappedEntries.set(
      mappedLine,
      [...entries].sort(compareCodeComments),
    )
  }

  return mappedEntries
}

const EMPTY_LINE_COUNT_MAP: ReadonlyMap<number, number> = new Map()
const EMPTY_LINE_ENTRY_MAP: ReadonlyMap<number, readonly CodeComment[]> = new Map()
