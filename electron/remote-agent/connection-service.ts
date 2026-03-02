import {
  RemoteAgentError,
  toRemoteAgentError,
  type RemoteAgentErrorCode,
  type RemoteAgentEvent,
} from './protocol'
import {
  applyRemoteReliabilityPolicyToProfile,
  loadRemoteReliabilityPolicy,
  type RemoteReliabilityPolicy,
} from './reliability-policy'
import {
  RemoteSessionRegistry,
  type RemoteSessionRecord,
} from './session-registry'
import {
  createSshRemoteAgentTransport,
  type RemoteAgentTransport,
} from './transport-ssh'
import {
  createRemoteWorkspaceRootPath,
  type RemoteConnectResult,
  type RemoteConnectionEvent,
  type RemoteConnectionProfile,
  type RemoteDisconnectResult,
} from './types'

const RECONNECT_BACKOFF_BASE_MS = 500
const RECONNECT_BACKOFF_MAX_MS = 2_000
const TRANSIENT_RETRY_ERROR_CODES = new Set<RemoteAgentErrorCode>([
  'TIMEOUT',
  'CONNECTION_CLOSED',
])
const FATAL_ERROR_CODES = new Set<RemoteAgentErrorCode>([
  'AUTH_FAILED',
  'AGENT_PROTOCOL_MISMATCH',
  'PATH_DENIED',
  'BOOTSTRAP_FAILED',
])

type WaitFor = (durationMs: number) => Promise<void>

type RemoteConnectionServiceOptions = {
  registry?: RemoteSessionRegistry
  transportFactory?: (profile: RemoteConnectionProfile) => RemoteAgentTransport
  emitEvent?: (event: RemoteConnectionEvent) => void
  now?: () => number
  policy?: RemoteReliabilityPolicy
  waitFor?: WaitFor
}

export class RemoteConnectionService {
  private readonly registry: RemoteSessionRegistry
  private readonly transportFactory: (
    profile: RemoteConnectionProfile,
  ) => RemoteAgentTransport
  private readonly emitEvent: (event: RemoteConnectionEvent) => void
  private readonly now: () => number
  private readonly policy: RemoteReliabilityPolicy
  private readonly waitFor: WaitFor

  private readonly transportByWorkspaceId = new Map<string, RemoteAgentTransport>()
  private readonly removeTransportListenerByWorkspaceId = new Map<
    string,
    () => void
  >()
  private readonly externalAgentListenersByWorkspaceId = new Map<
    string,
    Set<(event: RemoteAgentEvent) => void>
  >()
  private readonly connectRunTokenByWorkspaceId = new Map<string, symbol>()

  constructor(options: RemoteConnectionServiceOptions = {}) {
    this.registry = options.registry ?? new RemoteSessionRegistry()
    this.transportFactory =
      options.transportFactory ?? createSshRemoteAgentTransport
    this.emitEvent = options.emitEvent ?? (() => undefined)
    this.now = options.now ?? Date.now
    this.policy = options.policy ?? loadRemoteReliabilityPolicy()
    this.waitFor = options.waitFor ?? defaultWaitFor
  }

  async connect(profile: RemoteConnectionProfile): Promise<RemoteConnectResult> {
    const workspaceId = profile.workspaceId?.trim()
    if (!workspaceId || !profile.host?.trim() || !profile.remoteRoot?.trim()) {
      return {
        ok: false,
        workspaceId: workspaceId ?? '',
        errorCode: 'UNKNOWN',
        error: 'workspaceId, host, and remoteRoot are required.',
      }
    }

    const effectiveProfile = applyRemoteReliabilityPolicyToProfile(
      {
        ...profile,
        workspaceId,
        host: profile.host.trim(),
        remoteRoot: profile.remoteRoot.trim(),
      },
      this.policy,
    )
    const rootPath = createRemoteWorkspaceRootPath(workspaceId)
    const connectRunToken = this.startConnectRun(workspaceId)

    await this.cleanupWorkspaceTransport(workspaceId)
    await this.registry.closeSession(workspaceId)

    let session: RemoteSessionRecord | null = null

    try {
      session = this.registry.createSession({
        workspaceId,
        profile: effectiveProfile,
        handle: {
          stop: () => this.cleanupWorkspaceTransport(workspaceId),
        },
        state: 'connecting',
      })

      this.emitConnectionEvent({
        workspaceId,
        sessionId: session.sessionId,
        state: 'connecting',
      })

      const maxReconnectAttempts = this.policy.reconnectAttempts

      for (let attempt = 0; attempt <= maxReconnectAttempts; attempt += 1) {
        this.assertConnectRunActive(workspaceId, connectRunToken)
        const transport = this.transportFactory(effectiveProfile)
        const activeSession = session
        const removeTransportListener = transport.onEvent((agentEvent) => {
          this.handleTransportEvent(workspaceId, activeSession, agentEvent)
        })

        this.transportByWorkspaceId.set(workspaceId, transport)
        this.removeTransportListenerByWorkspaceId.set(
          workspaceId,
          removeTransportListener,
        )

        try {
          await transport.start()
          this.assertConnectRunActive(workspaceId, connectRunToken)

          this.registry.updateState(workspaceId, 'connected')
          this.emitConnectionEvent({
            workspaceId,
            sessionId: session.sessionId,
            state: 'connected',
          })

          return {
            ok: true,
            workspaceId,
            sessionId: session.sessionId,
            rootPath,
            remoteConnectionState: 'connected',
            state: 'connected',
          }
        } catch (error) {
          const normalized = toRemoteAgentError(error)
          await this.cleanupWorkspaceTransport(workspaceId)

          const isLastAttempt = attempt >= maxReconnectAttempts
          const shouldRetry = this.shouldRetry(normalized.code, isLastAttempt)
          if (!shouldRetry) {
            await this.registry.closeSession(workspaceId)
            this.emitConnectionEvent({
              workspaceId,
              sessionId: session.sessionId,
              state: 'disconnected',
              errorCode: normalized.code,
              message: normalized.message,
            })

            return {
              ok: false,
              workspaceId,
              errorCode: normalized.code,
              error: normalized.message,
            }
          }

          this.safeUpdateState(workspaceId, 'degraded', normalized.code)
          this.emitConnectionEvent({
            workspaceId,
            sessionId: session.sessionId,
            state: 'degraded',
            errorCode: normalized.code,
            message: normalized.message,
          })

          const backoffMs = this.calculateReconnectBackoffMs(attempt)
          await this.waitFor(backoffMs)
          this.assertConnectRunActive(workspaceId, connectRunToken)

          this.safeUpdateState(workspaceId, 'connecting')
          this.emitConnectionEvent({
            workspaceId,
            sessionId: session.sessionId,
            state: 'connecting',
          })
        }
      }

      await this.registry.closeSession(workspaceId)
      this.emitConnectionEvent({
        workspaceId,
        sessionId: session.sessionId,
        state: 'disconnected',
        errorCode: 'CONNECTION_CLOSED',
        message: 'Remote connection was interrupted.',
      })

      return {
        ok: false,
        workspaceId,
        errorCode: 'CONNECTION_CLOSED',
        error: 'Remote connection was interrupted.',
      }
    } catch (error) {
      const normalized =
        error instanceof RemoteAgentError
          ? error
          : toRemoteAgentError(error, 'CONNECTION_CLOSED')
      await this.cleanupWorkspaceTransport(workspaceId)
      if (session) {
        await this.registry.closeSession(workspaceId)
      }

      this.emitConnectionEvent({
        workspaceId,
        sessionId: session?.sessionId,
        state: 'disconnected',
        errorCode: normalized.code,
        message: normalized.message,
      })

      return {
        ok: false,
        workspaceId,
        errorCode: normalized.code,
        error: normalized.message,
      }
    } finally {
      this.finishConnectRun(workspaceId, connectRunToken)
    }
  }

  async disconnect(workspaceId: string): Promise<RemoteDisconnectResult> {
    const normalizedWorkspaceId = workspaceId.trim()
    if (!normalizedWorkspaceId) {
      return {
        ok: false,
        workspaceId,
        error: 'workspaceId is required.',
      }
    }

    try {
      this.cancelConnectRun(normalizedWorkspaceId)
      await this.cleanupWorkspaceTransport(normalizedWorkspaceId)
      await this.registry.closeSession(normalizedWorkspaceId)
      this.emitConnectionEvent({
        workspaceId: normalizedWorkspaceId,
        state: 'disconnected',
      })

      return {
        ok: true,
        workspaceId: normalizedWorkspaceId,
      }
    } catch (error) {
      const normalized =
        error instanceof RemoteAgentError
          ? error
          : toRemoteAgentError(error, 'CONNECTION_CLOSED')

      this.emitConnectionEvent({
        workspaceId: normalizedWorkspaceId,
        state: 'disconnected',
        errorCode: normalized.code,
        message: normalized.message,
      })

      return {
        ok: false,
        workspaceId: normalizedWorkspaceId,
        error: normalized.message,
      }
    }
  }

  async request(
    workspaceId: string,
    method: string,
    params?: unknown,
    timeoutMs?: number,
  ): Promise<unknown> {
    const transport = this.transportByWorkspaceId.get(workspaceId)
    if (!transport) {
      throw new RemoteAgentError(
        'CONNECTION_CLOSED',
        `Remote session is not active for workspace "${workspaceId}".`,
      )
    }

    return transport.request(method, params, timeoutMs)
  }

  onAgentEvent(
    workspaceId: string,
    listener: (event: RemoteAgentEvent) => void,
  ): () => void {
    const listeners =
      this.externalAgentListenersByWorkspaceId.get(workspaceId) ?? new Set()

    listeners.add(listener)
    this.externalAgentListenersByWorkspaceId.set(workspaceId, listeners)

    return () => {
      const current = this.externalAgentListenersByWorkspaceId.get(workspaceId)
      if (!current) {
        return
      }

      current.delete(listener)
      if (current.size === 0) {
        this.externalAgentListenersByWorkspaceId.delete(workspaceId)
      }
    }
  }

  async shutdown(): Promise<void> {
    for (const workspaceId of this.connectRunTokenByWorkspaceId.keys()) {
      this.cancelConnectRun(workspaceId)
    }

    await Promise.all(
      Array.from(this.transportByWorkspaceId.keys()).map(async (workspaceId) =>
        this.cleanupWorkspaceTransport(workspaceId),
      ),
    )
    await this.registry.closeAllSessions()
  }

  private handleTransportEvent(
    workspaceId: string,
    session: RemoteSessionRecord,
    agentEvent: RemoteAgentEvent,
  ): void {
    if (agentEvent.event === 'session.degraded') {
      this.safeUpdateState(workspaceId, 'degraded')
      this.emitConnectionEvent({
        workspaceId,
        sessionId: session.sessionId,
        state: 'degraded',
      })
    }

    if (agentEvent.event === 'session.disconnected') {
      this.safeUpdateState(workspaceId, 'disconnected', 'CONNECTION_CLOSED')
      this.emitConnectionEvent({
        workspaceId,
        sessionId: session.sessionId,
        state: 'disconnected',
        errorCode: 'CONNECTION_CLOSED',
        message: 'Remote session disconnected.',
      })
      void this.cleanupWorkspaceTransport(workspaceId)
    }

    const externalListeners = this.externalAgentListenersByWorkspaceId.get(workspaceId)
    if (!externalListeners) {
      return
    }

    for (const listener of externalListeners) {
      listener(agentEvent)
    }
  }

  private emitConnectionEvent(event: {
    workspaceId: string
    sessionId?: string
    state: 'connecting' | 'connected' | 'degraded' | 'disconnected'
    errorCode?: RemoteAgentErrorCode
    message?: string
  }): void {
    this.emitEvent({
      ...event,
      occurredAt: new Date(this.now()).toISOString(),
    })
  }

  private safeUpdateState(
    workspaceId: string,
    state: 'connecting' | 'connected' | 'degraded' | 'disconnected',
    lastErrorCode?: RemoteAgentErrorCode,
  ): void {
    try {
      this.registry.updateState(workspaceId, state, lastErrorCode)
    } catch {
      // Ignore stale updates from already-closed sessions.
    }
  }

  private async cleanupWorkspaceTransport(workspaceId: string): Promise<void> {
    const removeListener = this.removeTransportListenerByWorkspaceId.get(workspaceId)
    if (removeListener) {
      removeListener()
      this.removeTransportListenerByWorkspaceId.delete(workspaceId)
    }

    const transport = this.transportByWorkspaceId.get(workspaceId)
    if (transport) {
      this.transportByWorkspaceId.delete(workspaceId)
      await transport.stop()
    }

    this.externalAgentListenersByWorkspaceId.delete(workspaceId)
  }

  private shouldRetry(errorCode: RemoteAgentErrorCode, isLastAttempt: boolean): boolean {
    if (isLastAttempt) {
      return false
    }
    if (FATAL_ERROR_CODES.has(errorCode)) {
      return false
    }
    return TRANSIENT_RETRY_ERROR_CODES.has(errorCode)
  }

  private calculateReconnectBackoffMs(attempt: number): number {
    const exponentialDelay =
      RECONNECT_BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attempt))
    return Math.min(RECONNECT_BACKOFF_MAX_MS, exponentialDelay)
  }

  private startConnectRun(workspaceId: string): symbol {
    const runToken = Symbol(`connect-${workspaceId}`)
    this.connectRunTokenByWorkspaceId.set(workspaceId, runToken)
    return runToken
  }

  private finishConnectRun(workspaceId: string, runToken: symbol): void {
    if (this.connectRunTokenByWorkspaceId.get(workspaceId) === runToken) {
      this.connectRunTokenByWorkspaceId.delete(workspaceId)
    }
  }

  private cancelConnectRun(workspaceId: string): void {
    this.connectRunTokenByWorkspaceId.delete(workspaceId)
  }

  private assertConnectRunActive(workspaceId: string, runToken: symbol): void {
    if (this.connectRunTokenByWorkspaceId.get(workspaceId) === runToken) {
      return
    }

    throw new RemoteAgentError(
      'CONNECTION_CLOSED',
      `Connect attempt was interrupted for workspace "${workspaceId}".`,
    )
  }
}

function defaultWaitFor(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  })
}
