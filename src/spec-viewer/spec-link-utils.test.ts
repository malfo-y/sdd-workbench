import { describe, expect, it } from 'vitest'
import { resolveSpecLink } from './spec-link-utils'

describe('resolveSpecLink', () => {
  it('classifies anchor links', () => {
    expect(resolveSpecLink('#overview', 'docs/main.md')).toEqual({
      kind: 'anchor',
      href: '#overview',
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
    })
  })

  it('normalizes parent-directory relative links inside workspace', () => {
    expect(resolveSpecLink('../README.md', '_sdd/spec/main.md')).toEqual({
      kind: 'workspace-file',
      href: '../README.md',
      targetRelativePath: '_sdd/README.md',
    })
  })

  it('keeps file path only when query/hash exists', () => {
    expect(resolveSpecLink('./guide.md?view=full#section', 'docs/main.md')).toEqual({
      kind: 'workspace-file',
      href: './guide.md?view=full#section',
      targetRelativePath: 'docs/guide.md',
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
