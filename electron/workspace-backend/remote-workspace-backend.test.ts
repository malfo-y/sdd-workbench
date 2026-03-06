import { describe, expect, it, vi } from 'vitest'
import { RemoteAgentError } from '../remote-agent/protocol'
import { createRemoteWorkspaceBackend } from './remote-workspace-backend'

describe('workspace-backend/remote-workspace-backend', () => {
  it('routes file operations to remote RPC methods', async () => {
    const requestRemote = vi.fn(async () => ({ ok: true }))
    const backend = createRemoteWorkspaceBackend({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      requestRemote,
      subscribeAgentEvents: () => () => undefined,
      sendWatchEvent: () => undefined,
      sendWatchFallback: () => undefined,
    })

    await backend.index({ rootPath: 'remote://workspace-a' })
    await backend.searchFiles({
      rootPath: 'remote://workspace-a',
      query: 'main*test',
    })
    await backend.readFile({
      rootPath: 'remote://workspace-a',
      relativePath: 'src/main.ts',
    })
    await backend.rename({
      rootPath: 'remote://workspace-a',
      oldRelativePath: 'src/a.ts',
      newRelativePath: 'src/b.ts',
    })

    expect(requestRemote).toHaveBeenNthCalledWith(
      1,
      'workspace-a',
      'workspace.index',
      undefined,
    )
    expect(requestRemote).toHaveBeenNthCalledWith(
      2,
      'workspace-a',
      'workspace.searchFiles',
      { query: 'main*test' },
    )
    expect(requestRemote).toHaveBeenNthCalledWith(
      3,
      'workspace-a',
      'workspace.readFile',
      { relativePath: 'src/main.ts' },
    )
    expect(requestRemote).toHaveBeenNthCalledWith(
      4,
      'workspace-a',
      'workspace.rename',
      {
        oldRelativePath: 'src/a.ts',
        newRelativePath: 'src/b.ts',
      },
    )
  })

  it('rejects root/path escape attempts with PATH_DENIED', async () => {
    const backend = createRemoteWorkspaceBackend({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      requestRemote: async () => ({ ok: true }),
      subscribeAgentEvents: () => () => undefined,
      sendWatchEvent: () => undefined,
      sendWatchFallback: () => undefined,
    })

    try {
      backend.readFile({
        rootPath: 'remote://workspace-b',
        relativePath: 'src/main.ts',
      })
      throw new Error('Expected root path mismatch to throw.')
    } catch (error) {
      expect(error).toMatchObject({
        code: 'PATH_DENIED',
      })
      expect(String(error)).not.toContain('remote://workspace-a')
    }

    try {
      backend.readFile({
        rootPath: 'remote://workspace-a',
        relativePath: '../outside.ts',
      })
      throw new Error('Expected escaped relative path to throw.')
    } catch (error) {
      expect(error).toMatchObject({
        code: 'PATH_DENIED',
      })
    }
  })

  it('redacts sensitive remote error payloads from request failures', async () => {
    const backend = createRemoteWorkspaceBackend({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      requestRemote: async () => {
        throw new Error(
          'ssh stderr: timeout password=hunter2 /Users/tester/.ssh/id_ed25519',
        )
      },
      subscribeAgentEvents: () => () => undefined,
      sendWatchEvent: () => undefined,
      sendWatchFallback: () => undefined,
    })

    try {
      await backend.index({ rootPath: 'remote://workspace-a' })
      throw new Error('Expected remote request to throw.')
    } catch (error) {
      expect(error).toMatchObject({
        code: 'TIMEOUT',
      })
      const message = error instanceof Error ? error.message : String(error)
      expect(message).toContain('password=[REDACTED]')
      expect(message).toContain('[REDACTED_PATH]')
      expect(message).not.toContain('hunter2')
      expect(message).not.toContain('/Users/tester/.ssh/id_ed25519')
    }
  })

  it('treats watch stop as best-effort when remote session is already disconnected', async () => {
    const requestRemote = vi.fn(async (_workspaceId: string, method: string) => {
      if (method === 'workspace.watchStop') {
        throw new RemoteAgentError(
          'CONNECTION_CLOSED',
          'Remote agent session has been disconnected.',
        )
      }
      return { ok: true }
    })

    const backend = createRemoteWorkspaceBackend({
      workspaceId: 'workspace-a',
      rootPath: 'remote://workspace-a',
      requestRemote,
      subscribeAgentEvents: () => () => undefined,
      sendWatchEvent: () => undefined,
      sendWatchFallback: () => undefined,
    })

    await expect(
      backend.watchStop({ workspaceId: 'workspace-a' }),
    ).resolves.toEqual({ ok: true })
    if (!backend.dispose) {
      throw new Error('Expected remote backend to implement dispose().')
    }
    await expect(backend.dispose()).resolves.toBeUndefined()
  })
})
