import { describe, expect, it } from 'vitest'
import { REMOTE_AGENT_PROTOCOL_VERSION } from '../protocol'
import { RuntimeRequestRouter } from './request-router'
import type { RuntimeEventMessage, RuntimeResponseMessage } from './runtime-types'

describe('remote-agent/runtime/request-router', () => {
  it('responds with AGENT_PROTOCOL_MISMATCH on protocol mismatch', async () => {
    const responses: RuntimeResponseMessage[] = []
    const events: RuntimeEventMessage[] = []

    const router = new RuntimeRequestRouter({
      rootPath: process.cwd(),
      emitResponse: (response) => {
        responses.push(response)
      },
      emitEvent: (event) => {
        events.push(event)
      },
    })

    await router.handleMessage({
      type: 'request',
      id: 'req-1',
      method: 'agent.healthcheck',
      protocolVersion: '9.9.9',
    })

    expect(events).toHaveLength(0)
    expect(responses).toEqual([
      {
        type: 'response',
        id: 'req-1',
        ok: false,
        error: {
          code: 'AGENT_PROTOCOL_MISMATCH',
          message: 'Unsupported protocol version: 9.9.9',
        },
        protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
      },
    ])

    await router.dispose()
  })

  it('rejects disallowed methods with PATH_DENIED', async () => {
    const responses: RuntimeResponseMessage[] = []

    const router = new RuntimeRequestRouter({
      rootPath: process.cwd(),
      emitResponse: (response) => {
        responses.push(response)
      },
      emitEvent: () => undefined,
    })

    await router.handleMessage({
      type: 'request',
      id: 'req-2',
      method: 'workspace.execShell',
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
    })

    expect(responses).toHaveLength(1)
    expect(responses[0]).toMatchObject({
      type: 'response',
      id: 'req-2',
      ok: false,
      error: {
        code: 'PATH_DENIED',
      },
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
    })

    await router.dispose()
  })
})
