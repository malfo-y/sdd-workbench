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
    expect(markdown).toContain('## Comments')
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

  it('prepends global comments before comment sections when provided', () => {
    const markdown = renderCommentsMarkdown([COMMENT_B], {
      globalComments: '# Project rules\n- Keep it simple',
    })
    const markdownGlobalIndex = markdown.indexOf('## Global Comments')
    const markdownCommentsIndex = markdown.indexOf('## Comments')
    expect(markdownGlobalIndex).toBeGreaterThan(-1)
    expect(markdownCommentsIndex).toBeGreaterThan(-1)
    expect(markdownGlobalIndex).toBeLessThan(markdownCommentsIndex)

    const bundle = renderLlmBundle({
      instruction: 'Apply comments',
      comments: [COMMENT_B],
      globalComments: 'Always preserve API compatibility.',
    })
    const bundleGlobalIndex = bundle.indexOf('## Global Comments')
    const bundleCommentsIndex = bundle.indexOf('## Comments')
    expect(bundleGlobalIndex).toBeGreaterThan(-1)
    expect(bundleCommentsIndex).toBeGreaterThan(-1)
    expect(bundleGlobalIndex).toBeLessThan(bundleCommentsIndex)
  })

  it('omits global comments section when global body is empty', () => {
    const markdown = renderCommentsMarkdown([COMMENT_B], {
      globalComments: '   ',
    })
    expect(markdown).not.toContain('## Global Comments')

    const bundle = renderLlmBundle({
      instruction: 'Apply comments',
      comments: [COMMENT_B],
      globalComments: '\n\n',
    })
    expect(bundle).not.toContain('## Global Comments')
  })

  it('includes "(+ global comments)" in Total comments line when globalComments is provided', () => {
    const markdown = renderCommentsMarkdown([COMMENT_A, COMMENT_B], {
      globalComments: 'Some global context',
    })

    expect(markdown).toContain('Total comments: 2 (+ global comments)')
  })

  it('does not include "(+ global comments)" in Total comments line when globalComments is absent', () => {
    const markdown = renderCommentsMarkdown([COMMENT_A, COMMENT_B])

    expect(markdown).toContain('Total comments: 2')
    expect(markdown).not.toContain('(+ global comments)')
  })

  it('does not include "(+ global comments)" in Total comments line when globalComments is empty/whitespace', () => {
    const markdown = renderCommentsMarkdown([COMMENT_B], {
      globalComments: '   ',
    })

    expect(markdown).toContain('Total comments: 1')
    expect(markdown).not.toContain('(+ global comments)')
  })
})
