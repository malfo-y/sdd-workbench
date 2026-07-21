import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  searchWorkspaceFilesByName,
  searchWorkspaceText,
  type WorkspaceSearchIndexedEntry,
} from './workspace-search'

function createFile(
  absolutePath: string,
  name = absolutePath.split('/').at(-1) ?? absolutePath,
): WorkspaceSearchIndexedEntry {
  return {
    absolutePath,
    isSymbolicLink: false,
    kind: 'file',
    name,
  }
}

function createDirectory(
  absolutePath: string,
  options?: { isSymbolicLink?: boolean },
): WorkspaceSearchIndexedEntry {
  return {
    absolutePath,
    isSymbolicLink: options?.isSymbolicLink === true,
    kind: 'directory',
    name: absolutePath.split('/').at(-1) ?? absolutePath,
  }
}

function createFileSystemError(
  code: 'EACCES' | 'EPERM' | 'ENOENT' | 'ENOTDIR',
) {
  return Object.assign(new Error(`Filesystem error: ${code}`), { code })
}

async function captureOutcome<T>(promise: Promise<T>) {
  return promise.then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (reason: unknown) => ({ status: 'rejected' as const, reason }),
  )
}

describe('workspace-search', () => {
  it('matches file names recursively with case-insensitive substring search', async () => {
    const rootPath = '/workspace'
    const directoryEntries = new Map<string, WorkspaceSearchIndexedEntry[]>([
      [
        rootPath,
        [
          createDirectory('/workspace/docs'),
          createFile('/workspace/README.md', 'README.md'),
        ],
      ],
      [
        '/workspace/docs',
        [
          createFile('/workspace/docs/Guide.md', 'Guide.md'),
          createFile('/workspace/docs/guide-notes.txt', 'guide-notes.txt'),
        ],
      ],
    ])

    const result = await searchWorkspaceFilesByName({
      rootPath,
      query: 'guide',
      collectEntries: async (directoryPath) => directoryEntries.get(directoryPath) ?? [],
      normalizeRelativePath: (absolutePath, workspaceRootPath) =>
        absolutePath.replace(`${workspaceRootPath}/`, ''),
    })

    expect(result.results).toEqual([
      {
        fileName: 'guide-notes.txt',
        parentRelativePath: 'docs',
        relativePath: 'docs/guide-notes.txt',
      },
      {
        fileName: 'Guide.md',
        parentRelativePath: 'docs',
        relativePath: 'docs/Guide.md',
      },
    ])
    expect(result.truncated).toBe(false)
    expect(result.skippedLargeDirectoryCount).toBe(0)
    expect(result.depthLimitHit).toBe(false)
    expect(result.timedOut).toBe(false)
  })

  it('supports ordered wildcard matching and treats wildcard-only query as empty', async () => {
    const rootPath = '/workspace'
    const directoryEntries = new Map<string, WorkspaceSearchIndexedEntry[]>([
      [
        rootPath,
        [
          createFile('/workspace/guide-unit-test.md'),
          createFile('/workspace/guide.md'),
          createFile('/workspace/testing-guide.md'),
        ],
      ],
    ])

    const wildcardResult = await searchWorkspaceFilesByName({
      rootPath,
      query: 'guide*test',
      collectEntries: async (directoryPath) => directoryEntries.get(directoryPath) ?? [],
      normalizeRelativePath: (absolutePath, workspaceRootPath) =>
        absolutePath.replace(`${workspaceRootPath}/`, ''),
    })

    expect(wildcardResult.results).toEqual([
      {
        fileName: 'guide-unit-test.md',
        parentRelativePath: '',
        relativePath: 'guide-unit-test.md',
      },
    ])

    const emptyWildcardResult = await searchWorkspaceFilesByName({
      rootPath,
      query: '**',
      collectEntries: async (directoryPath) => directoryEntries.get(directoryPath) ?? [],
      normalizeRelativePath: (absolutePath, workspaceRootPath) =>
        absolutePath.replace(`${workspaceRootPath}/`, ''),
    })

    expect(emptyWildcardResult.results).toEqual([])
    expect(emptyWildcardResult.truncated).toBe(false)
    expect(emptyWildcardResult.skippedLargeDirectoryCount).toBe(0)
    expect(emptyWildcardResult.depthLimitHit).toBe(false)
    expect(emptyWildcardResult.timedOut).toBe(false)
  })

  it('enforces depth limit, large-directory skip, and symlink-directory skip', async () => {
    const rootPath = '/workspace'
    const directoryEntries = new Map<string, WorkspaceSearchIndexedEntry[]>([
      [
        rootPath,
        [
          createDirectory('/workspace/docs'),
          createDirectory('/workspace/deep'),
          createDirectory('/workspace/big'),
          createDirectory('/workspace/link', { isSymbolicLink: true }),
        ],
      ],
      [
        '/workspace/docs',
        [
          createFile('/workspace/docs/guide.md'),
          createFile('/workspace/docs/guide-2.md'),
        ],
      ],
      [
        '/workspace/deep',
        [
          createDirectory('/workspace/deep/level1'),
        ],
      ],
      [
        '/workspace/deep/level1',
        [
          createDirectory('/workspace/deep/level1/level2'),
        ],
      ],
      [
        '/workspace/deep/level1/level2',
        [
          createFile('/workspace/deep/level1/level2/guide-3.md'),
        ],
      ],
      [
        '/workspace/big',
        Array.from({ length: 11 }, (_, index) =>
          createFile(`/workspace/big/file-${index}.md`, `guide-${index}.md`),
        ),
      ],
    ])

    const result = await searchWorkspaceFilesByName({
      rootPath,
      query: 'guide',
      maxDepth: 1,
      maxDirectoryChildren: 10,
      collectEntries: async (directoryPath) => directoryEntries.get(directoryPath) ?? [],
      normalizeRelativePath: (absolutePath, workspaceRootPath) =>
        absolutePath.replace(`${workspaceRootPath}/`, ''),
    })

    expect(result.results).toHaveLength(2)
    expect(result.results.map((entry) => entry.parentRelativePath)).toEqual([
      'docs',
      'docs',
    ])
    expect(result.truncated).toBe(false)
    expect(result.skippedLargeDirectoryCount).toBe(1)
    expect(result.depthLimitHit).toBe(true)
    expect(result.timedOut).toBe(false)
  })

  it('truncates when result cap is reached', async () => {
    const rootPath = '/workspace'
    const directoryEntries = new Map<string, WorkspaceSearchIndexedEntry[]>([
      [
        rootPath,
        [
          createFile('/workspace/guide-a.md'),
          createFile('/workspace/guide-b.md'),
        ],
      ],
    ])

    const result = await searchWorkspaceFilesByName({
      rootPath,
      query: 'guide',
      maxResults: 1,
      collectEntries: async (directoryPath) => directoryEntries.get(directoryPath) ?? [],
      normalizeRelativePath: (absolutePath, workspaceRootPath) =>
        absolutePath.replace(`${workspaceRootPath}/`, ''),
    })

    expect(result.results).toHaveLength(1)
    expect(result.truncated).toBe(true)
    expect(result.skippedLargeDirectoryCount).toBe(0)
    expect(result.depthLimitHit).toBe(false)
    expect(result.timedOut).toBe(false)
  })

  it('returns timedOut when time budget is exceeded during traversal', async () => {
    const rootPath = '/workspace'
    const directoryEntries = new Map<string, WorkspaceSearchIndexedEntry[]>([
      [
        rootPath,
        [
          createDirectory('/workspace/docs'),
        ],
      ],
      [
        '/workspace/docs',
        [
          createFile('/workspace/docs/guide.md'),
        ],
      ],
    ])

    let nowTick = 0
    const result = await searchWorkspaceFilesByName({
      rootPath,
      query: 'guide',
      timeBudgetMs: 1,
      now: () => {
        nowTick += 1
        return nowTick
      },
      collectEntries: async (directoryPath) => directoryEntries.get(directoryPath) ?? [],
      normalizeRelativePath: (absolutePath, workspaceRootPath) =>
        absolutePath.replace(`${workspaceRootPath}/`, ''),
    })

    expect(result.results).toEqual([])
    expect(result.truncated).toBe(true)
    expect(result.timedOut).toBe(true)
  })

  it('skips an unreadable child directory during filename search and returns accessible matches', async () => {
    const rootPath = '/workspace'
    const directoryErrors = new Map<
      string,
      'EACCES' | 'EPERM' | 'ENOENT' | 'ENOTDIR'
    >([
      ['/workspace/denied', 'EACCES'],
      ['/workspace/disappeared', 'ENOENT'],
      ['/workspace/not-a-directory', 'ENOTDIR'],
      ['/workspace/protected', 'EPERM'],
    ])
    const directoryEntries = new Map<string, WorkspaceSearchIndexedEntry[]>([
      [
        rootPath,
        [
          createDirectory('/workspace/accessible'),
          ...Array.from(directoryErrors.keys(), (directoryPath) =>
            createDirectory(directoryPath),
          ),
        ],
      ],
      [
        '/workspace/accessible',
        [createFile('/workspace/accessible/guide.md')],
      ],
    ])

    const outcome = await captureOutcome(
      searchWorkspaceFilesByName({
        rootPath,
        query: 'guide',
        collectEntries: async (directoryPath) => {
          const errorCode = directoryErrors.get(directoryPath)
          if (errorCode) {
            throw createFileSystemError(errorCode)
          }
          return directoryEntries.get(directoryPath) ?? []
        },
        normalizeRelativePath: (absolutePath, workspaceRootPath) =>
          absolutePath.replace(`${workspaceRootPath}/`, ''),
      }),
    )

    expect(outcome.status).toBe('fulfilled')
    if (outcome.status !== 'fulfilled') {
      return
    }
    const result = outcome.value

    expect(result.results).toEqual([
      {
        fileName: 'guide.md',
        parentRelativePath: 'accessible',
        relativePath: 'accessible/guide.md',
      },
    ])
    expect(result.skippedUnreadablePathCount).toBe(4)
  })

  it('counts a skippable symlink classification error during filename search and keeps sibling matches', async () => {
    const rootPath = '/workspace'
    const outcome = await captureOutcome(
      searchWorkspaceFilesByName({
        rootPath,
        query: 'guide',
        collectEntries: async (
          _directoryPath: string,
          reportClassificationError?: (error: unknown) => void,
        ) => {
          reportClassificationError?.(createFileSystemError('EACCES'))
          return [createFile('/workspace/guide.md')]
        },
        normalizeRelativePath: (absolutePath, workspaceRootPath) =>
          absolutePath.replace(`${workspaceRootPath}/`, ''),
      }),
    )

    expect(outcome.status).toBe('fulfilled')
    if (outcome.status !== 'fulfilled') {
      return
    }

    expect(outcome.value.results).toEqual([
      {
        fileName: 'guide.md',
        parentRelativePath: '',
        relativePath: 'guide.md',
      },
    ])
    expect(outcome.value.skippedUnreadablePathCount).toBe(1)
  })

  it('rejects filename search when symlink classification reports an unexpected error', async () => {
    const unexpectedError = Object.assign(
      new Error('Failed to classify symlink: EIO'),
      { code: 'EIO' },
    )
    const outcome = await captureOutcome(
      searchWorkspaceFilesByName({
        rootPath: '/workspace',
        query: 'guide',
        collectEntries: async (
          _directoryPath: string,
          reportClassificationError?: (error: unknown) => void,
        ) => {
          reportClassificationError?.(unexpectedError)
          return [createFile('/workspace/guide.md')]
        },
        normalizeRelativePath: (absolutePath, workspaceRootPath) =>
          absolutePath.replace(`${workspaceRootPath}/`, ''),
      }),
    )

    expect(outcome.status).toBe('rejected')
    if (outcome.status !== 'rejected') {
      return
    }
    expect(outcome.reason).toBe(unexpectedError)
  })

  it('matches text lines case-insensitively and returns trimmed snippets', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'workspace-text-'))
    await mkdir(path.join(rootPath, 'src'))
    await writeFile(
      path.join(rootPath, 'src', 'App.ts'),
      'first line\n  Needle in a line  \nsecond needle line\n',
      'utf8',
    )

    const result = await searchWorkspaceText({
      rootPath,
      query: 'needle',
    })

    expect(result).toEqual({
      results: [
        {
          relativePath: 'src/App.ts',
          lineNumber: 2,
          snippet: 'Needle in a line',
        },
        {
          relativePath: 'src/App.ts',
          lineNumber: 3,
          snippet: 'second needle line',
        },
      ],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedLargeFileCount: 0,
      skippedBinaryFileCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
  })

  it('returns empty text results for empty or whitespace query', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'workspace-text-empty-'))

    const result = await searchWorkspaceText({
      rootPath,
      query: '   ',
    })

    expect(result).toEqual({
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedLargeFileCount: 0,
      skippedBinaryFileCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
  })

  it('applies text search traversal and file safety limits', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'workspace-text-limits-'))
    await mkdir(path.join(rootPath, 'src'))
    await mkdir(path.join(rootPath, '.git'))
    await mkdir(path.join(rootPath, 'node_modules', 'pkg'), { recursive: true })
    await mkdir(path.join(rootPath, 'big'))
    await mkdir(path.join(rootPath, 'deep', 'level1'), { recursive: true })

    await writeFile(path.join(rootPath, 'src', 'visible.txt'), 'needle\n', 'utf8')
    await writeFile(path.join(rootPath, '.git', 'hidden.txt'), 'needle\n', 'utf8')
    await writeFile(
      path.join(rootPath, 'node_modules', 'pkg', 'hidden.txt'),
      'needle\n',
      'utf8',
    )
    await writeFile(path.join(rootPath, 'deep', 'level1', 'hidden.txt'), 'needle\n', 'utf8')
    await writeFile(path.join(rootPath, 'large.txt'), 'needle appears in a large file\n', 'utf8')
    await writeFile(path.join(rootPath, 'binary.bin'), Buffer.from([0x6e, 0x00, 0x65]))
    await Promise.all(
      Array.from({ length: 11 }, (_, index) =>
        writeFile(path.join(rootPath, 'big', `file-${index}.txt`), 'needle\n', 'utf8'),
      ),
    )
    await symlink(path.join(rootPath, 'src'), path.join(rootPath, 'src-link'))

    const result = await searchWorkspaceText({
      rootPath,
      query: 'needle',
      maxDepth: 1,
      maxDirectoryChildren: 10,
      maxFileBytes: 10,
    })

    expect(result.results).toEqual([
      {
        relativePath: 'src/visible.txt',
        lineNumber: 1,
        snippet: 'needle',
      },
    ])
    expect(result.truncated).toBe(false)
    expect(result.skippedLargeDirectoryCount).toBe(1)
    expect(result.skippedLargeFileCount).toBe(1)
    expect(result.skippedBinaryFileCount).toBe(1)
    expect(result.depthLimitHit).toBe(true)
    expect(result.timedOut).toBe(false)
  })

  it('truncates text search when result cap is reached', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'workspace-text-cap-'))
    await writeFile(path.join(rootPath, 'notes.txt'), 'needle one\nneedle two\n', 'utf8')

    const result = await searchWorkspaceText({
      rootPath,
      query: 'needle',
      maxResults: 1,
    })

    expect(result.results).toEqual([
      {
        relativePath: 'notes.txt',
        lineNumber: 1,
        snippet: 'needle one',
      },
    ])
    expect(result.truncated).toBe(true)
  })

  it('returns timedOut when text search time budget is exceeded', async () => {
    const rootPath = '/workspace'
    let nowTick = 0

    const result = await searchWorkspaceText({
      rootPath,
      query: 'needle',
      timeBudgetMs: 1,
      now: () => {
        nowTick += 1
        return nowTick
      },
      collectEntries: async () => [
        createFile('/workspace/notes.txt'),
      ],
      getFileSize: async () => 7,
      readFileBuffer: async () => Buffer.from('needle\n', 'utf8'),
      normalizeRelativePath: (absolutePath, workspaceRootPath) =>
        absolutePath.replace(`${workspaceRootPath}/`, ''),
    })

    expect(result.results).toEqual([])
    expect(result.truncated).toBe(true)
    expect(result.timedOut).toBe(true)
  })

  it('skips child directories with skippable filesystem errors and returns accessible text matches', async () => {
    const rootPath = '/workspace'
    const directoryErrors = new Map<
      string,
      'EACCES' | 'EPERM' | 'ENOENT' | 'ENOTDIR'
    >([
      ['/workspace/denied', 'EACCES'],
      ['/workspace/disappeared', 'ENOENT'],
      ['/workspace/not-a-directory', 'ENOTDIR'],
      ['/workspace/protected', 'EPERM'],
    ])
    const directoryEntries = new Map<string, WorkspaceSearchIndexedEntry[]>([
      [
        rootPath,
        [
          createDirectory('/workspace/accessible'),
          ...Array.from(directoryErrors.keys(), (directoryPath) =>
            createDirectory(directoryPath),
          ),
        ],
      ],
      [
        '/workspace/accessible',
        [createFile('/workspace/accessible/match.txt')],
      ],
    ])

    const outcome = await captureOutcome(
      searchWorkspaceText({
        rootPath,
        query: 'needle',
        collectEntries: async (directoryPath) => {
          const errorCode = directoryErrors.get(directoryPath)
          if (errorCode) {
            throw createFileSystemError(errorCode)
          }
          return directoryEntries.get(directoryPath) ?? []
        },
        getFileSize: async () => 7,
        readFileBuffer: async () => Buffer.from('needle\n', 'utf8'),
        normalizeRelativePath: (absolutePath, workspaceRootPath) =>
          absolutePath.replace(`${workspaceRootPath}/`, ''),
      }),
    )

    expect(outcome.status).toBe('fulfilled')
    if (outcome.status !== 'fulfilled') {
      return
    }
    const result = outcome.value

    expect(result.results).toEqual([
      {
        relativePath: 'accessible/match.txt',
        lineNumber: 1,
        snippet: 'needle',
      },
    ])
    expect(result.skippedUnreadablePathCount).toBe(4)
  })

  it('skips unreadable files during metadata and content access and continues to later files', async () => {
    const rootPath = '/workspace'

    const outcome = await captureOutcome(
      searchWorkspaceText({
        rootPath,
        query: 'needle',
        collectEntries: async () => [
          createFile('/workspace/a-stat-failure.txt'),
          createFile('/workspace/b-read-failure.txt'),
          createFile('/workspace/c-match.txt'),
        ],
        getFileSize: async (absolutePath) => {
          if (absolutePath.endsWith('a-stat-failure.txt')) {
            throw createFileSystemError('ENOENT')
          }
          return 7
        },
        readFileBuffer: async (absolutePath) => {
          if (absolutePath.endsWith('b-read-failure.txt')) {
            throw createFileSystemError('EACCES')
          }
          return Buffer.from('needle\n', 'utf8')
        },
        normalizeRelativePath: (absolutePath, workspaceRootPath) =>
          absolutePath.replace(`${workspaceRootPath}/`, ''),
      }),
    )

    expect(outcome.status).toBe('fulfilled')
    if (outcome.status !== 'fulfilled') {
      return
    }
    const result = outcome.value

    expect(result.results).toEqual([
      {
        relativePath: 'c-match.txt',
        lineNumber: 1,
        snippet: 'needle',
      },
    ])
    expect(result.skippedUnreadablePathCount).toBe(2)
  })

  it('keeps root collection failures fatal while child collection failures are partial', async () => {
    const rootPath = '/workspace'
    const rootError = createFileSystemError('EACCES')
    const unexpectedChildError = Object.assign(
      new Error('Unexpected filesystem error: EIO'),
      { code: 'EIO' },
    )

    await expect(
      searchWorkspaceText({
        rootPath,
        query: 'needle',
        collectEntries: async () => {
          throw rootError
        },
      }),
    ).rejects.toBe(rootError)

    const partialOutcome = await captureOutcome(
      searchWorkspaceText({
        rootPath,
        query: 'needle',
        collectEntries: async (directoryPath) => {
          if (directoryPath === rootPath) {
            return [createDirectory('/workspace/child')]
          }
          throw createFileSystemError('EACCES')
        },
      }),
    )

    expect(partialOutcome.status).toBe('fulfilled')
    if (partialOutcome.status !== 'fulfilled') {
      return
    }
    const partialResult = partialOutcome.value

    expect(partialResult.results).toEqual([])
    expect(partialResult.skippedUnreadablePathCount).toBe(1)

    await expect(
      searchWorkspaceText({
        rootPath,
        query: 'needle',
        collectEntries: async (directoryPath) => {
          if (directoryPath === rootPath) {
            return [createDirectory('/workspace/child')]
          }
          throw unexpectedChildError
        },
      }),
    ).rejects.toBe(unexpectedChildError)
  })

  it('counts a skippable symlink classification error during text search and keeps sibling matches', async () => {
    const rootPath = '/workspace'
    const outcome = await captureOutcome(
      searchWorkspaceText({
        rootPath,
        query: 'needle',
        collectEntries: async (
          _directoryPath: string,
          reportClassificationError?: (error: unknown) => void,
        ) => {
          reportClassificationError?.(createFileSystemError('ENOENT'))
          return [createFile('/workspace/readable.txt')]
        },
        getFileSize: async () => 7,
        readFileBuffer: async () => Buffer.from('needle\n', 'utf8'),
        normalizeRelativePath: (absolutePath, workspaceRootPath) =>
          absolutePath.replace(`${workspaceRootPath}/`, ''),
      }),
    )

    expect(outcome.status).toBe('fulfilled')
    if (outcome.status !== 'fulfilled') {
      return
    }

    expect(outcome.value.results).toEqual([
      {
        relativePath: 'readable.txt',
        lineNumber: 1,
        snippet: 'needle',
      },
    ])
    expect(outcome.value.skippedUnreadablePathCount).toBe(1)
  })

  it('rejects text search when symlink classification reports an unexpected error', async () => {
    const unexpectedError = Object.assign(
      new Error('Failed to classify symlink: EIO'),
      { code: 'EIO' },
    )
    const outcome = await captureOutcome(
      searchWorkspaceText({
        rootPath: '/workspace',
        query: 'needle',
        collectEntries: async (
          _directoryPath: string,
          reportClassificationError?: (error: unknown) => void,
        ) => {
          reportClassificationError?.(unexpectedError)
          return [createFile('/workspace/readable.txt')]
        },
        getFileSize: async () => 7,
        readFileBuffer: async () => Buffer.from('needle\n', 'utf8'),
      }),
    )

    expect(outcome.status).toBe('rejected')
    if (outcome.status !== 'rejected') {
      return
    }
    expect(outcome.reason).toBe(unexpectedError)
  })
})
