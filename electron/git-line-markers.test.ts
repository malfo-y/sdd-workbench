import { describe, expect, it } from 'vitest'
import { parseGitDiffLineMarkers } from './git-line-markers'

describe('parseGitDiffLineMarkers', () => {
  it('marks pure addition hunks as added lines', () => {
    const diffText = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index e69de29..abcd123 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -4,0 +5,3 @@',
      '+line 1',
      '+line 2',
      '+line 3',
    ].join('\n')

    expect(parseGitDiffLineMarkers(diffText)).toEqual([
      { line: 5, kind: 'added' },
      { line: 6, kind: 'added' },
      { line: 7, kind: 'added' },
    ])
  })

  it('marks overlap section as modified and trailing new section as added', () => {
    const diffText = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index 1111111..2222222 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -10,2 +10,4 @@',
      '-old a',
      '-old b',
      '+new a',
      '+new b',
      '+new c',
      '+new d',
    ].join('\n')

    expect(parseGitDiffLineMarkers(diffText)).toEqual([
      { line: 10, kind: 'modified' },
      { line: 11, kind: 'modified' },
      { line: 12, kind: 'added' },
      { line: 13, kind: 'added' },
    ])
  })

  it('ignores deletion-only hunks for MVP scope', () => {
    const diffText = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index 3333333..4444444 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -20,3 +20,0 @@',
      '-removed a',
      '-removed b',
      '-removed c',
    ].join('\n')

    expect(parseGitDiffLineMarkers(diffText)).toEqual([])
  })

  it('defaults omitted hunk counts to 1', () => {
    const diffText = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index 5555555..6666666 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -3 +3 @@',
      '-before',
      '+after',
    ].join('\n')

    expect(parseGitDiffLineMarkers(diffText)).toEqual([
      { line: 3, kind: 'modified' },
    ])
  })
})
