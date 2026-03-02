import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import {
  REMOTE_AGENT_PROTOCOL_VERSION,
  RemoteAgentError,
  ensureSupportedProtocolVersion,
  isRemoteAgentEvent,
  isRemoteAgentResponse,
  toRemoteAgentError,
  type RemoteAgentEvent,
  type RemoteAgentResponse,
} from './protocol'
import {
  JsonLineDecoder,
  encodeJsonLineMessage,
  type JsonLineFramingError,
} from './framing'
import {
  NODE_RUNTIME_MISSING_MESSAGE,
  bootstrapRemoteAgent,
  normalizeLocalIdentityFilePath,
  isSshNodeRuntimeMissing,
  type RemoteAgentBootstrapResult,
  type RemoteAgentBootstrapper,
} from './bootstrap'
import type { RemoteConnectionProfile } from './types'

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000
const STOP_GRACE_TIMEOUT_MS = 500
const STARTUP_HEALTHCHECK_TIMEOUT_MS = 3_000
const STUB_RUNTIME_ERROR_MARKER = 'remote agent runtime is not bundled'
const STARTUP_STDERR_MESSAGE_LIMIT = 240

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  timeoutHandle: ReturnType<typeof setTimeout>
}

export type RemoteAgentEventListener = (event: RemoteAgentEvent) => void

export interface RemoteAgentTransport {
  start: () => Promise<void>
  request: <TResult = unknown>(
    method: string,
    params?: unknown,
    timeoutMs?: number,
  ) => Promise<TResult>
  onEvent: (listener: RemoteAgentEventListener) => () => void
  stop: () => Promise<void>
}

export type SpawnSshProcess = (
  profile: RemoteConnectionProfile,
  bootstrap: RemoteAgentBootstrapResult,
) => ChildProcessWithoutNullStreams

type SshRemoteAgentTransportOptions = {
  spawnProcess?: SpawnSshProcess
  bootstrapper?: RemoteAgentBootstrapper
  requestTimeoutMs?: number
}

export function createSshRemoteAgentTransport(
  profile: RemoteConnectionProfile,
  options: SshRemoteAgentTransportOptions = {},
): RemoteAgentTransport {
  return new SshRemoteAgentTransport(profile, options)
}

class SshRemoteAgentTransport implements RemoteAgentTransport {
  private readonly profile: RemoteConnectionProfile
  private readonly spawnProcess: SpawnSshProcess
  private readonly bootstrapper: RemoteAgentBootstrapper
  private readonly requestTimeoutMs: number

  private process: ChildProcessWithoutNullStreams | null = null
  private readonly decoder = new JsonLineDecoder<unknown>()
  private readonly pendingRequests = new Map<string, PendingRequest>()
  private readonly eventListeners = new Set<RemoteAgentEventListener>()
  private stderrTail = ''

  private startPromise: Promise<void> | null = null
  private stopPromise: Promise<void> | null = null
  private requestSequence = 0
  private hasStarted = false
  private isStopping = false

  private readonly onStdoutData = (chunk: Buffer | string) => {
    try {
      const messages = this.decoder.push(chunk)
      for (const message of messages) {
        this.handleIncomingMessage(message)
      }
    } catch (error) {
      const normalizedError = toRemoteAgentError(error, 'INVALID_RESPONSE')
      this.failAllPending(normalizedError)
      void this.stop()
    }
  }

  private readonly onStderrData = (chunk: Buffer | string) => {
    const message = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    if (!message.trim()) {
      return
    }
    this.stderrTail = `${this.stderrTail}${message}`.slice(-1024)

    this.emitEvent({
      type: 'event',
      event: 'transport.stderr',
      payload: {
        message,
      },
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
    })
  }

  private readonly onProcessError = (error: Error) => {
    const normalized = toRemoteAgentError(error, 'CONNECTION_CLOSED')
    this.failAllPending(normalized)
  }

  private readonly onProcessExit = (
    code: number | null,
    signal: NodeJS.Signals | null,
  ) => {
    this.process = null
    this.hasStarted = false

    if (!this.isStopping) {
      const reason = new RemoteAgentError(
        'CONNECTION_CLOSED',
        `Remote SSH process exited unexpectedly (code=${String(code)}, signal=${String(signal)}).`,
      )
      this.failAllPending(reason)
      this.emitEvent({
        type: 'event',
        event: 'session.disconnected',
        payload: {
          reason: reason.message,
        },
        protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
      })
    }
  }

  constructor(
    profile: RemoteConnectionProfile,
    options: SshRemoteAgentTransportOptions,
  ) {
    this.profile = profile
    this.spawnProcess = options.spawnProcess ?? spawnSshProcess
    this.bootstrapper = options.bootstrapper ?? bootstrapRemoteAgent
    this.requestTimeoutMs =
      options.requestTimeoutMs ??
      profile.requestTimeoutMs ??
      DEFAULT_REQUEST_TIMEOUT_MS
  }

  async start(): Promise<void> {
    if (this.hasStarted) {
      return
    }
    if (this.startPromise) {
      return this.startPromise
    }

    this.startPromise = (async () => {
      const bootstrap = await this.bootstrapper(this.profile)
      ensureSupportedProtocolVersion(bootstrap.protocolVersion)

      const process = this.spawnProcess(this.profile, bootstrap)
      this.process = process
      this.isStopping = false

      process.stdout.on('data', this.onStdoutData)
      process.stderr.on('data', this.onStderrData)
      process.on('error', this.onProcessError)
      process.on('exit', this.onProcessExit)

      this.hasStarted = true
      this.stderrTail = ''

      try {
        const healthcheckResult = await this.request<{ ok?: boolean }>(
          'agent.healthcheck',
          undefined,
          Math.min(this.requestTimeoutMs, STARTUP_HEALTHCHECK_TIMEOUT_MS),
        )

        if (!healthcheckResult || healthcheckResult.ok !== true) {
          throw new RemoteAgentError(
            'BOOTSTRAP_FAILED',
            'Remote agent health check response is invalid.',
          )
        }
      } catch (error) {
        const normalized = this.toStartupError(error)
        await this.stop()
        throw normalized
      }
    })().finally(() => {
      this.startPromise = null
    })

    return this.startPromise
  }

  async request<TResult = unknown>(
    method: string,
    params?: unknown,
    timeoutMs = this.requestTimeoutMs,
  ): Promise<TResult> {
    if (!this.process || !this.hasStarted) {
      throw new RemoteAgentError(
        'CONNECTION_CLOSED',
        'Remote agent session is not connected.',
      )
    }

    const requestId = this.nextRequestId()
    const frame = encodeJsonLineMessage({
      type: 'request',
      id: requestId,
      method,
      params,
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
    })

    return new Promise<TResult>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(
          new RemoteAgentError(
            'TIMEOUT',
            `Remote agent request timed out (${method}, ${timeoutMs}ms).`,
          ),
        )
      }, timeoutMs)

      this.pendingRequests.set(requestId, {
        resolve: (value) => {
          resolve(value as TResult)
        },
        reject,
        timeoutHandle,
      })

      try {
        this.process?.stdin.write(frame)
      } catch (error) {
        clearTimeout(timeoutHandle)
        this.pendingRequests.delete(requestId)
        reject(toRemoteAgentError(error, 'CONNECTION_CLOSED'))
      }
    })
  }

  onEvent(listener: RemoteAgentEventListener): () => void {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }

  async stop(): Promise<void> {
    if (this.stopPromise) {
      return this.stopPromise
    }

    this.stopPromise = (async () => {
      const process = this.process
      if (!process) {
        this.hasStarted = false
        return
      }

      this.isStopping = true
      process.stdout.removeListener('data', this.onStdoutData)
      process.stderr.removeListener('data', this.onStderrData)
      process.removeListener('error', this.onProcessError)
      process.removeListener('exit', this.onProcessExit)

      await new Promise<void>((resolve) => {
        let didResolve = false
        const finalize = () => {
          if (didResolve) {
            return
          }
          didResolve = true
          resolve()
        }

        const timer = setTimeout(() => {
          process.removeListener('exit', onExit)
          finalize()
        }, STOP_GRACE_TIMEOUT_MS)

        const onExit = () => {
          clearTimeout(timer)
          finalize()
        }

        process.once('exit', onExit)

        try {
          process.stdin.end()
          process.kill('SIGTERM')
        } catch {
          clearTimeout(timer)
          process.removeListener('exit', onExit)
          finalize()
        }
      })

      this.process = null
      this.hasStarted = false
      this.failAllPending(
        new RemoteAgentError(
          'CONNECTION_CLOSED',
          'Remote agent session has been disconnected.',
        ),
      )
    })().finally(() => {
      this.stopPromise = null
      this.isStopping = false
    })

    return this.stopPromise
  }

  private nextRequestId(): string {
    this.requestSequence += 1
    return `req-${this.requestSequence}`
  }

  private handleIncomingMessage(message: unknown): void {
    if (isRemoteAgentResponse(message)) {
      this.handleResponseMessage(message)
      return
    }

    if (isRemoteAgentEvent(message)) {
      try {
        ensureSupportedProtocolVersion(message.protocolVersion)
      } catch (error) {
        this.failAllPending(toRemoteAgentError(error, 'AGENT_PROTOCOL_MISMATCH'))
        return
      }
      this.emitEvent(message)
    }
  }

  private handleResponseMessage(message: RemoteAgentResponse): void {
    const pending = this.pendingRequests.get(message.id)
    if (!pending) {
      return
    }

    clearTimeout(pending.timeoutHandle)
    this.pendingRequests.delete(message.id)

    try {
      ensureSupportedProtocolVersion(message.protocolVersion)
    } catch (error) {
      pending.reject(toRemoteAgentError(error, 'AGENT_PROTOCOL_MISMATCH'))
      return
    }

    if (message.ok) {
      pending.resolve(message.result)
      return
    }

    pending.reject(
      new RemoteAgentError(message.error.code, message.error.message),
    )
  }

  private emitEvent(event: RemoteAgentEvent): void {
    for (const listener of this.eventListeners) {
      listener(event)
    }
  }

  private failAllPending(error: Error | JsonLineFramingError | RemoteAgentError): void {
    const normalizedError =
      error instanceof RemoteAgentError
        ? error
        : toRemoteAgentError(error, 'CONNECTION_CLOSED')

    for (const [requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeoutHandle)
      pending.reject(normalizedError)
      this.pendingRequests.delete(requestId)
    }
  }

  private toStartupError(error: unknown): RemoteAgentError {
    const normalized =
      error instanceof RemoteAgentError
        ? error
        : toRemoteAgentError(error, 'BOOTSTRAP_FAILED')

    const stderrMessage = this.stderrTail
    const startupStderrSummary = summarizeStartupStderr(stderrMessage)
    if (
      normalized.code === 'CONNECTION_CLOSED' &&
      isSshNodeRuntimeMissing(stderrMessage)
    ) {
      return new RemoteAgentError(
        'BOOTSTRAP_FAILED',
        NODE_RUNTIME_MISSING_MESSAGE,
      )
    }

    const stderrMessageLower = stderrMessage.toLowerCase()
    if (
      normalized.code === 'CONNECTION_CLOSED' &&
      stderrMessageLower.includes(STUB_RUNTIME_ERROR_MARKER)
    ) {
      return new RemoteAgentError(
        'BOOTSTRAP_FAILED',
        'Remote agent runtime is not bundled or failed to start.',
      )
    }

    if (normalized.code === 'CONNECTION_CLOSED' && startupStderrSummary) {
      return new RemoteAgentError(
        'BOOTSTRAP_FAILED',
        `Remote agent failed to start: ${startupStderrSummary}`,
      )
    }

    return normalized
  }
}

function summarizeStartupStderr(stderr: string): string | null {
  const normalized = stderr.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return null
  }

  if (normalized.length <= STARTUP_STDERR_MESSAGE_LIMIT) {
    return normalized
  }

  return `${normalized.slice(0, STARTUP_STDERR_MESSAGE_LIMIT).trimEnd()}...`
}

function spawnSshProcess(
  profile: RemoteConnectionProfile,
  bootstrap: RemoteAgentBootstrapResult,
): ChildProcessWithoutNullStreams {
  const args = buildSshProcessArgs(profile, bootstrap)
  return spawn('ssh', args, {
    stdio: 'pipe',
  })
}

function appendIdentityArgs(
  profile: RemoteConnectionProfile,
  args: string[],
): void {
  const identityFile = profile.identityFile?.trim()
  if (!identityFile) {
    return
  }
  args.push('-i', normalizeLocalIdentityFilePath(identityFile))
  args.push('-o', 'IdentitiesOnly=yes')
}

export function buildSshProcessArgs(
  profile: RemoteConnectionProfile,
  bootstrap: RemoteAgentBootstrapResult,
): string[] {
  const args: string[] = []
  if (profile.port) {
    args.push('-p', String(profile.port))
  }
  appendIdentityArgs(profile, args)

  const timeoutSeconds = Math.max(
    1,
    Math.floor((profile.connectTimeoutMs ?? 10_000) / 1000),
  )
  args.push('-o', `ConnectTimeout=${timeoutSeconds}`)
  args.push(profile.user ? `${profile.user}@${profile.host}` : profile.host)

  const remoteCommand = [
    bootstrap.agentPath,
    '--stdio',
    '--protocol-version',
    REMOTE_AGENT_PROTOCOL_VERSION,
    '--workspace-root',
    shellEscape(profile.remoteRoot),
  ].join(' ')
  args.push('sh', '-lc', shellEscape(remoteCommand))

  return args
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}
