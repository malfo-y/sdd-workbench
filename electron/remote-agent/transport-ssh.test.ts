import { PassThrough } from 'node:stream'
import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { REMOTE_AGENT_PROTOCOL_VERSION, RemoteAgentError } from './protocol'
import {
  buildSshProcessArgs,
  createSshRemoteAgentTransport,
} from './transport-ssh'
import type { RemoteConnectionProfile } from './types'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import type { RemoteAgentBootstrapResult } from './bootstrap'

class FakeChildProcess extends EventEmitter {
  readonly stdin = new PassThrough()
  readonly stdout = new PassThrough()
  readonly stderr = new PassThrough()

  readonly kill = vi.fn((signal?: number | NodeJS.Signals) => {
    this.emit('exit', 0, signal ?? null)
    return true
  })

  asChildProcess(): ChildProcessWithoutNullStreams {
    return this as unknown as ChildProcessWithoutNullStreams
  }
}

const profile: RemoteConnectionProfile = {
  workspaceId: 'workspace-a',
  host: 'example.com',
  remoteRoot: '/repo',
}

const bootstrapResult: RemoteAgentBootstrapResult = {
  agentPath: '/agent',
  protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
  installed: false,
}

describe('remote-agent/transport-ssh', () => {
  it('adds -i and IdentitiesOnly=yes when identityFile is provided', () => {
    const args = buildSshProcessArgs(
      {
        ...profile,
        user: 'tester',
        port: 2222,
        identityFile: '~/.ssh/id_ed25519',
      },
      bootstrapResult,
    )

    expect(args).toEqual([
      '-p',
      '2222',
      '-i',
      '~/.ssh/id_ed25519',
      '-o',
      'IdentitiesOnly=yes',
      '-o',
      'ConnectTimeout=10',
      'tester@example.com',
      'sh',
      '-lc',
      `/agent --stdio --protocol-version ${REMOTE_AGENT_PROTOCOL_VERSION} --workspace-root '/repo'`,
    ])
  })

  it('keeps existing ssh args when identityFile is missing', () => {
    const args = buildSshProcessArgs(profile, bootstrapResult)

    expect(args).toEqual([
      '-o',
      'ConnectTimeout=10',
      'example.com',
      'sh',
      '-lc',
      `/agent --stdio --protocol-version ${REMOTE_AGENT_PROTOCOL_VERSION} --workspace-root '/repo'`,
    ])
  })

  it('matches responses by request id', async () => {
    const fakeProcess = new FakeChildProcess()
    const stdinChunks: string[] = []
    fakeProcess.stdin.on('data', (chunk) => {
      stdinChunks.push(chunk.toString('utf8'))
    })

    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 5_000,
    })

    await transport.start()

    const requestPromise = transport.request<{ pong: boolean }>('ping', {
      payload: 1,
    })

    const outbound = stdinChunks.join('')
    const outboundMessage = JSON.parse(outbound.trim()) as { id: string }

    fakeProcess.stdout.write(
      `${JSON.stringify({
        type: 'response',
        id: outboundMessage.id,
        ok: true,
        result: { pong: true },
        protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
      })}\n`,
    )

    await expect(requestPromise).resolves.toEqual({ pong: true })
    await transport.stop()
  })

  it('converts request timeout to TIMEOUT error', async () => {
    vi.useFakeTimers()

    const fakeProcess = new FakeChildProcess()
    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 100,
    })
    await transport.start()

    const requestPromise = transport.request('slow-op', undefined, 100)
    const assertion = expect(requestPromise).rejects.toMatchObject({
      code: 'TIMEOUT',
    })
    await vi.advanceTimersByTimeAsync(101)
    await assertion

    vi.useRealTimers()
    await transport.stop()
  })

  it('rejects pending requests when ssh process exits', async () => {
    const fakeProcess = new FakeChildProcess()
    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 5_000,
    })
    await transport.start()

    const requestPromise = transport.request('slow-op')
    fakeProcess.emit('exit', 255, null)

    await expect(requestPromise).rejects.toMatchObject({
      code: 'CONNECTION_CLOSED',
    })
  })

  it('fails start when bootstrap reports protocol mismatch', async () => {
    const spawnProcess = vi.fn(() => {
      throw new Error('should not be called')
    })

    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess,
      bootstrapper: async () => {
        throw new RemoteAgentError(
          'AGENT_PROTOCOL_MISMATCH',
          'version mismatch',
        )
      },
    })

    await expect(transport.start()).rejects.toMatchObject({
      code: 'AGENT_PROTOCOL_MISMATCH',
    })
    expect(spawnProcess).not.toHaveBeenCalled()
  })
})
