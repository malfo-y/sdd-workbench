import type { RemoteAgentErrorCode } from './protocol'
import type { RemoteConnectionProfile, RemoteConnectionState } from './types'

export interface RemoteSessionHandle {
  stop: () => Promise<void>
}

type RemoteSessionInternal = {
  sessionId: string
  workspaceId: string
  profile: RemoteConnectionProfile
  state: RemoteConnectionState
  handle: RemoteSessionHandle
  createdAt: number
  updatedAt: number
  lastErrorCode?: RemoteAgentErrorCode
  closePromise: Promise<void> | null
}

export type RemoteSessionRecord = Omit<RemoteSessionInternal, 'closePromise'>

type CreateSessionInput = {
  workspaceId: string
  profile: RemoteConnectionProfile
  handle: RemoteSessionHandle
  state?: Extract<RemoteConnectionState, 'connecting' | 'connected'>
}

type RemoteSessionRegistryOptions = {
  idGenerator?: () => string
  now?: () => number
}

export class RemoteSessionRegistry {
  private readonly sessionsByWorkspaceId = new Map<string, RemoteSessionInternal>()
  private readonly idGenerator: () => string
  private readonly now: () => number

  constructor(options: RemoteSessionRegistryOptions = {}) {
    this.idGenerator = options.idGenerator ?? defaultSessionIdGenerator
    this.now = options.now ?? Date.now
  }

  createSession(input: CreateSessionInput): RemoteSessionRecord {
    const workspaceId = input.workspaceId.trim()
    if (!workspaceId) {
      throw new Error('workspaceId is required.')
    }
    if (this.sessionsByWorkspaceId.has(workspaceId)) {
      throw new Error(`Session already exists for workspace "${workspaceId}".`)
    }

    const now = this.now()
    const session: RemoteSessionInternal = {
      sessionId: this.idGenerator(),
      workspaceId,
      profile: input.profile,
      state: input.state ?? 'connecting',
      handle: input.handle,
      createdAt: now,
      updatedAt: now,
      closePromise: null,
    }
    this.sessionsByWorkspaceId.set(workspaceId, session)
    return toPublicSessionRecord(session)
  }

  getSession(workspaceId: string): RemoteSessionRecord | undefined {
    const session = this.sessionsByWorkspaceId.get(workspaceId)
    if (!session) {
      return undefined
    }
    return toPublicSessionRecord(session)
  }

  listSessions(): RemoteSessionRecord[] {
    return Array.from(this.sessionsByWorkspaceId.values()).map(toPublicSessionRecord)
  }

  updateState(
    workspaceId: string,
    nextState: RemoteConnectionState,
    lastErrorCode?: RemoteAgentErrorCode,
  ): RemoteSessionRecord {
    const session = this.sessionsByWorkspaceId.get(workspaceId)
    if (!session) {
      throw new Error(`Session not found for workspace "${workspaceId}".`)
    }

    session.state = nextState
    session.updatedAt = this.now()
    session.lastErrorCode = lastErrorCode
    return toPublicSessionRecord(session)
  }

  async closeSession(workspaceId: string): Promise<boolean> {
    const session = this.sessionsByWorkspaceId.get(workspaceId)
    if (!session) {
      return false
    }

    if (!session.closePromise) {
      session.state = 'disconnected'
      session.updatedAt = this.now()
      session.closePromise = Promise.resolve()
        .then(async () => {
          await session.handle.stop()
        })
        .finally(() => {
          this.sessionsByWorkspaceId.delete(workspaceId)
        })
    }

    await session.closePromise
    return true
  }

  async closeAllSessions(): Promise<void> {
    const workspaceIds = Array.from(this.sessionsByWorkspaceId.keys())
    await Promise.all(workspaceIds.map(async (workspaceId) => this.closeSession(workspaceId)))
  }
}

function defaultSessionIdGenerator(): string {
  return `remote-${Math.random().toString(36).slice(2, 10)}`
}

function toPublicSessionRecord(session: RemoteSessionInternal): RemoteSessionRecord {
  return {
    sessionId: session.sessionId,
    workspaceId: session.workspaceId,
    profile: session.profile,
    state: session.state,
    handle: session.handle,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastErrorCode: session.lastErrorCode,
  }
}
