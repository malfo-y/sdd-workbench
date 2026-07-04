import { execFileSync } from 'node:child_process'
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

function decodeShLcArgument(commandArg: string, homeDir: string): string {
  return execFileSync(
    'sh',
    [
      '-lc',
      `set -- ${commandArg}
printf '%s' "$1"`,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: homeDir,
      },
    },
  )
}

function parseShellWords(command: string, homeDir: string): string[] {
  const output = execFileSync(
    'sh',
    [
      '-lc',
      `set -- ${command}
printf '%s\n' "$@"`,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: homeDir,
      },
    },
  )

  return output.trimEnd().split('\n')
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
    expect(args.at(-1)).toContain('--stdio --protocol-version')
    expect(args.at(-1)).toContain(` ${REMOTE_AGENT_PROTOCOL_VERSION} `)
    expect(args.at(-1)).toContain("'/agent'")
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
    expect(args.at(-1)).toContain('--stdio --protocol-version')
    expect(args.at(-1)).toContain(` ${REMOTE_AGENT_PROTOCOL_VERSION} `)
    expect(args.at(-1)).toContain("'/agent'")
    expect(args.at(-1)).toContain('--workspace-root')
    expect(args.at(-1)).toContain('/repo')
    expect(args.at(-1)?.startsWith("'")).toBe(true)
    expect(args.at(-1)?.endsWith("'")).toBe(true)
  })

  it('preserves $HOME expansion in the remote stdio command', () => {
    const homeDir = '/tmp/transport home'
    const args = buildSshProcessArgs(
      {
        ...profile,
        remoteRoot: '/repo with spaces',
      },
      {
        ...bootstrapResult,
        agentPath: "$HOME/.sdd-workbench/bin/agent's folder/remote agent",
      },
    )

    const innerCommand = decodeShLcArgument(args.at(-1) ?? '', homeDir)
    const parsedWords = parseShellWords(innerCommand, homeDir)

    expect(parsedWords).toEqual([
      "/tmp/transport home/.sdd-workbench/bin/agent's folder/remote agent",
      '--stdio',
      '--protocol-version',
      REMOTE_AGENT_PROTOCOL_VERSION,
      '--workspace-root',
      '/repo with spaces',
    ])
  })

  it('rejects ssh destinations that look like options', () => {
    expect(() =>
      buildSshProcessArgs(
        {
          ...profile,
          host: '-oProxyCommand=evil',
        },
        bootstrapResult,
      ),
    ).toThrow('host must not start with "-"')

    expect(() =>
      buildSshProcessArgs(
        {
          ...profile,
          user: '-oProxyCommand=evil',
        },
        bootstrapResult,
      ),
    ).toThrow('user must not start with "-"')
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

  it('fails request immediately when stdin is no longer writable', async () => {
    const fakeProcess = new FakeChildProcess()
    wireHealthcheckResponder(fakeProcess)
    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 5_000,
    })
    await transport.start()

    fakeProcess.stdin.destroy()

    await expect(transport.request('slow-op')).rejects.toMatchObject({
      code: 'CONNECTION_CLOSED',
      message: expect.stringContaining('stdin is no longer writable'),
    })
  })

  it('surfaces stdin write callback failures without waiting for timeout', async () => {
    const fakeProcess = new FakeChildProcess()
    wireHealthcheckResponder(fakeProcess)
    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 5_000,
    })
    await transport.start()

    const originalWrite = fakeProcess.stdin.write.bind(fakeProcess.stdin)
    vi
      .spyOn(fakeProcess.stdin, 'write')
      .mockImplementation((...args: Parameters<typeof fakeProcess.stdin.write>) => {
        const [chunk, encoding, callback] = args
        const writeCallback =
          typeof encoding === 'function'
            ? encoding
            : typeof callback === 'function'
              ? callback
              : undefined
        queueMicrotask(() => {
          writeCallback?.(new Error('EPIPE: broken pipe'))
        })
        return originalWrite(chunk)
      })

    await expect(transport.request('slow-op')).rejects.toMatchObject({
      code: 'CONNECTION_CLOSED',
      message: expect.stringContaining('broken pipe'),
    })
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

  it('converts stdio stream errors to a disconnected event instead of crashing', async () => {
    const fakeProcess = new FakeChildProcess()
    wireHealthcheckResponder(fakeProcess)
    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 5_000,
    })
    const events: string[] = []
    transport.onEvent((event) => {
      events.push(event.event)
    })
    await transport.start()

    const requestPromise = transport.request('slow-op')
    fakeProcess.stdout.emit('error', new Error('ECONNRESET: connection reset'))
    fakeProcess.emit('exit', 255, null)

    await expect(requestPromise).rejects.toMatchObject({
      code: 'CONNECTION_CLOSED',
      message: expect.stringContaining('connection reset'),
    })
    expect(events.filter((event) => event === 'session.disconnected')).toHaveLength(1)
  })

  it('ignores late stdio stream errors during intentional shutdown', async () => {
    const fakeProcess = new FakeChildProcess()
    wireHealthcheckResponder(fakeProcess)
    const transport = createSshRemoteAgentTransport(profile, {
      spawnProcess: () => fakeProcess.asChildProcess(),
      bootstrapper: async () => bootstrapResult,
      requestTimeoutMs: 5_000,
    })
    await transport.start()
    await transport.stop()

    expect(() => {
      fakeProcess.stdin.emit('error', new Error('EPIPE: late shutdown error'))
    }).not.toThrow()
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
