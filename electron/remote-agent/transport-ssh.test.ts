import os from 'node:os'
import path from 'node:path'
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

function wireHealthcheckResponder(
  fakeProcess: FakeChildProcess,
  seenRequests: Array<{ id: string; method: string }> = [],
) {
  let pending = ''
  fakeProcess.stdin.on('data', (chunk) => {
    pending += chunk.toString('utf8')
    const lines = pending.split('\n')
    pending = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) {
        continue
      }

      const request = JSON.parse(line) as { id: string; method: string }
      seenRequests.push({
        id: request.id,
        method: request.method,
      })

      if (request.method !== 'agent.healthcheck') {
        continue
      }

      fakeProcess.stdout.write(
        `${JSON.stringify({
          type: 'response',
          id: request.id,
          ok: true,
          result: { ok: true },
          protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
        })}\n`,
      )
    }
  })
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
      path.join(os.homedir(), '.ssh/id_ed25519'),
      '-o',
      'IdentitiesOnly=yes',
      '-o',
      'ConnectTimeout=10',
      'tester@example.com',
      'sh',
      '-lc',
      expect.any(String),
    ])
    expect(args.at(-1)).toContain('/agent --stdio --protocol-version')
    expect(args.at(-1)).toContain(` ${REMOTE_AGENT_PROTOCOL_VERSION} `)
    expect(args.at(-1)).toContain('--workspace-root')
    expect(args.at(-1)).toContain('/repo')
    expect(args.at(-1)?.startsWith("'")).toBe(true)
    expect(args.at(-1)?.endsWith("'")).toBe(true)
  })

  it('keeps existing ssh args when identityFile is missing', () => {
    const args = buildSshProcessArgs(profile, bootstrapResult)

    expect(args).toEqual([
      '-o',
      'ConnectTimeout=10',
      'example.com',
      'sh',
      '-lc',
      expect.any(String),
    ])
    expect(args.at(-1)).toContain('/agent --stdio --protocol-version')
    expect(args.at(-1)).toContain(` ${REMOTE_AGENT_PROTOCOL_VERSION} `)
    expect(args.at(-1)).toContain('--workspace-root')
    expect(args.at(-1)).toContain('/repo')
    expect(args.at(-1)?.startsWith("'")).toBe(true)
    expect(args.at(-1)?.endsWith("'")).toBe(true)
  })

  it('matches responses by request id', async () => {
    const fakeProcess = new FakeChildProcess()
    const seenRequests: Array<{ id: string; method: string }> = []
    wireHealthcheckResponder(fakeProcess, seenRequests)

    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 5_000,
    })

    await transport.start()

    const requestPromise = transport.request<{ pong: boolean }>('ping', {
      payload: 1,
    })

    const pingRequest = seenRequests.find((request) => request.method === 'ping')
    if (!pingRequest) {
      throw new Error('Expected ping request to be written after start.')
    }

    fakeProcess.stdout.write(
      `${JSON.stringify({
        type: 'response',
        id: pingRequest.id,
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
    wireHealthcheckResponder(fakeProcess)
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

  it('maps stub runtime startup failure to BOOTSTRAP_FAILED', async () => {
    const fakeProcess = new FakeChildProcess()
    fakeProcess.stdin.on('data', () => {
      fakeProcess.stderr.write('Remote agent runtime is not bundled in this MVP build.\n')
      fakeProcess.emit('exit', 1, null)
    })

    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 5_000,
    })

    await expect(transport.start()).rejects.toMatchObject({
      code: 'BOOTSTRAP_FAILED',
    })
  })

  it('maps node-missing startup failure to BOOTSTRAP_FAILED', async () => {
    const fakeProcess = new FakeChildProcess()
    fakeProcess.stdin.on('data', () => {
      fakeProcess.stderr.write('/usr/bin/env: node: No such file or directory\n')
      fakeProcess.emit('exit', 127, null)
    })

    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 5_000,
    })

    await expect(transport.start()).rejects.toMatchObject({
      code: 'BOOTSTRAP_FAILED',
      message: expect.stringContaining('Node.js runtime is missing'),
    })
  })

  it('maps generic startup stderr to BOOTSTRAP_FAILED with details', async () => {
    const fakeProcess = new FakeChildProcess()
    fakeProcess.stdin.on('data', () => {
      fakeProcess.stderr.write('SyntaxError: Unexpected token\n')
      fakeProcess.emit('exit', 1, null)
    })

    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 5_000,
    })

    await expect(transport.start()).rejects.toMatchObject({
      code: 'BOOTSTRAP_FAILED',
      message: expect.stringContaining('SyntaxError'),
    })
  })

  it('rejects pending requests when ssh process exits', async () => {
    const fakeProcess = new FakeChildProcess()
    wireHealthcheckResponder(fakeProcess)
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
