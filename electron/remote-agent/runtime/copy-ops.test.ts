import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { workspaceCopyEntries, incrementFileName } from './copy-ops'

// ─── incrementFileName ────────────────────────────────────────────────────────

describe('incrementFileName', () => {
  it('returns the name unchanged when it does not exist in the list', () => {
    expect(incrementFileName('file.txt', [])).toBe('file.txt')
    expect(incrementFileName('file.txt', ['other.txt'])).toBe('file.txt')
  })

  it('appends (1) when the name conflicts', () => {
    expect(incrementFileName('file.txt', ['file.txt'])).toBe('file (1).txt')
  })

  it('increments counter until a free name is found', () => {
    expect(
      incrementFileName('file.txt', ['file.txt', 'file (1).txt', 'file (2).txt']),
    ).toBe('file (3).txt')
  })

  it('handles files without extension', () => {
    expect(incrementFileName('README', ['README'])).toBe('README (1)')
  })

  it('handles files where dot is the first character (hidden files)', () => {
    // dotIndex === 0 → treated as no extension
    expect(incrementFileName('.gitignore', ['.gitignore'])).toBe('.gitignore (1)')
  })

  it('handles extension with multiple dots (only last dot counts)', () => {
    expect(incrementFileName('archive.tar.gz', ['archive.tar.gz'])).toBe(
      'archive.tar (1).gz',
    )
  })
})

// ─── workspaceCopyEntries ─────────────────────────────────────────────────────

describe('workspaceCopyEntries', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-ops-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function ctx() {
    return { rootPath: tmpDir }
  }

  it('copies a single file to destDir', () => {
    // arrange
    fs.writeFileSync(path.join(tmpDir, 'hello.txt'), 'hello')

    // act
    const result = workspaceCopyEntries(ctx(), {
      entries: [{ relativePath: 'hello.txt', kind: 'file' }],
      destDir: '',
    })

    // assert
    expect(result.ok).toBe(true)
    expect(result.copiedPaths).toHaveLength(1)
    // file still exists (copy, not move) and dest copy exists
    expect(fs.existsSync(path.join(tmpDir, 'hello.txt'))).toBe(true)
  })

  it('copies a file into a subdirectory destDir', () => {
    // arrange
    fs.mkdirSync(path.join(tmpDir, 'src'))
    fs.writeFileSync(path.join(tmpDir, 'src', 'data.ts'), 'export {}')
    fs.mkdirSync(path.join(tmpDir, 'dest'))

    const result = workspaceCopyEntries(ctx(), {
      entries: [{ relativePath: 'src/data.ts', kind: 'file' }],
      destDir: 'dest',
    })

    expect(result.ok).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'dest', 'data.ts'))).toBe(true)
  })

  it('copies a directory recursively', () => {
    // arrange
    fs.mkdirSync(path.join(tmpDir, 'mydir'))
    fs.writeFileSync(path.join(tmpDir, 'mydir', 'a.txt'), 'a')
    fs.writeFileSync(path.join(tmpDir, 'mydir', 'b.txt'), 'b')

    const result = workspaceCopyEntries(ctx(), {
      entries: [{ relativePath: 'mydir', kind: 'directory' }],
      destDir: '',
    })

    expect(result.ok).toBe(true)
    // A copy with incremented name should exist
    expect(result.copiedPaths).toHaveLength(1)
    const copiedName = path.basename(result.copiedPaths![0])
    expect(copiedName).not.toBe('mydir') // original name conflicts
    const copiedPath = path.join(tmpDir, copiedName)
    expect(fs.existsSync(path.join(copiedPath, 'a.txt'))).toBe(true)
    expect(fs.existsSync(path.join(copiedPath, 'b.txt'))).toBe(true)
  })

  it('resolves name conflicts with incrementFileName', () => {
    // arrange: create hello.txt already in dest
    fs.writeFileSync(path.join(tmpDir, 'hello.txt'), 'original')
    // source file that also produces 'hello.txt' in dest
    // (same file copied to same dir → name conflict)
    fs.mkdirSync(path.join(tmpDir, 'sub'))
    fs.writeFileSync(path.join(tmpDir, 'sub', 'hello.txt'), 'copy')

    const result = workspaceCopyEntries(ctx(), {
      entries: [{ relativePath: 'sub/hello.txt', kind: 'file' }],
      destDir: '',
    })

    expect(result.ok).toBe(true)
    // original untouched
    expect(fs.readFileSync(path.join(tmpDir, 'hello.txt'), 'utf8')).toBe('original')
    // copy renamed
    expect(fs.existsSync(path.join(tmpDir, 'hello (1).txt'))).toBe(true)
  })

  it('copies multiple entries', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'a')
    fs.writeFileSync(path.join(tmpDir, 'b.txt'), 'b')
    fs.mkdirSync(path.join(tmpDir, 'out'))

    const result = workspaceCopyEntries(ctx(), {
      entries: [
        { relativePath: 'a.txt', kind: 'file' },
        { relativePath: 'b.txt', kind: 'file' },
      ],
      destDir: 'out',
    })

    expect(result.ok).toBe(true)
    expect(result.copiedPaths).toHaveLength(2)
    expect(fs.existsSync(path.join(tmpDir, 'out', 'a.txt'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'out', 'b.txt'))).toBe(true)
  })

  it('returns ok:false when source does not exist', () => {
    const result = workspaceCopyEntries(ctx(), {
      entries: [{ relativePath: 'nonexistent.txt', kind: 'file' }],
      destDir: '',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('returns ok:false when destDir is outside workspace', () => {
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'x')

    const result = workspaceCopyEntries(ctx(), {
      entries: [{ relativePath: 'file.txt', kind: 'file' }],
      destDir: '../escape',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/denied|outside|escape/i)
  })

  it('returns ok:false when entry path is outside workspace', () => {
    const result = workspaceCopyEntries(ctx(), {
      entries: [{ relativePath: '../outside.txt', kind: 'file' }],
      destDir: '',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/denied|outside/i)
  })
})
