import { describe, expect, it } from 'vitest'
import { resolveSpecLink } from './spec-link-utils'

describe('resolveSpecLink', () => {
  it('classifies anchor links', () => {
    expect(resolveSpecLink('#overview', 'docs/main.md')).toEqual({
      kind: 'anchor',
      href: '#overview',
    })
  })

  it('classifies internal citation links before normal anchor handling', () => {
    expect(
      resolveSpecLink('#sdd-citation:src%2Fapp.py:run', 'docs/main.md'),
    ).toEqual({
      kind: 'workspace-symbol',
      href: '#sdd-citation:src%2Fapp.py:run',
      target: {
        targetRelativePath: 'src/app.py',
        symbolName: 'run',
      },
    })
  })

  it('classifies external links', () => {
    expect(resolveSpecLink('https://example.com', 'docs/main.md')).toEqual({
      kind: 'external',
      href: 'https://example.com',
    })
    expect(resolveSpecLink('mailto:hello@example.com', 'docs/main.md')).toEqual({
      kind: 'external',
      href: 'mailto:hello@example.com',
    })
  })

  it('resolves workspace-relative markdown links from active spec path', () => {
    expect(resolveSpecLink('./apify/01-overview.md', '_sdd/spec/main.md')).toEqual({
      kind: 'workspace-file',
      href: './apify/01-overview.md',
      targetRelativePath: '_sdd/spec/apify/01-overview.md',
      lineRange: null,
    })
  })

  it('normalizes parent-directory relative links inside workspace', () => {
    expect(resolveSpecLink('../README.md', '_sdd/spec/main.md')).toEqual({
      kind: 'workspace-file',
      href: '../README.md',
      targetRelativePath: '_sdd/README.md',
      lineRange: null,
    })
  })

  it('keeps file path only when query/hash exists', () => {
    expect(resolveSpecLink('./guide.md?view=full#section', 'docs/main.md')).toEqual({
      kind: 'workspace-file',
      href: './guide.md?view=full#section',
      targetRelativePath: 'docs/guide.md',
      lineRange: null,
    })
  })

  it('parses single-line hash anchors in workspace file links', () => {
    expect(resolveSpecLink('./guide.md#L10', 'docs/main.md')).toEqual({
      kind: 'workspace-file',
      href: './guide.md#L10',
      targetRelativePath: 'docs/guide.md',
      lineRange: {
        startLine: 10,
        endLine: 10,
      },
    })
  })

  it('parses line ranges and normalizes descending values', () => {
    expect(resolveSpecLink('./guide.md#L10-L20', 'docs/main.md')).toEqual({
      kind: 'workspace-file',
      href: './guide.md#L10-L20',
      targetRelativePath: 'docs/guide.md',
      lineRange: {
        startLine: 10,
        endLine: 20,
      },
    })

    expect(resolveSpecLink('./guide.md#L20-L10', 'docs/main.md')).toEqual({
      kind: 'workspace-file',
      href: './guide.md#L20-L10',
      targetRelativePath: 'docs/guide.md',
      lineRange: {
        startLine: 10,
        endLine: 20,
      },
    })
  })

  it('ignores non-line hash fragments for workspace file links', () => {
    expect(resolveSpecLink('./guide.md#overview', 'docs/main.md')).toEqual({
      kind: 'workspace-file',
      href: './guide.md#overview',
      targetRelativePath: 'docs/guide.md',
      lineRange: null,
    })
  })

  it('blocks escape paths outside workspace boundary', () => {
    expect(resolveSpecLink('../../etc/passwd', 'docs/main.md')).toEqual({
      kind: 'unresolved',
      href: '../../etc/passwd',
      reason: 'invalid_path',
    })
  })

  it('treats absolute paths as unsupported', () => {
    expect(resolveSpecLink('/outside.md', 'docs/main.md')).toEqual({
      kind: 'unresolved',
      href: '/outside.md',
      reason: 'unsupported',
    })
  })

  it('returns unresolved when active spec path is missing', () => {
    expect(resolveSpecLink('./any.md', null)).toEqual({
      kind: 'unresolved',
      href: './any.md',
      reason: 'missing_active_spec',
    })
  })
})
