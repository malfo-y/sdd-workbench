import type { ExecFileException } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import type { RemoteConnectionProfile } from './types'

export const NODE_RUNTIME_MISSING_MESSAGE =
  'Remote Node.js runtime is missing on the target host. Install Node.js and ensure "node" is available in non-interactive SSH shell PATH.'

type SshConnectionOptions = Pick<
  RemoteConnectionProfile,
  'host' | 'user' | 'port' | 'identityFile' | 'connectTimeoutMs'
>

export function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

export function shellEscapeRemotePath(value: string): string {
  if (value === '$HOME') {
    return '"$HOME"'
  }

  if (value.startsWith('$HOME/')) {
    return `"${'$HOME'}"${shellEscape(value.slice('$HOME'.length))}`
  }

  return shellEscape(value)
}

export function normalizeLocalIdentityFilePath(identityFile: string): string {
  const trimmed = identityFile.trim()
  if (!trimmed) {
    return trimmed
  }

  if (trimmed === '~') {
    return os.homedir()
  }

  if (trimmed.startsWith('~/')) {
    return path.join(os.homedir(), trimmed.slice(2))
  }

  if (trimmed.startsWith('$HOME/')) {
    return path.join(os.homedir(), trimmed.slice('$HOME/'.length))
  }

  return trimmed
}

export function buildSshArgs(
  profile: SshConnectionOptions,
  command: string,
): string[] {
  return [...buildSshBaseArgs(profile), 'sh', '-lc', command]
}

export function buildSshBaseArgs(profile: SshConnectionOptions): string[] {
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
  args.push(buildSshDestination(profile))

  return args
}

export function extractNumericExitCode(
  error: ExecFileException,
): number | undefined {
  if (typeof error.code === 'number') {
    return error.code
  }
  const errorWithStatus = error as unknown as { status?: unknown }
  if (typeof errorWithStatus.status === 'number') {
    return errorWithStatus.status
  }
  return undefined
}

export function isSshAuthFailure(stderr: string): boolean {
  return stderr.toLowerCase().includes('permission denied')
}

export function isSshNodeRuntimeMissing(stderr: string): boolean {
  const normalized = stderr.toLowerCase()
  if (!normalized.trim()) {
    return false
  }

  if (normalized.includes('node: not found')) {
    return true
  }

  if (normalized.includes('node: command not found')) {
    return true
  }

  if (
    normalized.includes('/usr/bin/env') &&
    normalized.includes('node') &&
    normalized.includes('no such file or directory')
  ) {
    return true
  }

  return false
}

export function normalizeSshErrorMessage(
  stderr: string,
  fallback: string,
  options?: {
    nodeRuntimeMissingMessage?: string
  },
): string {
  const trimmed = stderr.trim()
  if (!trimmed) {
    return fallback
  }
  if (isSshNodeRuntimeMissing(trimmed)) {
    return options?.nodeRuntimeMissingMessage ?? NODE_RUNTIME_MISSING_MESSAGE
  }
  return trimmed
}

function appendIdentityArgs(profile: SshConnectionOptions, args: string[]): void {
  const identityFile = profile.identityFile?.trim()
  if (!identityFile) {
    return
  }
  args.push('-i', normalizeLocalIdentityFilePath(identityFile))
  args.push('-o', 'IdentitiesOnly=yes')
}

function buildSshDestination(profile: SshConnectionOptions): string {
  const host = assertSafeSshDestinationValue('host', profile.host)
  const user = profile.user?.trim()
    ? assertSafeSshDestinationValue('user', profile.user)
    : ''

  if (!user) {
    return host
  }

  return `${user}@${host}`
}

function assertSafeSshDestinationValue(label: 'host' | 'user', value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${label} is required for SSH connection.`)
  }
  if (/[\0\r\n\t ]/.test(trimmed)) {
    throw new Error(`${label} contains unsupported whitespace or control characters.`)
  }
  if (trimmed.startsWith('-')) {
    throw new Error(`${label} must not start with "-".`)
  }
  if (label === 'host' && trimmed.includes('@')) {
    throw new Error('host must not include "@".')
  }
  return trimmed
}
