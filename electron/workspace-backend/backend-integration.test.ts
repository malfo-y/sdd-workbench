import { describe, expect, it } from 'vitest'
import { createLocalWorkspaceBackend } from './local-workspace-backend'
import { WorkspaceBackendRouter } from './backend-router'
import { createRemoteWorkspaceBackend } from './remote-workspace-backend'

describe('workspace-backend/backend-integration', () => {
  it('routes local and remote index calls to each backend', async () => {
    const localBackend = createLocalWorkspaceBackend({
      index: async () => ({ ok: true, fileTree: [], backend: 'local' }),
      indexDirectory: async () => ({
        ok: true,
        children: [],
        childrenStatus: 'complete',
        totalChildCount: 0,
      }),
      readFile: async () => ({ ok: true, content: null }),
      writeFile: async () => ({ ok: true }),
      createFile: async () => ({ ok: true }),
      createDirectory: async () => ({ ok: true }),
      deleteFile: async () => ({ ok: true }),
      deleteDirectory: async () => ({ ok: true }),
      rename: async () => ({ ok: true }),
      searchFiles: async () => ({
        ok: true,
        backend: 'local',
        results: [],
        truncated: false,
        skippedLargeDirectoryCount: 0,
        skippedUnreadablePathCount: 0,
        depthLimitHit: false,
        timedOut: false,
      }),
      searchText: async () => ({
        ok: true,
        backend: 'local',
        results: [{ relativePath: 'src/local.ts', lineNumber: 1, snippet: 'needle' }],
        truncated: false,
        skippedLargeDirectoryCount: 0,
        skippedLargeFileCount: 0,
        skippedBinaryFileCount: 0,
        skippedUnreadablePathCount: 0,
        depthLimitHit: false,
        timedOut: false,
      }),
      getGitLineMarkers: async () => ({ ok: true, markers: [] }),
      getGitFileStatuses: async () => ({ ok: true, statuses: {} }),
      readComments: async () => ({ ok: true, comments: [] }),
      writeComments: async () => ({ ok: true }),
      readGlobalComments: async () => ({ ok: true, body: '' }),
      writeGlobalComments: async () => ({ ok: true }),
      exportCommentsBundle: async () => ({ ok: true }),
      copyEntries: async () => ({ ok: true, copiedPaths: [] }),
      watchStart: async () => ({ ok: true }),
      watchStop: async () => ({ ok: true }),
    })

    const router = new WorkspaceBackendRouter(localBackend)

    const remoteBackend = createRemoteWorkspaceBackend({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      requestRemote: async (_workspaceId, method) => {
        if (method === 'workspace.index') {
          return { ok: true, fileTree: [], backend: 'remote' }
        }
        if (method === 'workspace.searchFiles') {
          return {
            ok: true,
            backend: 'remote',
            results: [],
            truncated: false,
            skippedLargeDirectoryCount: 0,
            skippedUnreadablePathCount: 0,
            depthLimitHit: false,
            timedOut: false,
          }
        }
        if (method === 'workspace.searchText') {
          return {
            ok: true,
            backend: 'remote',
            results: [{ relativePath: 'src/remote.ts', lineNumber: 2, snippet: 'needle' }],
            truncated: false,
            skippedLargeDirectoryCount: 0,
            skippedLargeFileCount: 0,
            skippedBinaryFileCount: 0,
            skippedUnreadablePathCount: 0,
            depthLimitHit: false,
            timedOut: false,
          }
        }
        return { ok: true }
      },
      subscribeAgentEvents: () => () => undefined,
      sendWatchEvent: () => undefined,
      sendWatchFallback: () => undefined,
    })

    router.registerRemoteWorkspace({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      backend: remoteBackend,
    })

    const localResult = await router
      .resolveByRootPath('/Users/tester/project')
      .index({ rootPath: '/Users/tester/project' })
    const remoteResult = await router
      .resolveByRootPath('remote://workspace-a')
      .index({ rootPath: 'remote://workspace-a' })
    const localSearchResult = await router
      .resolveByRootPath('/Users/tester/project')
      .searchFiles({ rootPath: '/Users/tester/project', query: 'guide*deep' })
    const remoteSearchResult = await router
      .resolveByRootPath('remote://workspace-a')
      .searchFiles({ rootPath: 'remote://workspace-a', query: 'guide*deep' })
    const resolvedLocalBackend = router.resolveByRootPath('/Users/tester/project')
    const localTextSearchResult = await resolvedLocalBackend.searchText({
      rootPath: '/Users/tester/project',
      query: 'needle',
    })

    expect(localResult).toEqual({ ok: true, fileTree: [], backend: 'local' })
    expect(remoteResult).toEqual({ ok: true, fileTree: [], backend: 'remote' })
    expect(localSearchResult).toEqual({
      ok: true,
      backend: 'local',
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
    expect(remoteSearchResult).toEqual({
      ok: true,
      backend: 'remote',
      results: [],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
    expect(localTextSearchResult).toEqual({
      ok: true,
      backend: 'local',
      results: [{ relativePath: 'src/local.ts', lineNumber: 1, snippet: 'needle' }],
      truncated: false,
      skippedLargeDirectoryCount: 0,
      skippedLargeFileCount: 0,
      skippedBinaryFileCount: 0,
      skippedUnreadablePathCount: 0,
      depthLimitHit: false,
      timedOut: false,
    })
  })
})
