import { describe, expect, it } from 'vitest'
import {
  buildCommentLineEntryIndex,
  buildCommentLineIndex,
  getCommentLineEntries,
  getCommentLineCount,
  getCommentLineCounts,
  mapCommentCountsToRenderedSourceLines,
  mapCommentEntriesToRenderedSourceLines,
} from './comment-line-index'
import type { CodeComment } from './comment-types'

const COMMENT_A: CodeComment = {
  id: 'src/a.ts:2-3:aaaa:2026-02-22T00:00:00.000Z',
  relativePath: 'src/a.ts',
  startLine: 2,
  endLine: 3,
  body: 'comment A',
  anchor: {
    snippet: 'line2',
    hash: 'aaaa',
  },
  createdAt: '2026-02-22T00:00:00.000Z',
}

const COMMENT_B: CodeComment = {
  id: 'src/a.ts:3-3:bbbb:2026-02-22T00:01:00.000Z',
  relativePath: 'src/a.ts',
  startLine: 3,
  endLine: 3,
  body: 'comment B',
  anchor: {
    snippet: 'line3',
    hash: 'bbbb',
  },
  createdAt: '2026-02-22T00:01:00.000Z',
}

const COMMENT_C: CodeComment = {
  id: 'docs/spec.md:10-10:cccc:2026-02-22T00:02:00.000Z',
  relativePath: 'docs/spec.md',
  startLine: 10,
  endLine: 10,
  body: 'comment C',
  anchor: {
    snippet: 'section',
    hash: 'cccc',
  },
  createdAt: '2026-02-22T00:02:00.000Z',
}

const COMMENT_D: CodeComment = {
  id: 'src/a.ts:2-3:dddd:2026-02-22T00:03:00.000Z',
  relativePath: 'src/a.ts',
  startLine: 2,
  endLine: 3,
  body: 'comment D',
  anchor: {
    snippet: 'line2',
    hash: 'dddd',
  },
  createdAt: '2026-02-22T00:03:00.000Z',
}

describe('comment-line-index', () => {
  it('builds file/line counts from comment start lines only', () => {
    const index = buildCommentLineIndex([COMMENT_A, COMMENT_B, COMMENT_C])

    expect(getCommentLineCount(index, 'src/a.ts', 1)).toBe(0)
    expect(getCommentLineCount(index, 'src/a.ts', 2)).toBe(1)
    expect(getCommentLineCount(index, 'src/a.ts', 3)).toBe(1)
    expect(getCommentLineCount(index, 'src/a.ts', 4)).toBe(0)
    expect(getCommentLineCount(index, 'docs/spec.md', 10)).toBe(1)
  })

  it('returns empty lookups for missing path', () => {
    const index = buildCommentLineIndex([COMMENT_A])

    expect(getCommentLineCounts(index, null).size).toBe(0)
    expect(getCommentLineCounts(index, 'missing.ts').size).toBe(0)
  })

  it('builds line entry lookup with deterministic ordering on start line', () => {
    const index = buildCommentLineEntryIndex([
      COMMENT_B,
      COMMENT_D,
      COMMENT_A,
      COMMENT_C,
    ])
    const fileEntries = getCommentLineEntries(index, 'src/a.ts')
    const lineTwoEntries = fileEntries.get(2)
    const lineThreeEntries = fileEntries.get(3)

    expect(lineTwoEntries?.map((comment) => comment.id)).toEqual([
      COMMENT_A.id,
      COMMENT_D.id,
    ])
    expect(lineThreeEntries?.map((comment) => comment.id)).toEqual([
      COMMENT_B.id,
    ])
    expect(fileEntries.has(4)).toBe(false)
    expect(getCommentLineEntries(index, 'missing.ts').size).toBe(0)
  })

  it('maps comment counts to rendered source lines with nearest fallback', () => {
    const lineCounts = new Map<number, number>([
      [3, 1],
      [6, 1],
      [10, 2],
      [15, 1],
    ])

    const mapped = mapCommentCountsToRenderedSourceLines(lineCounts, [2, 4, 11, 20])

    expect(mapped.get(2)).toBe(1)
    // 6 ties between 4 and 8-equivalent candidate; lower line wins.
    expect(mapped.get(4)).toBe(1)
    expect(mapped.get(11)).toBe(3)
    expect(mapped.has(20)).toBe(false)
  })

  it('maps comment entries to rendered source lines with nearest fallback', () => {
    const lineEntries = new Map<number, readonly CodeComment[]>([
      [3, [COMMENT_A]],
      [6, [COMMENT_B]],
      [10, [COMMENT_C]],
    ])

    const mapped = mapCommentEntriesToRenderedSourceLines(lineEntries, [2, 4, 11])

    expect(mapped.get(2)?.map((comment) => comment.id)).toEqual([COMMENT_A.id])
    expect(mapped.get(4)?.map((comment) => comment.id)).toEqual([COMMENT_B.id])
    expect(mapped.get(11)?.map((comment) => comment.id)).toEqual([COMMENT_C.id])
  })
})
