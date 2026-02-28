import { describe, expect, it, vi } from 'vitest'
import { RemoteGitBridge } from './remote-git-bridge'

describe('workspace-backend/remote-git-bridge', () => {
  it('forwards git requests to remote transport request handler', async () => {
    const requestRemote = vi.fn(async () => ({ ok: true }))
    const bridge = new RemoteGitBridge({
      workspaceId: 'workspace-a',
      requestRemote,
    })

    await bridge.getGitLineMarkers({
      rootPath: 'remote://workspace-a',
      relativePath: 'src/main.ts',
    })
    await bridge.getGitFileStatuses({
      rootPath: 'remote://workspace-a',
    })

    expect(requestRemote).toHaveBeenNthCalledWith(
      1,
      'workspace-a',
      'workspace.getGitLineMarkers',
      { relativePath: 'src/main.ts' },
    )
    expect(requestRemote).toHaveBeenNthCalledWith(
      2,
      'workspace-a',
      'workspace.getGitFileStatuses',
    )
  })
})
