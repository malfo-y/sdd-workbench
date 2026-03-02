import { describe, expect, it, vi } from 'vitest'
import { createLocalWorkspaceBackend } from './local-workspace-backend'

describe('workspace-backend/local-workspace-backend', () => {
  it('delegates calls to provided handlers', async () => {
    const handlers = {
      index: vi.fn(async () => ({ ok: true, source: 'index' })),
      indexDirectory: vi.fn(async () => ({ ok: true, source: 'indexDirectory' })),
      readFile: vi.fn(async () => ({ ok: true, source: 'readFile' })),
      writeFile: vi.fn(async () => ({ ok: true, source: 'writeFile' })),
      createFile: vi.fn(async () => ({ ok: true, source: 'createFile' })),
      createDirectory: vi.fn(async () => ({ ok: true, source: 'createDirectory' })),
      deleteFile: vi.fn(async () => ({ ok: true, source: 'deleteFile' })),
      deleteDirectory: vi.fn(async () => ({ ok: true, source: 'deleteDirectory' })),
      rename: vi.fn(async () => ({ ok: true, source: 'rename' })),
      getGitLineMarkers: vi.fn(async () => ({ ok: true, source: 'lineMarkers' })),
      getGitFileStatuses: vi.fn(async () => ({ ok: true, source: 'fileStatuses' })),
      readComments: vi.fn(async () => ({ ok: true, source: 'readComments' })),
      writeComments: vi.fn(async () => ({ ok: true, source: 'writeComments' })),
      readGlobalComments: vi.fn(async () => ({ ok: true, source: 'readGlobalComments' })),
      writeGlobalComments: vi.fn(async () => ({ ok: true, source: 'writeGlobalComments' })),
      exportCommentsBundle: vi.fn(async () => ({ ok: true, source: 'exportCommentsBundle' })),
      watchStart: vi.fn(async () => ({ ok: true, source: 'watchStart' })),
      watchStop: vi.fn(async () => ({ ok: true, source: 'watchStop' })),
    }

    const backend = createLocalWorkspaceBackend(handlers)

    await backend.index({ rootPath: '/tmp/a' })
    await backend.indexDirectory({ rootPath: '/tmp/a', relativePath: 'src' })
    await backend.readFile({ rootPath: '/tmp/a', relativePath: 'README.md' })
    await backend.writeFile({ rootPath: '/tmp/a', relativePath: 'README.md', content: 'x' })
    await backend.createFile({ rootPath: '/tmp/a', relativePath: 'new.txt' })
    await backend.createDirectory({ rootPath: '/tmp/a', relativePath: 'new-dir' })
    await backend.deleteFile({ rootPath: '/tmp/a', relativePath: 'old.txt' })
    await backend.deleteDirectory({ rootPath: '/tmp/a', relativePath: 'old-dir' })
    await backend.rename({
      rootPath: '/tmp/a',
      oldRelativePath: 'a.txt',
      newRelativePath: 'b.txt',
    })
    await backend.getGitLineMarkers({ rootPath: '/tmp/a', relativePath: 'a.ts' })
    await backend.getGitFileStatuses({ rootPath: '/tmp/a' })
    await backend.readComments({ rootPath: '/tmp/a' })
    await backend.writeComments({ rootPath: '/tmp/a', comments: [] })
    await backend.readGlobalComments({ rootPath: '/tmp/a' })
    await backend.writeGlobalComments({ rootPath: '/tmp/a', body: 'body' })
    await backend.exportCommentsBundle({
      rootPath: '/tmp/a',
      writeCommentsFile: true,
      writeBundleFile: true,
    })
    await backend.watchStart({ workspaceId: 'w1', rootPath: '/tmp/a' })
    await backend.watchStop({ workspaceId: 'w1' })

    expect(backend.kind).toBe('local')
    expect(handlers.index).toHaveBeenCalledTimes(1)
    expect(handlers.watchStop).toHaveBeenCalledTimes(1)
  })
})
