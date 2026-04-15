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
    return this.requestWorkspaceMethod('workspace.getGitLineMarkers', {
      relativePath: request.relativePath,
    })
  }

  getGitFileStatuses(
    request: WorkspaceGetGitFileStatusesRequest,
  ): Promise<WorkspaceBackendResult<'getGitFileStatuses'>> {
    void request
    return this.requestWorkspaceMethod('workspace.getGitFileStatuses')
  }

  private requestWorkspaceMethod<TResult>(
    method: string,
    params?: unknown,
  ): Promise<TResult> {
    if (params === undefined) {
      return this.requestRemote(this.workspaceId, method) as Promise<TResult>
    }
    return this.requestRemote(this.workspaceId, method, params) as Promise<TResult>
  }
}
