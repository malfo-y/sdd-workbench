import type { WorkspaceBackend } from './types'

type RemoteWorkspaceRegistration = {
  workspaceId: string
  rootPath: string
  backend: WorkspaceBackend
}

export class WorkspaceBackendRouter {
  private readonly localBackend: WorkspaceBackend
  private readonly remoteBackendByRootPath = new Map<string, WorkspaceBackend>()
  private readonly remoteRootPathByWorkspaceId = new Map<string, string>()

  constructor(localBackend: WorkspaceBackend) {
    this.localBackend = localBackend
  }

  resolveByRootPath(rootPath: string): WorkspaceBackend {
    const remoteBackend = this.remoteBackendByRootPath.get(rootPath)
    if (remoteBackend) {
      return remoteBackend
    }
    return this.localBackend
  }

  registerRemoteWorkspace(registration: RemoteWorkspaceRegistration): void {
    const workspaceId = registration.workspaceId.trim()
    const rootPath = registration.rootPath.trim()
    if (!workspaceId || !rootPath) {
      throw new Error('workspaceId and rootPath are required for remote registration.')
    }

    const previousRootPath = this.remoteRootPathByWorkspaceId.get(workspaceId)
    if (previousRootPath && previousRootPath !== rootPath) {
      const previousBackend = this.remoteBackendByRootPath.get(previousRootPath)
      if (previousBackend?.dispose) {
        void previousBackend.dispose()
      }
      this.remoteBackendByRootPath.delete(previousRootPath)
    }

    this.remoteRootPathByWorkspaceId.set(workspaceId, rootPath)
    this.remoteBackendByRootPath.set(rootPath, registration.backend)
  }

  getRemoteRootPath(workspaceId: string): string | undefined {
    return this.remoteRootPathByWorkspaceId.get(workspaceId)
  }

  async unregisterRemoteWorkspaceByWorkspaceId(workspaceId: string): Promise<boolean> {
    const rootPath = this.remoteRootPathByWorkspaceId.get(workspaceId)
    if (!rootPath) {
      return false
    }

    this.remoteRootPathByWorkspaceId.delete(workspaceId)
    const backend = this.remoteBackendByRootPath.get(rootPath)
    this.remoteBackendByRootPath.delete(rootPath)

    if (backend?.dispose) {
      await backend.dispose()
    }

    return true
  }

  async clearRemoteWorkspaces(): Promise<void> {
    const workspaceIds = Array.from(this.remoteRootPathByWorkspaceId.keys())
    await Promise.all(
      workspaceIds.map(async (workspaceId) =>
        this.unregisterRemoteWorkspaceByWorkspaceId(workspaceId),
      ),
    )
  }
}
