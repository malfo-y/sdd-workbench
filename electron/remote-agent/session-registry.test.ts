import { describe, expect, it, vi } from 'vitest'
import { RemoteSessionRegistry } from './session-registry'

describe('remote-agent/session-registry', () => {
  it('assigns unique sessionId and stores initial state', () => {
    const registry = new RemoteSessionRegistry({
      idGenerator: () => 'session-1',
      now: () => 100,
    })

    const session = registry.createSession({
      workspaceId: 'workspace-a',
      profile: {
        workspaceId: 'workspace-a',
        host: 'example.com',
        remoteRoot: '/repo',
      },
      handle: {
        stop: async () => undefined,
      },
      state: 'connecting',
    })

    expect(session.sessionId).toBe('session-1')
    expect(session.state).toBe('connecting')
    expect(registry.getSession('workspace-a')).toBeTruthy()
  })

  it('tracks state transitions', () => {
    const registry = new RemoteSessionRegistry({
      idGenerator: () => 'session-1',
      now: () => 100,
    })
    registry.createSession({
      workspaceId: 'workspace-a',
      profile: {
        workspaceId: 'workspace-a',
        host: 'example.com',
        remoteRoot: '/repo',
      },
      handle: {
        stop: async () => undefined,
      },
    })

    const updated = registry.updateState('workspace-a', 'degraded', 'TIMEOUT')
    expect(updated.state).toBe('degraded')
    expect(updated.lastErrorCode).toBe('TIMEOUT')
  })

  it('handles duplicate close calls safely', async () => {
    const stop = vi.fn(async () => undefined)
    const registry = new RemoteSessionRegistry({
      idGenerator: () => 'session-1',
      now: () => 100,
    })
    registry.createSession({
      workspaceId: 'workspace-a',
      profile: {
        workspaceId: 'workspace-a',
        host: 'example.com',
        remoteRoot: '/repo',
      },
      handle: {
        stop,
      },
    })

    const [first, second] = await Promise.all([
      registry.closeSession('workspace-a'),
      registry.closeSession('workspace-a'),
    ])

    expect(first).toBe(true)
    expect(second).toBe(true)
    expect(stop).toHaveBeenCalledTimes(1)
    expect(registry.getSession('workspace-a')).toBeUndefined()
  })

  it('closes all active sessions', async () => {
    const stopA = vi.fn(async () => undefined)
    const stopB = vi.fn(async () => undefined)
    const registry = new RemoteSessionRegistry({
      idGenerator: (() => {
        let i = 0
        return () => `session-${++i}`
      })(),
      now: () => 100,
    })

    registry.createSession({
      workspaceId: 'workspace-a',
      profile: {
        workspaceId: 'workspace-a',
        host: 'example.com',
        remoteRoot: '/repo-a',
      },
      handle: { stop: stopA },
    })
    registry.createSession({
      workspaceId: 'workspace-b',
      profile: {
        workspaceId: 'workspace-b',
        host: 'example.com',
        remoteRoot: '/repo-b',
      },
      handle: { stop: stopB },
    })

    await registry.closeAllSessions()

    expect(stopA).toHaveBeenCalledTimes(1)
    expect(stopB).toHaveBeenCalledTimes(1)
    expect(registry.listSessions()).toEqual([])
  })
})
