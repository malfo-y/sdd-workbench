import { describe, expect, it } from 'vitest'
import { createLocalWorkspaceBackend } from './local-workspace-backend'
import { WorkspaceBackendRouter } from './backend-router'
import { createRemoteWorkspaceBackend } from './remote-workspace-backend'

describe('workspace-backend/backend-integration', () => {
  it('routes local and remote index calls to each backend', async () => {
    const localBackend = createLocalWorkspaceBackend({
      index: async () => ({ ok: true, backend: 'local' }),
      indexDirectory: async () => ({ ok: true }),
      readFile: async () => ({ ok: true }),
      writeFile: async () => ({ ok: true }),
      createFile: async () => ({ ok: true }),
      createDirectory: async () => ({ ok: true }),
      deleteFile: async () => ({ ok: true }),
      deleteDirectory: async () => ({ ok: true }),
      rename: async () => ({ ok: true }),
      searchFiles: async () => ({ ok: true, backend: 'local', results: [] }),
      getGitLineMarkers: async () => ({ ok: true }),
      getGitFileStatuses: async () => ({ ok: true }),
      readComments: async () => ({ ok: true }),
      writeComments: async () => ({ ok: true }),
      readGlobalComments: async () => ({ ok: true }),
      writeGlobalComments: async () => ({ ok: true }),
      exportCommentsBundle: async () => ({ ok: true }),
      watchStart: async () => ({ ok: true }),
      watchStop: async () => ({ ok: true }),
    })

    const router = new WorkspaceBackendRouter(localBackend)

    const remoteBackend = createRemoteWorkspaceBackend({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      requestRemote: async (_workspaceId, method) => {
        if (method === 'workspace.index') {
          return { ok: true, backend: 'remote' }
        }
        if (method === 'workspace.searchFiles') {
          return { ok: true, backend: 'remote', results: [] }
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

    expect(localResult).toEqual({ ok: true, backend: 'local' })
    expect(remoteResult).toEqual({ ok: true, backend: 'remote' })
    expect(localSearchResult).toEqual({ ok: true, backend: 'local', results: [] })
    expect(remoteSearchResult).toEqual({ ok: true, backend: 'remote', results: [] })
  })
})
