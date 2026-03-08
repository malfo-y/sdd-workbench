import { describe, expect, it } from 'vitest'
import { buildCodeComment, createCommentAnchor } from './comment-anchor'

describe('comment-anchor', () => {
  it('creates deterministic hash for same selection and content', () => {
    const content = 'one\ntwo\nthree\nfour'
    const first = createCommentAnchor(content, {
      startLine: 2,
      endLine: 3,
    })
    const second = createCommentAnchor(content, {
      startLine: 2,
      endLine: 3,
    })

    expect(first.hash).toBe(second.hash)
    expect(first.snippet).toBe('two\nthree')
  })

  it('normalizes reversed or invalid ranges', () => {
    const anchor = createCommentAnchor('alpha\nbeta\ngamma', {
      startLine: 9,
      endLine: -2,
    })

    expect(anchor.snippet).toBe('alpha\nbeta\ngamma')
    expect(anchor.hash).toHaveLength(8)
  })

  it('builds comment object with normalized body and stable id', () => {
    const comment = buildCodeComment({
      relativePath: 'src/app.ts',
      selectionRange: {
        startLine: 3,
        endLine: 1,
      },
      body: '  improve this branch  ',
      fileContent: 'a\nb\nc',
      createdAt: '2026-02-22T09:00:00.000Z',
    })

    expect(comment.startLine).toBe(1)
    expect(comment.endLine).toBe(3)
    expect(comment.body).toBe('improve this branch')
    expect(comment.id).toContain('src/app.ts:1-3:')
    expect(comment.id).toContain(':2026-02-22T09:00:00.000Z')
  })

  it('stores exact offset metadata when provided', () => {
    const content = 'alpha **beta** gamma'
    const startOffset = content.indexOf('beta')
    const endOffset = startOffset + 'beta'.length

    const anchor = createCommentAnchor(
      content,
      {
        startLine: 1,
        endLine: 1,
      },
      {
        startOffset,
        endOffset,
      },
    )

    expect(anchor).toMatchObject({
      snippet: 'beta',
      startOffset,
      endOffset,
    })
    expect(anchor.hash).toHaveLength(8)
  })
})
