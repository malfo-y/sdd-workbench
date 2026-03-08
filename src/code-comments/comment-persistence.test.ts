import { describe, expect, it } from 'vitest'
import { parseCodeComments, serializeCodeComments } from './comment-persistence'
import type { CodeComment } from './comment-types'

const SAMPLE_COMMENT: CodeComment = {
  id: 'src/app.ts:1-1:deadbeef:2026-02-22T09:00:00.000Z',
  relativePath: 'src/app.ts',
  startLine: 1,
  endLine: 1,
  body: 'check guard condition',
  anchor: {
    snippet: 'if (!value) return',
    hash: 'deadbeef',
    before: 'function run() {',
    after: 'execute()'
  },
  createdAt: '2026-02-22T09:00:00.000Z',
  exportedAt: '2026-02-22T10:00:00.000Z',
}

const EXACT_OFFSET_COMMENT: CodeComment = {
  id: 'docs/spec.md:3-3:beadbead:2026-03-08T10:00:00.000Z',
  relativePath: 'docs/spec.md',
  startLine: 3,
  endLine: 3,
  body: 'focus on exact token',
  anchor: {
    snippet: 'gamma',
    hash: 'beadbead',
    startOffset: 24,
    endOffset: 29,
  },
  createdAt: '2026-03-08T10:00:00.000Z',
}

describe('comment-persistence', () => {
  it('serializes and parses comments as sorted list', () => {
    const serialized = serializeCodeComments([SAMPLE_COMMENT])
    const parsed = parseCodeComments(serialized)

    expect(parsed.error).toBeNull()
    expect(parsed.comments).toEqual([SAMPLE_COMMENT])
  })

  it('returns fallback for malformed json', () => {
    const parsed = parseCodeComments('{not-valid-json')

    expect(parsed.comments).toEqual([])
    expect(parsed.error).toContain('Invalid comments JSON')
  })

  it('skips invalid entries and keeps valid comments', () => {
    const parsed = parseCodeComments(
      JSON.stringify([
        SAMPLE_COMMENT,
        {
          relativePath: 'src/missing.ts',
        },
      ]),
    )

    expect(parsed.comments).toEqual([SAMPLE_COMMENT])
    expect(parsed.error).toContain('skipped')
  })

  it('treats invalid exportedAt as pending state', () => {
    const parsed = parseCodeComments(
      JSON.stringify([
        {
          ...SAMPLE_COMMENT,
          exportedAt: 'not-a-timestamp',
        },
      ]),
    )

    expect(parsed.error).toBeNull()
    expect(parsed.comments).toHaveLength(1)
    expect(parsed.comments[0]).toMatchObject({
      id: SAMPLE_COMMENT.id,
      relativePath: SAMPLE_COMMENT.relativePath,
      startLine: SAMPLE_COMMENT.startLine,
      endLine: SAMPLE_COMMENT.endLine,
      body: SAMPLE_COMMENT.body,
      anchor: SAMPLE_COMMENT.anchor,
      createdAt: SAMPLE_COMMENT.createdAt,
    })
    expect(parsed.comments[0]).not.toHaveProperty('exportedAt')
  })

  it('round-trips optional exact offset metadata', () => {
    const serialized = serializeCodeComments([EXACT_OFFSET_COMMENT])
    const parsed = parseCodeComments(serialized)

    expect(parsed.error).toBeNull()
    expect(parsed.comments).toEqual([EXACT_OFFSET_COMMENT])
  })
})
