import { describe, expect, it } from 'vitest'
import { extractMarkdownHeadings } from './markdown-utils'

describe('extractMarkdownHeadings', () => {
  it('extracts h1-h3 headings with deterministic ids', () => {
    const headings = extractMarkdownHeadings(
      '# Title\n## Intro\n### Setup\n#### Ignored',
      3,
    )

    expect(headings).toEqual([
      { depth: 1, text: 'Title', id: 'title' },
      { depth: 2, text: 'Intro', id: 'intro' },
      { depth: 3, text: 'Setup', id: 'setup' },
    ])
  })

  it('ignores headings inside fenced code blocks', () => {
    const headings = extractMarkdownHeadings(
      '# Start\n```md\n# hidden\n```\n## End',
      3,
    )

    expect(headings).toEqual([
      { depth: 1, text: 'Start', id: 'start' },
      { depth: 2, text: 'End', id: 'end' },
    ])
  })
})
