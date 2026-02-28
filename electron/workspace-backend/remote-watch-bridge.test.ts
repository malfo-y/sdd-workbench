import { describe, expect, it, vi } from 'vitest'
import { RemoteWatchBridge } from './remote-watch-bridge'
import type { RemoteAgentEvent } from '../remote-agent/protocol'

describe('workspace-backend/remote-watch-bridge', () => {
  it('subscribes to remote watch events and forwards payloads', async () => {
    const requestRemote = vi.fn(async () => ({ ok: true, watchMode: 'polling' }))
    const sendWatchEvent = vi.fn()
    const sendWatchFallback = vi.fn()

    const listenerRef: {
      current?: (event: RemoteAgentEvent) => void
    } = {}
    const subscribeAgentEvents = vi.fn(
      (_workspaceId: string, nextListener: (event: RemoteAgentEvent) => void) => {
        listenerRef.current = nextListener
        return () => {
          listenerRef.current = undefined
        }
      },
    )

    const bridge = new RemoteWatchBridge({
      workspaceId: 'workspace-a',
      requestRemote,
      subscribeAgentEvents,
      sendWatchEvent,
      sendWatchFallback,
    })

    const startResult = await bridge.start('auto')

    expect(startResult).toEqual({
      ok: true,
      watchMode: 'polling',
      isRemoteMounted: undefined,
      fallbackApplied: undefined,
      error: undefined,
    })

    const listener = listenerRef.current
    if (typeof listener !== 'function') {
      throw new Error('Expected watch listener to be registered.')
    }

    listener({
      type: 'event',
      event: 'workspace.watchEvent',
      payload: {
        changedRelativePaths: ['src/main.ts'],
        hasStructureChanges: true,
      },
      protocolVersion: '1.0.0',
    })

    listener({
      type: 'event',
      event: 'workspace.watchFallback',
      payload: {
        watchMode: 'polling',
      },
      protocolVersion: '1.0.0',
    })

    expect(sendWatchEvent).toHaveBeenCalledWith({
      workspaceId: 'workspace-a',
      changedRelativePaths: ['src/main.ts'],
      hasStructureChanges: true,
    })
    expect(sendWatchFallback).toHaveBeenCalledWith({
      workspaceId: 'workspace-a',
      watchMode: 'polling',
    })

    await bridge.stop()

    expect(requestRemote).toHaveBeenNthCalledWith(
      1,
      'workspace-a',
      'workspace.watchStart',
      { watchModePreference: 'auto' },
    )
    expect(requestRemote).toHaveBeenNthCalledWith(
      2,
      'workspace-a',
      'workspace.watchStop',
    )
  })
})
