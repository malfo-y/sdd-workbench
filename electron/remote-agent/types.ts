export type RemoteConnectionState =
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'disconnected'

export type RemoteConnectionProfile = {
  workspaceId: string
  host: string
  remoteRoot: string
  user?: string
  port?: number
  agentPath?: string
  identityFile?: string
  requestTimeoutMs?: number
  connectTimeoutMs?: number
}

export type RemoteConnectionEvent = {
  workspaceId: string
  sessionId?: string
  state: RemoteConnectionState
  errorCode?: string
  message?: string
  occurredAt: string
}

export type RemoteConnectResult =
  | {
      ok: true
      workspaceId: string
      sessionId: string
      rootPath: string
      remoteConnectionState: Extract<RemoteConnectionState, 'connected' | 'degraded'>
      state: Extract<RemoteConnectionState, 'connected' | 'degraded'>
    }
  | {
      ok: false
      workspaceId: string
      errorCode: string
      error: string
    }

export type RemoteDisconnectResult = {
  ok: boolean
  workspaceId: string
  error?: string
}

export function createRemoteWorkspaceRootPath(workspaceId: string): string {
  return `remote://${encodeURIComponent(workspaceId)}`
}
