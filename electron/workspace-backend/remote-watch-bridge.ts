import type { RemoteAgentEvent } from '../remote-agent/protocol'
import type {
  WorkspaceWatchEventPayload,
  WorkspaceWatchFallbackEventPayload,
  WorkspaceWatchModePreference,
} from './types'

type RequestRemote = (
  workspaceId: string,
  method: string,
  params?: unknown,
) => Promise<unknown>

type SubscribeAgentEvents = (
  workspaceId: string,
  listener: (event: RemoteAgentEvent) => void,
) => () => void

type RemoteWatchBridgeOptions = {
  workspaceId: string
  requestRemote: RequestRemote
  subscribeAgentEvents: SubscribeAgentEvents
  sendWatchEvent: (event: WorkspaceWatchEventPayload) => void
  sendWatchFallback: (event: WorkspaceWatchFallbackEventPayload) => void
}

type RemoteWatchStartResult = {
  ok: boolean
  watchMode?: 'native' | 'polling'
  isRemoteMounted?: boolean
  fallbackApplied?: boolean
  error?: string
}

export class RemoteWatchBridge {
  private readonly workspaceId: string
  private readonly requestRemote: RequestRemote
  private readonly subscribeAgentEvents: SubscribeAgentEvents
  private readonly sendWatchEvent: (event: WorkspaceWatchEventPayload) => void
  private readonly sendWatchFallback: (
    event: WorkspaceWatchFallbackEventPayload,
  ) => void

  private unsubscribe: (() => void) | null = null

  constructor(options: RemoteWatchBridgeOptions) {
    this.workspaceId = options.workspaceId
    this.requestRemote = options.requestRemote
    this.subscribeAgentEvents = options.subscribeAgentEvents
    this.sendWatchEvent = options.sendWatchEvent
    this.sendWatchFallback = options.sendWatchFallback
  }

  async start(
    watchModePreference?: WorkspaceWatchModePreference,
  ): Promise<RemoteWatchStartResult> {
    if (!this.unsubscribe) {
      this.unsubscribe = this.subscribeAgentEvents(
        this.workspaceId,
        this.handleAgentEvent,
      )
    }

    const result = await this.requestRemote(
      this.workspaceId,
      'workspace.watchStart',
      {
        watchModePreference,
      },
    )

    if (isRemoteWatchStartResult(result)) {
      return {
        ok: result.ok,
        watchMode: result.watchMode,
        isRemoteMounted: result.isRemoteMounted,
        fallbackApplied: result.fallbackApplied,
        error: result.error,
      }
    }

    return {
      ok: true,
      watchMode: 'polling',
      isRemoteMounted: true,
      fallbackApplied: false,
    }
  }

  async stop(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    await this.requestRemote(this.workspaceId, 'workspace.watchStop')
  }

  private readonly handleAgentEvent = (event: RemoteAgentEvent) => {
    if (event.event === 'workspace.watchEvent' || event.event === 'watch.event') {
      const payload = event.payload
      if (!isRemoteWatchEventPayload(payload)) {
        return
      }

      this.sendWatchEvent({
        workspaceId: this.workspaceId,
        changedRelativePaths: [...payload.changedRelativePaths],
        hasStructureChanges: payload.hasStructureChanges,
      })
      return
    }

    if (
      event.event === 'workspace.watchFallback' ||
      event.event === 'watch.fallback'
    ) {
      const payload = event.payload
      if (!isRemoteWatchFallbackPayload(payload)) {
        return
      }

      this.sendWatchFallback({
        workspaceId: this.workspaceId,
        watchMode: payload.watchMode,
      })
    }
  }
}

type RemoteWatchEventPayload = {
  changedRelativePaths: string[]
  hasStructureChanges: boolean
}

type RemoteWatchFallbackPayload = {
  watchMode: 'native' | 'polling'
}

function isRemoteWatchEventPayload(value: unknown): value is RemoteWatchEventPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RemoteWatchEventPayload>
  return (
    Array.isArray(candidate.changedRelativePaths) &&
    candidate.changedRelativePaths.every((path) => typeof path === 'string') &&
    typeof candidate.hasStructureChanges === 'boolean'
  )
}

function isRemoteWatchFallbackPayload(
  value: unknown,
): value is RemoteWatchFallbackPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RemoteWatchFallbackPayload>
  return candidate.watchMode === 'native' || candidate.watchMode === 'polling'
}

function isRemoteWatchStartResult(value: unknown): value is RemoteWatchStartResult {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RemoteWatchStartResult>
  return typeof candidate.ok === 'boolean'
}
