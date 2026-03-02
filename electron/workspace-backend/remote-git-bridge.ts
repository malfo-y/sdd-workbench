import type {
  WorkspaceGetGitFileStatusesRequest,
  WorkspaceGetGitLineMarkersRequest,
} from './types'

type RequestRemote = (
  workspaceId: string,
  method: string,
  params?: unknown,
) => Promise<unknown>

type RemoteGitBridgeOptions = {
  workspaceId: string
  requestRemote: RequestRemote
}

export class RemoteGitBridge {
  private readonly workspaceId: string
  private readonly requestRemote: RequestRemote

  constructor(options: RemoteGitBridgeOptions) {
    this.workspaceId = options.workspaceId
    this.requestRemote = options.requestRemote
  }

  getGitLineMarkers(
    request: WorkspaceGetGitLineMarkersRequest,
  ): Promise<unknown> {
    return this.requestRemote(this.workspaceId, 'workspace.getGitLineMarkers', {
      relativePath: request.relativePath,
    })
  }

  getGitFileStatuses(
    request: WorkspaceGetGitFileStatusesRequest,
  ): Promise<unknown> {
    void request
    return this.requestRemote(this.workspaceId, 'workspace.getGitFileStatuses')
  }
}
