import { describe, expect, it, vi } from 'vitest'
import { RemoteConnectionService } from './connection-service'
import { RemoteAgentError } from './protocol'
import { createRemoteWorkspaceRootPath } from './types'
import type { RemoteAgentTransport } from './transport-ssh'
import type { RemoteConnectionEvent, RemoteConnectionProfile } from './types'

class FakeTransport implements RemoteAgentTransport {
  readonly start = vi.fn(async () => undefined)
  readonly stop = vi.fn(async () => undefined)
  requestImpl: (
    method: string,
    params?: unknown,
    timeoutMs?: number,
  ) => Promise<unknown> = vi.fn(
    async (method: string, params?: unknown, timeoutMs?: number) => {
      void [method, params, timeoutMs]
      return undefined as unknown
    },
  )
  async request<TResult = unknown>(
    method: string,
    params?: unknown,
    timeoutMs?: number,
  ): Promise<TResult> {
    return (await this.requestImpl(
      method,
      params,
      timeoutMs,
    )) as TResult
  }

  private listeners = new Set<(event: {
    type: 'event'
    event: string
    payload?: unknown
    protocolVersion: string
  }) => void>()

  onEvent(listener: (event: {
    type: 'event'
    event: string
    payload?: unknown
    protocolVersion: string
  }) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

const profile: RemoteConnectionProfile = {
  workspaceId: 'workspace-a',
  host: 'example.com',
  remoteRoot: '/repo',
}

describe('remote-agent/integration-smoke', () => {
  it('connectRemote succeeds and emits connecting/connected events', async () => {
    const transport = new FakeTransport()
    const events: RemoteConnectionEvent[] = []

    const service = new RemoteConnectionService({
      transportFactory: () => transport,
      emitEvent: (event) => {
        events.push(event)
      },
      now: () => 100,
    })

    const result = await service.connect(profile)

    expect(result).toEqual({
      ok: true,
      workspaceId: profile.workspaceId,
      sessionId: expect.any(String),
      rootPath: createRemoteWorkspaceRootPath(profile.workspaceId),
      remoteConnectionState: 'connected',
      state: 'connected',
    })
    expect(transport.start).toHaveBeenCalledTimes(1)
    expect(events.map((event) => event.state)).toEqual([
      'connecting',
      'connected',
    ])
  })

  it('connectRemote returns standard AUTH_FAILED code on startup failure', async () => {
    const transport = new FakeTransport()
    transport.start.mockRejectedValueOnce(
      new RemoteAgentError('AUTH_FAILED', 'Permission denied (publickey).'),
    )

    const service = new RemoteConnectionService({
      transportFactory: () => transport,
    })

    const result = await service.connect(profile)

    expect(result).toEqual({
      ok: false,
      workspaceId: profile.workspaceId,
      errorCode: 'AUTH_FAILED',
      error: 'Permission denied (publickey).',
    })
  })

  it('disconnectRemote stops and cleans up active session', async () => {
    const transport = new FakeTransport()
    const service = new RemoteConnectionService({
      transportFactory: () => transport,
      now: () => 100,
    })

    await service.connect(profile)
    const result = await service.disconnect(profile.workspaceId)

    expect(result).toEqual({
      ok: true,
      workspaceId: profile.workspaceId,
    })
    expect(transport.stop).toHaveBeenCalledTimes(1)
  })

  it('forwards request to active transport', async () => {
    const transport = new FakeTransport()
    const requestSpy = vi.fn(async () => ({ ok: true }))
    transport.requestImpl = requestSpy

    const service = new RemoteConnectionService({
      transportFactory: () => transport,
      now: () => 100,
    })

    await service.connect(profile)
    await service.request(profile.workspaceId, 'workspace.index')

    expect(requestSpy).toHaveBeenCalledWith(
      'workspace.index',
      undefined,
      undefined,
    )
  })
})
