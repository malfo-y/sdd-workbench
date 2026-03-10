import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { copyEntries } from './copy-entries'

describe('copyEntries', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'copy-entries-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('copies a file to the destination directory', async () => {
    // Setup: create source file
    await fs.writeFile(path.join(tmpDir, 'hello.txt'), 'hello content')
    await fs.mkdir(path.join(tmpDir, 'dest'))

    await copyEntries({
      rootPath: tmpDir,
      entries: [{ relativePath: 'hello.txt', kind: 'file' }],
      destDir: 'dest',
    })

    const content = await fs.readFile(path.join(tmpDir, 'dest', 'hello.txt'), 'utf-8')
    expect(content).toBe('hello content')
  })

  it('copies a directory recursively to the destination directory', async () => {
    // Setup: create source directory with nested content
    await fs.mkdir(path.join(tmpDir, 'src-dir'))
    await fs.mkdir(path.join(tmpDir, 'src-dir', 'sub'))
    await fs.writeFile(path.join(tmpDir, 'src-dir', 'file.txt'), 'file content')
    await fs.writeFile(path.join(tmpDir, 'src-dir', 'sub', 'nested.txt'), 'nested content')
    await fs.mkdir(path.join(tmpDir, 'dest'))

    await copyEntries({
      rootPath: tmpDir,
      entries: [{ relativePath: 'src-dir', kind: 'directory' }],
      destDir: 'dest',
    })

    const fileContent = await fs.readFile(path.join(tmpDir, 'dest', 'src-dir', 'file.txt'), 'utf-8')
    expect(fileContent).toBe('file content')
    const nestedContent = await fs.readFile(
      path.join(tmpDir, 'dest', 'src-dir', 'sub', 'nested.txt'),
      'utf-8',
    )
    expect(nestedContent).toBe('nested content')
  })

  it('resolves name conflict by auto-numbering for files', async () => {
    // Setup: dest already has hello.txt
    await fs.writeFile(path.join(tmpDir, 'hello.txt'), 'original')
    await fs.mkdir(path.join(tmpDir, 'dest'))
    await fs.writeFile(path.join(tmpDir, 'dest', 'hello.txt'), 'existing')

    await copyEntries({
      rootPath: tmpDir,
      entries: [{ relativePath: 'hello.txt', kind: 'file' }],
      destDir: 'dest',
    })

    // Original should remain untouched
    const existing = await fs.readFile(path.join(tmpDir, 'dest', 'hello.txt'), 'utf-8')
    expect(existing).toBe('existing')

    // Copied file should be renamed
    const copied = await fs.readFile(path.join(tmpDir, 'dest', 'hello (1).txt'), 'utf-8')
    expect(copied).toBe('original')
  })

  it('resolves name conflict by auto-numbering for directories', async () => {
    // Setup: dest already has src-dir
    await fs.mkdir(path.join(tmpDir, 'src-dir'))
    await fs.writeFile(path.join(tmpDir, 'src-dir', 'file.txt'), 'new content')
    await fs.mkdir(path.join(tmpDir, 'dest'))
    await fs.mkdir(path.join(tmpDir, 'dest', 'src-dir'))
    await fs.writeFile(path.join(tmpDir, 'dest', 'src-dir', 'old.txt'), 'old content')

    await copyEntries({
      rootPath: tmpDir,
      entries: [{ relativePath: 'src-dir', kind: 'directory' }],
      destDir: 'dest',
    })

    // Original should remain untouched
    const oldContent = await fs.readFile(path.join(tmpDir, 'dest', 'src-dir', 'old.txt'), 'utf-8')
    expect(oldContent).toBe('old content')

    // Copied directory should be renamed
    const newContent = await fs.readFile(
      path.join(tmpDir, 'dest', 'src-dir (1)', 'file.txt'),
      'utf-8',
    )
    expect(newContent).toBe('new content')
  })

  it('copies multiple entries at once', async () => {
    await fs.writeFile(path.join(tmpDir, 'a.txt'), 'a content')
    await fs.writeFile(path.join(tmpDir, 'b.txt'), 'b content')
    await fs.mkdir(path.join(tmpDir, 'dest'))

    await copyEntries({
      rootPath: tmpDir,
      entries: [
        { relativePath: 'a.txt', kind: 'file' },
        { relativePath: 'b.txt', kind: 'file' },
      ],
      destDir: 'dest',
    })

    const a = await fs.readFile(path.join(tmpDir, 'dest', 'a.txt'), 'utf-8')
    expect(a).toBe('a content')
    const b = await fs.readFile(path.join(tmpDir, 'dest', 'b.txt'), 'utf-8')
    expect(b).toBe('b content')
  })

  it('copies to root when destDir is empty string', async () => {
    await fs.writeFile(path.join(tmpDir, 'hello.txt'), 'root content')
    await fs.mkdir(path.join(tmpDir, 'subdir'))

    // Copy file to root (destDir = '')
    // but source is in subdir to avoid self-copy
    await fs.writeFile(path.join(tmpDir, 'subdir', 'sub.txt'), 'sub content')

    await copyEntries({
      rootPath: tmpDir,
      entries: [{ relativePath: 'subdir/sub.txt', kind: 'file' }],
      destDir: '',
    })

    const content = await fs.readFile(path.join(tmpDir, 'sub.txt'), 'utf-8')
    expect(content).toBe('sub content')
  })

  it('throws an error when source path does not exist', async () => {
    await fs.mkdir(path.join(tmpDir, 'dest'))

    await expect(
      copyEntries({
        rootPath: tmpDir,
        entries: [{ relativePath: 'nonexistent.txt', kind: 'file' }],
        destDir: 'dest',
      }),
    ).rejects.toThrow()
  })
})
