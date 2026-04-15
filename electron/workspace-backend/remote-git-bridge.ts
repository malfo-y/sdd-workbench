import type {
  WorkspaceBackendResult,
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
  ): Promise<WorkspaceBackendResult<'getGitLineMarkers'>> {
    return this.requestRemote(
      this.workspaceId,
      'workspace.getGitLineMarkers',
      {
        relativePath: request.relativePath,
      },
    ) as Promise<WorkspaceBackendResult<'getGitLineMarkers'>>
  }

  getGitFileStatuses(
    request: WorkspaceGetGitFileStatusesRequest,
  ): Promise<WorkspaceBackendResult<'getGitFileStatuses'>> {
    void request
    return this.requestRemote(
      this.workspaceId,
      'workspace.getGitFileStatuses',
    ) as Promise<WorkspaceBackendResult<'getGitFileStatuses'>>
  }
}
