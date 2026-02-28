import { execFile, type ExecFileException } from 'node:child_process'
import path from 'node:path'
import {
  RemoteAgentError,
  ensureSupportedProtocolVersion,
  isRemoteAgentError,
  toRemoteAgentError,
} from './protocol'
import { REMOTE_AGENT_RUNTIME_PAYLOAD } from './runtime/generated-payload'
import type { RemoteConnectionProfile } from './types'

const DEFAULT_REMOTE_AGENT_PATH = '$HOME/.sdd-workbench/bin/sdd-remote-agent'
const SSH_MAX_BUFFER_BYTES = 1024 * 1024
const PROBE_MISSING_MARKER = '__SDD_REMOTE_AGENT_MISSING__'
const PROBE_READY_MARKER = '__SDD_REMOTE_AGENT_READY__'
const PROBE_STUB_MARKER = '__SDD_REMOTE_AGENT_STUB__'

export type RemoteAgentProbeResult = {
  exists: boolean
  version?: string
  agentPath: string
}

export type RemoteAgentBootstrapResult = {
  agentPath: string
  protocolVersion: string
  installed: boolean
}

export type RemoteAgentBootstrapper = (
  profile: RemoteConnectionProfile,
) => Promise<RemoteAgentBootstrapResult>

type RemoteAgentBootstrapDeps = {
  probeAgent: (profile: RemoteConnectionProfile) => Promise<RemoteAgentProbeResult>
  installAgent: (profile: RemoteConnectionProfile) => Promise<void>
}

type RemoteSshCommandResult = {
  exitCode: number
  stdout: string
  stderr: string
}

export async function bootstrapRemoteAgent(
  profile: RemoteConnectionProfile,
  deps: RemoteAgentBootstrapDeps = createDefaultBootstrapDeps(),
): Promise<RemoteAgentBootstrapResult> {
  try {
    let probe = await deps.probeAgent(profile)
    let installed = false

    if (!probe.exists) {
      await deps.installAgent(profile)
      installed = true
      probe = await deps.probeAgent(profile)
    }

    if (!probe.exists || !probe.version) {
      throw new RemoteAgentError(
        'BOOTSTRAP_FAILED',
        'Remote agent probe did not return a valid protocol version.',
      )
    }

    ensureSupportedProtocolVersion(probe.version)

    return {
      agentPath: probe.agentPath,
      protocolVersion: probe.version,
      installed,
    }
  } catch (error) {
    if (isRemoteAgentError(error)) {
      throw error
    }
    throw toRemoteAgentError(error, 'BOOTSTRAP_FAILED')
  }
}

export function createDefaultBootstrapDeps(): RemoteAgentBootstrapDeps {
  return {
    probeAgent: async (profile) => {
      const agentPath = resolveRemoteAgentPath(profile)
      const probeScript = [
        `if [ -x ${agentPath} ]; then`,
        `  ${agentPath} --protocol-version`,
        `  if ${agentPath} --healthcheck >/dev/null 2>&1; then`,
        `    echo ${PROBE_READY_MARKER}`,
        '  else',
        `    echo ${PROBE_STUB_MARKER}`,
        '  fi',
        'else',
        `  echo ${PROBE_MISSING_MARKER}`,
        'fi',
      ].join('\n')

      const result = await runSshCommand(profile, probeScript)
      if (result.exitCode === 255 && isSshAuthFailure(result.stderr)) {
        throw new RemoteAgentError(
          'AUTH_FAILED',
          normalizeSshErrorMessage(result.stderr, 'SSH authentication failed.'),
        )
      }
      if (result.exitCode !== 0) {
        throw new RemoteAgentError(
          'BOOTSTRAP_FAILED',
          normalizeSshErrorMessage(result.stderr, 'Remote agent probe failed.'),
        )
      }

      const combinedOutput = `${result.stdout}\n${result.stderr}`
      if (combinedOutput.includes(PROBE_MISSING_MARKER)) {
        return {
          exists: false,
          agentPath,
        }
      }

      const version = extractProtocolVersion(combinedOutput)
      if (combinedOutput.includes(PROBE_STUB_MARKER)) {
        return {
          exists: false,
          version,
          agentPath,
        }
      }

      if (!combinedOutput.includes(PROBE_READY_MARKER) || !version) {
        throw new RemoteAgentError(
          'BOOTSTRAP_FAILED',
          'Remote agent probe did not return a runnable runtime.',
        )
      }

      return {
        exists: true,
        version,
        agentPath,
      }
    },
    installAgent: async (profile) => {
      const agentPath = resolveRemoteAgentPath(profile)
      const installScript = [
        `mkdir -p ${path.posix.dirname(agentPath)}`,
        `cat > ${agentPath} <<'__SDD_REMOTE_AGENT__'`,
        REMOTE_AGENT_RUNTIME_PAYLOAD,
        '__SDD_REMOTE_AGENT__',
        `chmod +x ${agentPath}`,
        `${agentPath} --healthcheck >/dev/null 2>&1`,
        `${agentPath} --protocol-version`,
      ].join('\n')

      const result = await runSshCommand(profile, installScript)
      if (result.exitCode === 255 && isSshAuthFailure(result.stderr)) {
        throw new RemoteAgentError(
          'AUTH_FAILED',
          normalizeSshErrorMessage(result.stderr, 'SSH authentication failed.'),
        )
      }
      if (result.exitCode !== 0) {
        throw new RemoteAgentError(
          'BOOTSTRAP_FAILED',
          normalizeSshErrorMessage(result.stderr, 'Remote agent install failed.'),
        )
      }
    },
  }
}

function resolveRemoteAgentPath(profile: RemoteConnectionProfile): string {
  const configuredAgentPath = profile.agentPath?.trim() || DEFAULT_REMOTE_AGENT_PATH
  if (!configuredAgentPath) {
    throw new RemoteAgentError('BOOTSTRAP_FAILED', 'agentPath is required.')
  }

  const normalizedPath = configuredAgentPath.startsWith('~/')
    ? `$HOME/${configuredAgentPath.slice(2)}`
    : configuredAgentPath
  const isSafePathExpression = /^[A-Za-z0-9_./$~-]+$/.test(normalizedPath)
  if (!isSafePathExpression) {
    throw new RemoteAgentError(
      'BOOTSTRAP_FAILED',
      'agentPath contains unsupported characters for MVP bootstrap.',
    )
  }

  return normalizedPath
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

function appendIdentityArgs(
  profile: RemoteConnectionProfile,
  args: string[],
): void {
  const identityFile = profile.identityFile?.trim()
  if (!identityFile) {
    return
  }
  args.push('-i', identityFile)
  args.push('-o', 'IdentitiesOnly=yes')
}

export function buildSshArgs(
  profile: RemoteConnectionProfile,
  command: string,
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
  args.push('sh', '-lc', command)
  return args
}

async function runSshCommand(
  profile: RemoteConnectionProfile,
  script: string,
): Promise<RemoteSshCommandResult> {
  const args = buildSshArgs(profile, shellEscape(script))
  return new Promise<RemoteSshCommandResult>((resolve, reject) => {
    execFile(
      'ssh',
      args,
      {
        maxBuffer: SSH_MAX_BUFFER_BYTES,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({
            exitCode: 0,
            stdout,
            stderr,
          })
          return
        }

        const exitCode = getNumericExitCode(error)
        if (typeof exitCode === 'number') {
          resolve({
            exitCode,
            stdout,
            stderr,
          })
          return
        }

        reject(error)
      },
    )
  })
}

function getNumericExitCode(error: ExecFileException): number | undefined {
  if (typeof error.code === 'number') {
    return error.code
  }
  return undefined
}

function isSshAuthFailure(stderr: string): boolean {
  return stderr.toLowerCase().includes('permission denied')
}

function normalizeSshErrorMessage(stderr: string, fallback: string): string {
  const trimmed = stderr.trim()
  if (!trimmed) {
    return fallback
  }
  return trimmed
}

function extractProtocolVersion(output: string): string | undefined {
  const match = output.match(/\b\d+\.\d+\.\d+\b/)
  return match?.[0]
}
