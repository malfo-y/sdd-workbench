import { describe, expect, it, vi } from 'vitest'
import { RemoteConnectionService } from './connection-service'
import { RemoteAgentError } from './protocol'
import type { RemoteConnectionEvent, RemoteConnectionProfile } from './types'
import type { RemoteAgentTransport } from './transport-ssh'

class FakeTransport implements RemoteAgentTransport {
  readonly start: () => Promise<void>
  readonly stop = vi.fn(async () => undefined)

  constructor(startImpl?: () => Promise<void>) {
    this.start = startImpl ?? (async () => undefined)
  }

  async request<TResult = unknown>(
    _method: string,
    _params?: unknown,
    _timeoutMs?: number,
  ): Promise<TResult> {
    void [_method, _params, _timeoutMs]
    return undefined as TResult
  }

  onEvent(
    _listener: (event: {
      type: 'event'
      event: string
      payload?: unknown
      protocolVersion: string
    }) => void,
  ): () => void {
    void _listener
    return () => undefined
  }
}

const profile: RemoteConnectionProfile = {
  workspaceId: 'workspace-a',
  host: 'example.com',
  remoteRoot: '/repo',
}

describe('remote-agent/connection-service', () => {
  it('recovers from transient startup failure with backoff retry', async () => {
    vi.useFakeTimers()

    const events: RemoteConnectionEvent[] = []
    const transports: FakeTransport[] = []
    const transportFactory = vi.fn(() => {
      if (transports.length === 0) {
        const transport = new FakeTransport(async () => {
          throw new RemoteAgentError('TIMEOUT', 'connect timeout')
        })
        transports.push(transport)
        return transport
      }
      const transport = new FakeTransport(async () => undefined)
      transports.push(transport)
      return transport
    })

    const service = new RemoteConnectionService({
      transportFactory,
      emitEvent: (event) => {
        events.push(event)
      },
      policy: {
        connectTimeoutMs: 12_000,
        requestTimeoutMs: 18_000,
        reconnectAttempts: 2,
      },
      now: () => 100,
    })

    const connectPromise = service.connect(profile)
    await vi.advanceTimersByTimeAsync(500)
    const result = await connectPromise
    vi.useRealTimers()

    expect(result).toMatchObject({
      ok: true,
      workspaceId: profile.workspaceId,
      remoteConnectionState: 'connected',
    })
    expect(transportFactory).toHaveBeenCalledTimes(2)
    expect(transports[0]?.stop).toHaveBeenCalledTimes(1)
    expect(events.map((event) => event.state)).toEqual([
      'connecting',
      'degraded',
      'connecting',
      'connected',
    ])
  })

  it('fails immediately for fatal AUTH_FAILED errors', async () => {
    const events: RemoteConnectionEvent[] = []
    const transport = new FakeTransport(async () => {
      throw new RemoteAgentError('AUTH_FAILED', 'Permission denied')
    })

    const service = new RemoteConnectionService({
      transportFactory: () => transport,
      emitEvent: (event) => {
        events.push(event)
      },
      policy: {
        connectTimeoutMs: 10_000,
        requestTimeoutMs: 15_000,
        reconnectAttempts: 3,
      },
      now: () => 100,
    })

    const result = await service.connect(profile)

    expect(result).toEqual({
      ok: false,
      workspaceId: profile.workspaceId,
      errorCode: 'AUTH_FAILED',
      error: 'Permission denied',
    })
    expect(transport.stop).toHaveBeenCalledTimes(1)
    expect(events.map((event) => event.state)).toEqual([
      'connecting',
      'disconnected',
    ])
  })

  it('disconnects after exceeding retry attempt limit on transient failures', async () => {
    vi.useFakeTimers()

    const events: RemoteConnectionEvent[] = []
    const transports: FakeTransport[] = []
    const transportFactory = vi.fn(() => {
      const transport = new FakeTransport(async () => {
        throw new RemoteAgentError('CONNECTION_CLOSED', 'socket closed')
      })
      transports.push(transport)
      return transport
    })

    const service = new RemoteConnectionService({
      transportFactory,
      emitEvent: (event) => {
        events.push(event)
      },
      policy: {
        connectTimeoutMs: 10_000,
        requestTimeoutMs: 15_000,
        reconnectAttempts: 2,
      },
      now: () => 100,
    })

    const connectPromise = service.connect(profile)
    await vi.advanceTimersByTimeAsync(1_500)
    const result = await connectPromise
    vi.useRealTimers()

    expect(result).toEqual({
      ok: false,
      workspaceId: profile.workspaceId,
      errorCode: 'CONNECTION_CLOSED',
      error: 'socket closed',
    })
    expect(transportFactory).toHaveBeenCalledTimes(3)
    expect(transports.every((transport) => transport.stop.mock.calls.length === 1)).toBe(
      true,
    )
    expect(events.map((event) => event.state)).toEqual([
      'connecting',
      'degraded',
      'connecting',
      'degraded',
      'connecting',
      'disconnected',
    ])
  })

  it('stops transport and emits disconnected on explicit disconnect', async () => {
    const events: RemoteConnectionEvent[] = []
    const transport = new FakeTransport(async () => undefined)
    const service = new RemoteConnectionService({
      transportFactory: () => transport,
      emitEvent: (event) => {
        events.push(event)
      },
      now: () => 100,
    })

    await service.connect(profile)
    const result = await service.disconnect(profile.workspaceId)

    expect(result).toEqual({
      ok: true,
      workspaceId: profile.workspaceId,
    })
    expect(transport.stop).toHaveBeenCalledTimes(1)
    expect(events.at(-1)?.state).toBe('disconnected')
  })
})
