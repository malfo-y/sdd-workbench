import { describe, expect, it } from 'vitest'
import { parseGitStatusPorcelain } from './git-file-statuses'

describe('parseGitStatusPorcelain', () => {
  it('returns empty map for empty output', () => {
    expect(parseGitStatusPorcelain('')).toEqual({})
  })

  it('returns empty map for whitespace-only output', () => {
    expect(parseGitStatusPorcelain('  \n  \n')).toEqual({})
  })

  it('parses untracked files (??) as untracked', () => {
    const stdout = '?? src/new-file.ts\n?? docs/readme.md\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'src/new-file.ts': 'untracked',
      'docs/readme.md': 'untracked',
    })
  })

  it('parses staged added files (A) as added', () => {
    const stdout = 'A  src/added.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'src/added.ts': 'added',
    })
  })

  it('parses staged added + work-tree modified (AM) as added', () => {
    const stdout = 'AM src/added-modified.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'src/added-modified.ts': 'added',
    })
  })

  it('parses staged modified files (M ) as modified', () => {
    const stdout = 'M  src/modified.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'src/modified.ts': 'modified',
    })
  })

  it('parses work-tree modified files ( M) as modified', () => {
    const stdout = ' M src/modified.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'src/modified.ts': 'modified',
    })
  })

  it('parses both-modified files (MM) as modified', () => {
    const stdout = 'MM src/both-modified.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'src/both-modified.ts': 'modified',
    })
  })

  it('parses renamed files (R) with arrow as added (new path)', () => {
    const stdout = 'R  old-name.ts -> new-name.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'new-name.ts': 'added',
    })
  })

  it('skips deleted files (D)', () => {
    const stdout = 'D  src/deleted.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({})
  })

  it('skips work-tree deleted files ( D)', () => {
    const stdout = ' D src/deleted.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({})
  })

  it('parses type change (T) as modified', () => {
    const stdout = 'T  src/type-changed.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'src/type-changed.ts': 'modified',
    })
  })

  it('handles mixed statuses', () => {
    const stdout = [
      '?? untracked.ts',
      'A  staged-new.ts',
      'M  staged-modified.ts',
      ' M worktree-modified.ts',
      'D  deleted.ts',
      'R  old.ts -> renamed.ts',
    ].join('\n')

    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'untracked.ts': 'untracked',
      'staged-new.ts': 'added',
      'staged-modified.ts': 'modified',
      'worktree-modified.ts': 'modified',
      'renamed.ts': 'added',
    })
  })

  it('handles paths with spaces', () => {
    const stdout = '?? src/my file.ts\nM  src/another file.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'src/my file.ts': 'untracked',
      'src/another file.ts': 'modified',
    })
  })

  it('skips lines that are too short', () => {
    const stdout = 'XY\n?? valid.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'valid.ts': 'untracked',
    })
  })

  it('handles trailing newline gracefully', () => {
    const stdout = 'M  src/file.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'src/file.ts': 'modified',
    })
  })

  it('handles copied files (C) as added', () => {
    const stdout = 'C  src/original.ts -> src/copy.ts\n'
    expect(parseGitStatusPorcelain(stdout)).toEqual({
      'src/copy.ts': 'added',
    })
  })
})
