import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
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

  it('rejects disallowed methods with METHOD_NOT_ALLOWED', async () => {
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
        code: 'METHOD_NOT_ALLOWED',
      },
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
    })

    await router.dispose()
  })

  it('dispatches workspace.searchFiles requests', async () => {
    const responses: RuntimeResponseMessage[] = []
    const events: RuntimeEventMessage[] = []

    const rootPath = process.cwd()
    const router = new RuntimeRequestRouter({
      rootPath,
      emitResponse: (response) => {
        responses.push(response)
      },
      emitEvent: (event) => {
        events.push(event)
      },
    })

    await router.handleMessage({
      type: 'request',
      id: 'req-3',
      method: 'workspace.searchFiles',
      params: {
        query: 'package',
        maxResults: 1,
      },
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
    })

    expect(events).toHaveLength(0)
    expect(responses).toHaveLength(1)
    expect(responses[0]).toMatchObject({
      type: 'response',
      id: 'req-3',
      ok: true,
      result: expect.objectContaining({
        ok: true,
        results: expect.any(Array),
      }),
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
    })

    await router.dispose()
  })

  it('dispatches workspace.searchText requests', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-router-text-search-'))
    const responses: RuntimeResponseMessage[] = []
    const events: RuntimeEventMessage[] = []

    try {
      await writeFile(path.join(rootPath, 'notes.txt'), 'hello Needle\n', 'utf8')

      const router = new RuntimeRequestRouter({
        rootPath,
        emitResponse: (response) => {
          responses.push(response)
        },
        emitEvent: (event) => {
          events.push(event)
        },
      })

      await router.handleMessage({
        type: 'request',
        id: 'req-4',
        method: 'workspace.searchText',
        params: {
          query: 'needle',
        },
        protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
      })

      expect(events).toHaveLength(0)
      expect(responses).toEqual([
        expect.objectContaining({
          type: 'response',
          id: 'req-4',
          ok: true,
          result: expect.objectContaining({
            ok: true,
            results: [
              {
                relativePath: 'notes.txt',
                lineNumber: 1,
                snippet: 'hello Needle',
              },
            ],
          }),
          protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
        }),
      ])

      await router.dispose()
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })

  it('dispatches workspace.watchSetFocusedPaths and rejects unsafe focused paths', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'sdd-router-focused-'))
    const responses: RuntimeResponseMessage[] = []
    const events: RuntimeEventMessage[] = []

    try {
      const router = new RuntimeRequestRouter({
        rootPath,
        emitResponse: (response) => {
          responses.push(response)
        },
        emitEvent: (event) => {
          events.push(event)
        },
      })

      for (const [id, focusedRelativePaths] of [
        ['req-focused-empty', ['']],
        ['req-focused-absolute', [path.join(rootPath, 'outside.ts')]],
        ['req-focused-escape', ['../outside.ts']],
        ['req-focused-valid', ['src/main.ts', 'docs/readme.md']],
      ] as const) {
        await router.handleMessage({
          type: 'request',
          id,
          method: 'workspace.watchSetFocusedPaths',
          params: {
            focusedRelativePaths,
          },
          protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
        })
      }

      expect(events).toHaveLength(0)
      expect(responses).toEqual([
        expect.objectContaining({
          type: 'response',
          id: 'req-focused-empty',
          ok: false,
          error: expect.objectContaining({
            code: 'PATH_DENIED',
          }),
        }),
        expect.objectContaining({
          type: 'response',
          id: 'req-focused-absolute',
          ok: false,
          error: expect.objectContaining({
            code: 'PATH_DENIED',
          }),
        }),
        expect.objectContaining({
          type: 'response',
          id: 'req-focused-escape',
          ok: false,
          error: expect.objectContaining({
            code: 'PATH_DENIED',
          }),
        }),
        expect.objectContaining({
          type: 'response',
          id: 'req-focused-valid',
          ok: true,
          result: { ok: true },
          protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
        }),
      ])

      await router.dispose()
    } finally {
      await rm(rootPath, { recursive: true, force: true })
    }
  })
})
