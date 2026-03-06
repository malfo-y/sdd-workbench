import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  workspaceIndex,
  workspaceIndexDirectory,
  workspaceReadFile,
  workspaceSearchFiles,
  workspaceWriteFile,
} from './workspace-ops'

describe('remote-agent/runtime/workspace-ops', () => {
  it('indexes and reads files within workspace root', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-index-'))

    try {
      await mkdir(path.join(rootPath, 'src'), { recursive: true })
      await writeFile(path.join(rootPath, 'src/main.ts'), 'console.log("ok")\n', 'utf8')

      const indexResult = await workspaceIndex({ rootPath })
      expect(indexResult.ok).toBe(true)
      expect(indexResult.fileTree).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'src',
            relativePath: 'src',
            kind: 'directory',
            childrenStatus: 'not-loaded',
          }),
        ]),
      )

      const readResult = await workspaceReadFile(
        { rootPath },
        { relativePath: 'src/main.ts' },
      )
      expect(readResult).toMatchObject({
        ok: true,
        content: 'console.log("ok")\n',
      })
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })

  it('writes files and rejects workspace escape path', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-write-'))

    try {
      await workspaceWriteFile(
        { rootPath },
        { relativePath: 'docs/guide.md', content: '# hello\n' },
      )
      const saved = await readFile(path.join(rootPath, 'docs/guide.md'), 'utf8')
      expect(saved).toBe('# hello\n')

      await expect(
        workspaceWriteFile(
          { rootPath },
          { relativePath: '../outside.md', content: 'oops' },
        ),
      ).rejects.toMatchObject({
        code: 'PATH_DENIED',
      })
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })

  it('supports paginated directory indexing via offset/limit', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-index-dir-'))

    try {
      await mkdir(path.join(rootPath, 'dir'), { recursive: true })
      await writeFile(path.join(rootPath, 'dir/a.ts'), 'a\n', 'utf8')
      await writeFile(path.join(rootPath, 'dir/b.ts'), 'b\n', 'utf8')
      await writeFile(path.join(rootPath, 'dir/c.ts'), 'c\n', 'utf8')

      const firstPage = await workspaceIndexDirectory(
        { rootPath },
        { relativePath: 'dir', offset: 0, limit: 2 },
      )
      expect(firstPage.ok).toBe(true)
      expect(firstPage.childrenStatus).toBe('partial')
      expect(firstPage.totalChildCount).toBe(3)
      expect(firstPage.children).toHaveLength(2)

      const secondPage = await workspaceIndexDirectory(
        { rootPath },
        { relativePath: 'dir', offset: 2, limit: 2 },
      )
      expect(secondPage.ok).toBe(true)
      expect(secondPage.childrenStatus).toBe('complete')
      expect(secondPage.totalChildCount).toBe(3)
      expect(secondPage.children).toHaveLength(1)
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })

  it('includes symbolic links to files and directories in index results', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-symlink-'))

    try {
      await mkdir(path.join(rootPath, 'target-dir'), { recursive: true })
      await writeFile(path.join(rootPath, 'target-file.txt'), 'target\n', 'utf8')
      await symlink('target-dir', path.join(rootPath, 'linked-dir'))
      await symlink('target-file.txt', path.join(rootPath, 'linked-file.txt'))

      const indexResult = await workspaceIndex({ rootPath })
      expect(indexResult.ok).toBe(true)
      expect(indexResult.fileTree).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'linked-dir',
            relativePath: 'linked-dir',
            kind: 'directory',
            childrenStatus: 'not-loaded',
          }),
          expect.objectContaining({
            name: 'linked-file.txt',
            relativePath: 'linked-file.txt',
            kind: 'file',
          }),
        ]),
      )

      const directoryResult = await workspaceIndexDirectory(
        { rootPath },
        { relativePath: '.', limit: 1000 },
      )
      expect(directoryResult.ok).toBe(true)
      expect(directoryResult.children).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'linked-dir',
            relativePath: 'linked-dir',
            kind: 'directory',
            childrenStatus: 'not-loaded',
          }),
          expect.objectContaining({
            name: 'linked-file.txt',
            relativePath: 'linked-file.txt',
            kind: 'file',
          }),
        ]),
      )
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })

  it('searches files with depth limit, large-directory skip, and result metadata', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-search-'))

    try {
      await mkdir(path.join(rootPath, 'docs', 'nested', 'deep'), { recursive: true })
      await mkdir(path.join(rootPath, 'big'), { recursive: true })
      await writeFile(path.join(rootPath, 'docs', 'Guide.md'), '# guide\n', 'utf8')
      await writeFile(
        path.join(rootPath, 'docs', 'nested', 'deep', 'guide-deep.md'),
        '# deep\n',
        'utf8',
      )
      await Promise.all(
        Array.from({ length: 11 }, (_, index) =>
          writeFile(path.join(rootPath, 'big', `guide-${index}.md`), 'x\n', 'utf8'),
        ),
      )

      const result = await workspaceSearchFiles(
        { rootPath },
        {
          query: 'guide',
          maxDepth: 1,
          maxDirectoryChildren: 10,
          maxResults: 10,
        },
      )

      expect(result.ok).toBe(true)
      expect(result.results).toEqual([
        {
          fileName: 'Guide.md',
          parentRelativePath: 'docs',
          relativePath: 'docs/Guide.md',
        },
      ])
      expect(result.skippedLargeDirectoryCount).toBe(1)
      expect(result.depthLimitHit).toBe(true)
      expect(result.timedOut).toBe(false)
      expect(result.truncated).toBe(false)
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })

  it('supports wildcard queries and treats wildcard-only query as empty', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-runtime-search-wildcard-'))

    try {
      await mkdir(path.join(rootPath, 'docs'), { recursive: true })
      await writeFile(path.join(rootPath, 'docs', 'guide-unit-test.md'), '# test\n', 'utf8')
      await writeFile(path.join(rootPath, 'docs', 'guide.md'), '# guide\n', 'utf8')

      const wildcardResult = await workspaceSearchFiles(
        { rootPath },
        {
          query: 'guide*test',
          maxDepth: 5,
          maxDirectoryChildren: 100,
          maxResults: 10,
        },
      )

      expect(wildcardResult.ok).toBe(true)
      expect(wildcardResult.results).toEqual([
        {
          fileName: 'guide-unit-test.md',
          parentRelativePath: 'docs',
          relativePath: 'docs/guide-unit-test.md',
        },
      ])

      const emptyWildcardResult = await workspaceSearchFiles(
        { rootPath },
        {
          query: '**',
        },
      )

      expect(emptyWildcardResult.ok).toBe(true)
      expect(emptyWildcardResult.results).toEqual([])
      expect(emptyWildcardResult.truncated).toBe(false)
      expect(emptyWildcardResult.timedOut).toBe(false)
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })
})
