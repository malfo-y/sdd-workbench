import type { CodeComment } from './comment-types'

export type CommentLineCountMap = Map<number, number>
export type CommentLineIndex = Map<string, CommentLineCountMap>

function incrementLineCount(lineCounts: CommentLineCountMap, line: number, count: number) {
  lineCounts.set(line, (lineCounts.get(line) ?? 0) + count)
}

export function buildCommentLineIndex(comments: CodeComment[]): CommentLineIndex {
  const index: CommentLineIndex = new Map()

  for (const comment of comments) {
    const lineCounts = index.get(comment.relativePath) ?? new Map<number, number>()

    for (let line = comment.startLine; line <= comment.endLine; line += 1) {
      incrementLineCount(lineCounts, line, 1)
    }

    index.set(comment.relativePath, lineCounts)
  }

  return index
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

const EMPTY_LINE_COUNT_MAP: ReadonlyMap<number, number> = new Map()
