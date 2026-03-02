import { PassThrough } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { REMOTE_AGENT_PROTOCOL_VERSION } from '../protocol'
import { parseAgentCliArgs, runRemoteAgent } from './agent-main'

describe('remote-agent/runtime/agent-main', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses stdio mode arguments', () => {
    const parsed = parseAgentCliArgs([
      '--stdio',
      '--protocol-version',
      REMOTE_AGENT_PROTOCOL_VERSION,
      '--workspace-root',
      '/repo',
    ])

    expect(parsed).toEqual({
      kind: 'stdio',
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
      workspaceRoot: '/repo',
    })
  })

  it('prints protocol version and exits 0', async () => {
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()

    const stdoutChunks: string[] = []
    stdout.on('data', (chunk) => {
      stdoutChunks.push(chunk.toString('utf8'))
    })

    const exitCode = await runRemoteAgent(['--protocol-version'], {
      stdin,
      stdout,
      stderr,
    })

    expect(exitCode).toBe(0)
    expect(stdoutChunks.join('')).toBe(`${REMOTE_AGENT_PROTOCOL_VERSION}\n`)
  })

  it('serves request/response over stdio mode', async () => {
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()

    const outputLines: string[] = []
    let pendingBuffer = ''
    stdout.on('data', (chunk) => {
      pendingBuffer += chunk.toString('utf8')
      const lines = pendingBuffer.split('\n')
      pendingBuffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) {
          outputLines.push(line)
        }
      }
    })

    const runPromise = runRemoteAgent(
      [
        '--stdio',
        '--protocol-version',
        REMOTE_AGENT_PROTOCOL_VERSION,
        '--workspace-root',
        process.cwd(),
      ],
      {
        stdin,
        stdout,
        stderr,
      },
    )

    stdin.write(
      `${JSON.stringify({
        type: 'request',
        id: 'req-1',
        method: 'agent.healthcheck',
        protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
      })}\n`,
    )
    stdin.end()

    const exitCode = await runPromise
    expect(exitCode).toBe(0)

    expect(outputLines).toHaveLength(1)
    const response = JSON.parse(outputLines[0]) as {
      type: string
      id: string
      ok: boolean
      result: { ok: boolean }
      protocolVersion: string
    }
    expect(response).toMatchObject({
      type: 'response',
      id: 'req-1',
      ok: true,
      result: {
        ok: true,
      },
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
    })
  })
})
