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

const COMMENT_MULTILINE: CodeComment = {
  id: 'src/c.ts:5-12:cccccccc:2026-02-22T11:00:00.000Z',
  relativePath: 'src/c.ts',
  startLine: 5,
  endLine: 12,
  body: 'refactor this function',
  anchor: {
    snippet: 'function foo() {\n  bar()\n  baz()',
    hash: 'cccccccc',
  },
  createdAt: '2026-02-22T11:00:00.000Z',
}

describe('comment-export', () => {
  it('renders _COMMENTS markdown in deterministic order', () => {
    const markdown = renderCommentsMarkdown([COMMENT_A, COMMENT_B])

    const indexA = markdown.indexOf('### src/a.ts:L1')
    const indexB = markdown.indexOf('### src/b.ts:L2')

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
    expect(bundle).toContain('### src/a.ts:L1')
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

  // AC1: anchor.before, anchor.after not in output
  it('does not include anchor.before or anchor.after in output', () => {
    const commentWithContext: CodeComment = {
      ...COMMENT_A,
      anchor: { ...COMMENT_A.anchor, before: 'line before', after: 'line after' },
    }
    const markdown = renderCommentsMarkdown([commentWithContext])
    expect(markdown).not.toContain('anchor.before')
    expect(markdown).not.toContain('anchor.after')
    expect(markdown).not.toContain('line before')
    expect(markdown).not.toContain('line after')
  })

  // AC2: anchor.hash not in output
  it('does not include anchor.hash in output', () => {
    const markdown = renderCommentsMarkdown([COMMENT_A])
    expect(markdown).not.toContain('anchor.hash')
    expect(markdown).not.toContain('bbbbbbbb')
  })

  // AC3: snippet first line shown as blockquote
  it('renders snippet first line as blockquote', () => {
    const markdown = renderCommentsMarkdown([COMMENT_A])
    expect(markdown).toContain('> const value = 1')
  })

  it('renders only the first line of a multiline snippet as blockquote', () => {
    const markdown = renderCommentsMarkdown([COMMENT_MULTILINE])
    expect(markdown).toContain('> function foo() {')
    expect(markdown).not.toContain('> bar()')
    expect(markdown).not.toContain('bar()')
    expect(markdown).not.toContain('baz()')
  })

  // AC4: multiline header includes range
  it('renders multiline comment header with range notation', () => {
    const markdown = renderCommentsMarkdown([COMMENT_MULTILINE])
    expect(markdown).toContain('### src/c.ts:L5 (~L12)')
  })

  // AC5: single line comment header uses simple L format
  it('renders single line comment header without range', () => {
    const markdown = renderCommentsMarkdown([COMMENT_A])
    expect(markdown).toContain('### src/b.ts:L2')
    expect(markdown).not.toContain('### src/b.ts:L2-')
    expect(markdown).not.toContain('### src/b.ts:L2 (~')
  })

  // createdAt not in output
  it('does not include createdAt in comment block output', () => {
    const markdown = renderCommentsMarkdown([COMMENT_A])
    expect(markdown).not.toContain('createdAt')
    expect(markdown).not.toContain('2026-02-22T10:00:00.000Z')
  })

  // snippet empty case
  it('omits snippet blockquote when snippet is empty', () => {
    const commentNoSnippet: CodeComment = {
      ...COMMENT_A,
      anchor: { ...COMMENT_A.anchor, snippet: '' },
    }
    const markdown = renderCommentsMarkdown([commentNoSnippet])
    expect(markdown).not.toContain('> ')
    expect(markdown).toContain('rename this var')
  })

  it('renders multiline comment correctly in LLM bundle', () => {
    const bundle = renderLlmBundle({
      instruction: 'Refactor this',
      comments: [COMMENT_MULTILINE],
    })
    expect(bundle).toContain('### src/c.ts:L5 (~L12)')
    expect(bundle).toContain('> function foo() {')
    expect(bundle).not.toContain('bar()')
    expect(bundle).not.toContain('cccccccc')
  })
})
