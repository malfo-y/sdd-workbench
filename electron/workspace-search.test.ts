import { describe, expect, it } from 'vitest'
import {
  searchWorkspaceFilesByName,
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
})
