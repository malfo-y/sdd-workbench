import { describe, expect, it } from 'vitest'
import { renderCommentsMarkdown, renderLlmBundle } from './comment-export'
import type { CodeComment } from './comment-types'

const COMMENT_A: CodeComment = {
  id: 'src/b.ts:2-2:bbbbbbbb:2026-02-22T10:00:00.000Z',
  relativePath: 'src/b.ts',
  startLine: 2,
  endLine: 2,
  body: 'rename this var',
  anchor: {
    snippet: 'const value = 1',
    hash: 'bbbbbbbb',
  },
  createdAt: '2026-02-22T10:00:00.000Z',
}

const COMMENT_B: CodeComment = {
  id: 'src/a.ts:1-1:aaaaaaaa:2026-02-22T09:00:00.000Z',
  relativePath: 'src/a.ts',
  startLine: 1,
  endLine: 1,
  body: 'add null check',
  anchor: {
    snippet: 'if (item) {',
    hash: 'aaaaaaaa',
  },
  createdAt: '2026-02-22T09:00:00.000Z',
}

describe('comment-export', () => {
  it('renders _COMMENTS markdown in deterministic order', () => {
    const markdown = renderCommentsMarkdown([COMMENT_A, COMMENT_B])

    const indexA = markdown.indexOf('### src/a.ts:L1-L1')
    const indexB = markdown.indexOf('### src/b.ts:L2-L2')

    expect(indexA).toBeGreaterThan(-1)
    expect(indexB).toBeGreaterThan(-1)
    expect(indexA).toBeLessThan(indexB)
  })

  it('renders LLM bundle with instruction and constraints', () => {
    const bundle = renderLlmBundle({
      instruction: 'Fix all issues and keep tests green.',
      comments: [COMMENT_B],
    })

    expect(bundle).toContain('## Instruction')
    expect(bundle).toContain('Fix all issues and keep tests green.')
    expect(bundle).toContain('## Constraints')
    expect(bundle).toContain('## Comments')
    expect(bundle).toContain('### src/a.ts:L1-L1')
  })
})
