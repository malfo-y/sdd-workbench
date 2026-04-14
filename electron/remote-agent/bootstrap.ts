import { execFile } from 'node:child_process'
import path from 'node:path'
import {
  RemoteAgentError,
  ensureSupportedProtocolVersion,
  isRemoteAgentError,
  toRemoteAgentError,
} from './protocol'
import { REMOTE_AGENT_RUNTIME_PAYLOAD } from './runtime/generated-payload'
import {
  buildSshArgs,
  extractNumericExitCode,
  isSshAuthFailure,
  isSshNodeRuntimeMissing,
  normalizeLocalIdentityFilePath,
  normalizeSshErrorMessage,
  shellEscape,
  shellEscapeRemotePath,
} from './ssh-utils'
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
    // Always overwrite in MVP so remote runtime behavior stays in sync
    // with the desktop build and avoids stale-agent drift.
    await deps.installAgent(profile)
    const installed = true
    const probe = await deps.probeAgent(profile)

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
      const probeScript = buildProbeAgentScript(agentPath)

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
      const installScript = buildInstallAgentScript(agentPath)

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

export function buildProbeAgentScript(agentPath: string): string {
  const escapedAgentPath = shellEscapeRemotePath(agentPath)

  return [
    `agent_path=${escapedAgentPath}`,
    'if [ -x "$agent_path" ]; then',
    '  "$agent_path" --protocol-version',
    '  if "$agent_path" --healthcheck >/dev/null 2>&1; then',
    `    echo ${PROBE_READY_MARKER}`,
    '  else',
    `    echo ${PROBE_STUB_MARKER}`,
    '  fi',
    'else',
    `  echo ${PROBE_MISSING_MARKER}`,
    'fi',
  ].join('\n')
}

export function buildInstallAgentScript(agentPath: string): string {
  const escapedAgentPath = shellEscapeRemotePath(agentPath)
  const escapedAgentDir = shellEscapeRemotePath(path.posix.dirname(agentPath))

  return [
    `agent_path=${escapedAgentPath}`,
    `agent_dir=${escapedAgentDir}`,
    'mkdir -p "$agent_dir"',
    `cat > "$agent_path" <<'__SDD_REMOTE_AGENT__'`,
    REMOTE_AGENT_RUNTIME_PAYLOAD,
    '__SDD_REMOTE_AGENT__',
    'chmod +x "$agent_path"',
    '"$agent_path" --healthcheck >/dev/null 2>&1',
    '"$agent_path" --protocol-version',
  ].join('\n')
}

export function resolveRemoteAgentPath(profile: RemoteConnectionProfile): string {
  const configuredAgentPath = profile.agentPath?.trim() || DEFAULT_REMOTE_AGENT_PATH
  if (!configuredAgentPath) {
    throw new RemoteAgentError('BOOTSTRAP_FAILED', 'agentPath is required.')
  }

  const normalizedPath = configuredAgentPath.startsWith('~/')
    ? `$HOME/${configuredAgentPath.slice(2)}`
    : configuredAgentPath

  if (/[\0\r\n]/.test(normalizedPath)) {
    throw new RemoteAgentError(
      'BOOTSTRAP_FAILED',
      'agentPath contains unsupported control characters.',
    )
  }

  return normalizedPath
}

export {
  buildSshArgs,
  isSshNodeRuntimeMissing,
  normalizeLocalIdentityFilePath,
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

        const exitCode = extractNumericExitCode(error)
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

function extractProtocolVersion(output: string): string | undefined {
  const match = output.match(/\b\d+\.\d+\.\d+\b/)
  return match?.[0]
}
