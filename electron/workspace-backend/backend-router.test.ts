import { describe, expect, it, vi } from 'vitest'
import { WorkspaceBackendRouter } from './backend-router'
import type { WorkspaceBackend } from './types'

function createBackend(kind: 'local' | 'remote', onDispose?: () => Promise<void>): WorkspaceBackend {
  return {
    kind,
    index: async () => ({ ok: true }),
    indexDirectory: async () => ({ ok: true }),
    readFile: async () => ({ ok: true }),
    writeFile: async () => ({ ok: true }),
    createFile: async () => ({ ok: true }),
    createDirectory: async () => ({ ok: true }),
    deleteFile: async () => ({ ok: true }),
    deleteDirectory: async () => ({ ok: true }),
    rename: async () => ({ ok: true }),
    getGitLineMarkers: async () => ({ ok: true }),
    getGitFileStatuses: async () => ({ ok: true }),
    readComments: async () => ({ ok: true }),
    writeComments: async () => ({ ok: true }),
    readGlobalComments: async () => ({ ok: true }),
    writeGlobalComments: async () => ({ ok: true }),
    exportCommentsBundle: async () => ({ ok: true }),
    watchStart: async () => ({ ok: true }),
    watchStop: async () => ({ ok: true }),
    dispose: onDispose,
  }
}

describe('workspace-backend/backend-router', () => {
  it('returns local backend when root path is not registered as remote', () => {
    const localBackend = createBackend('local')
    const router = new WorkspaceBackendRouter(localBackend)

    expect(router.resolveByRootPath('/Users/tester/project').kind).toBe('local')
  })

  it('returns remote backend for registered root path', () => {
    const localBackend = createBackend('local')
    const remoteBackend = createBackend('remote')
    const router = new WorkspaceBackendRouter(localBackend)

    router.registerRemoteWorkspace({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      backend: remoteBackend,
    })

    expect(router.resolveByRootPath('remote://workspace-a').kind).toBe('remote')
    expect(router.getRemoteRootPath('workspace-a')).toBe('remote://workspace-a')
  })

  it('disposes backend when unregistering remote workspace', async () => {
    const dispose = vi.fn(async () => undefined)
    const localBackend = createBackend('local')
    const remoteBackend = createBackend('remote', dispose)
    const router = new WorkspaceBackendRouter(localBackend)

    router.registerRemoteWorkspace({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      backend: remoteBackend,
    })

    const removed = await router.unregisterRemoteWorkspaceByWorkspaceId('workspace-a')

    expect(removed).toBe(true)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(() => router.resolveByRootPath('remote://workspace-a')).toThrow(
      /Remote workspace backend is not registered/,
    )
  })

  it('does not reject when dispose fails during clearRemoteWorkspaces', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const dispose = vi.fn(async () => {
      throw new Error('already disconnected')
    })
    const localBackend = createBackend('local')
    const remoteBackend = createBackend('remote', dispose)
    const router = new WorkspaceBackendRouter(localBackend)

    router.registerRemoteWorkspace({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      backend: remoteBackend,
    })

    await expect(router.clearRemoteWorkspaces()).resolves.toBeUndefined()
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })

  it('throws when resolving an unregistered remote root path', () => {
    const localBackend = createBackend('local')
    const router = new WorkspaceBackendRouter(localBackend)

    expect(() => router.resolveByRootPath('remote://workspace-z')).toThrow(
      /Remote workspace backend is not registered/,
    )
  })
})
