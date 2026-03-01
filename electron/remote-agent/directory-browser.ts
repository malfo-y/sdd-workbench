import { execFile, type ExecFileException } from 'node:child_process'
import path from 'node:path'
import { buildSshArgs } from './bootstrap'
import { RemoteAgentError, toRemoteAgentError, type RemoteAgentErrorCode } from './protocol'

const DEFAULT_BROWSE_LIMIT = 500
const MAX_BROWSE_LIMIT = 5_000
const DEFAULT_BROWSE_TIMEOUT_MS = 7_000
const SSH_MAX_BUFFER_BYTES = 2 * 1024 * 1024

const MARKER_CURRENT = '__SDD_BROWSE_CURRENT__'
const MARKER_ENTRY = '__SDD_BROWSE_ENTRY__'
const MARKER_TRUNCATED = '__SDD_BROWSE_TRUNCATED__'
const MARKER_ERROR = '__SDD_BROWSE_ERROR__'

type RemoteSshCommandResult = {
  exitCode: number
  stdout: string
  stderr: string
}

type RunSshCommand = (
  request: RemoteDirectoryBrowseRequest,
  command: string,
  timeoutMs: number,
) => Promise<RemoteSshCommandResult>

type BrowseDeps = {
  runSshCommand: RunSshCommand
}

export type RemoteDirectoryBrowseRequest = {
  host: string
  user?: string
  port?: number
  identityFile?: string
  targetPath?: string
  connectTimeoutMs?: number
  limit?: number
}

export type RemoteDirectoryBrowseEntry = {
  name: string
  path: string
  kind: 'directory' | 'symlink'
}

export type RemoteDirectoryBrowseResult = {
  currentPath: string
  entries: RemoteDirectoryBrowseEntry[]
  truncated: boolean
}

type ParsedBrowseOutput = {
  currentPath: string
  entries: Array<{ name: string; kind: 'directory' | 'symlink' }>
  truncated: boolean
  errorCode?: RemoteAgentErrorCode
  errorMessage?: string
}

const defaultDeps: BrowseDeps = {
  runSshCommand: runSshCommand,
}

export async function browseRemoteDirectories(
  request: RemoteDirectoryBrowseRequest,
  deps: BrowseDeps = defaultDeps,
): Promise<RemoteDirectoryBrowseResult> {
  const host = request.host?.trim()
  if (!host) {
    throw new RemoteAgentError(
      'UNKNOWN',
      'host is required for remote directory browse.',
    )
  }

  const safeLimit = normalizeBrowseLimit(request.limit)
  const timeoutMs = normalizeBrowseTimeoutMs(request.connectTimeoutMs)
  const script = buildRemoteDirectoryBrowseScript({
    targetPath: request.targetPath,
    limit: safeLimit,
  })

  let commandResult: RemoteSshCommandResult
  try {
    commandResult = await deps.runSshCommand(request, script, timeoutMs)
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new RemoteAgentError(
        'TIMEOUT',
        `Remote directory browse timed out (${timeoutMs}ms).`,
        error,
      )
    }
    throw toRemoteAgentError(error, 'CONNECTION_CLOSED')
  }

  if (
    commandResult.exitCode === 255 &&
    isSshAuthFailure(commandResult.stderr)
  ) {
    throw new RemoteAgentError(
      'AUTH_FAILED',
      normalizeSshErrorMessage(commandResult.stderr, 'SSH authentication failed.'),
    )
  }

  const parsed = parseBrowseOutput(commandResult.stdout)
  if (parsed.errorCode) {
    throw new RemoteAgentError(
      parsed.errorCode,
      parsed.errorMessage ??
        'Remote directory browse failed due to an unsupported path.',
    )
  }

  if (commandResult.exitCode !== 0) {
    throw new RemoteAgentError(
      'CONNECTION_CLOSED',
      normalizeSshErrorMessage(
        commandResult.stderr,
        `Remote directory browse failed (exitCode=${commandResult.exitCode}).`,
      ),
    )
  }

  if (!parsed.currentPath) {
    throw new RemoteAgentError(
      'INVALID_RESPONSE',
      'Remote directory browse response is missing current path.',
    )
  }

  const entries = parsed.entries
    .map((entry) => ({
      ...entry,
      path: toChildPath(parsed.currentPath, entry.name),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))

  return {
    currentPath: parsed.currentPath,
    entries,
    truncated: parsed.truncated,
  }
}

function toChildPath(currentPath: string, childName: string): string {
  if (currentPath === '/') {
    return path.posix.join('/', childName)
  }
  return path.posix.join(currentPath, childName)
}

function normalizeBrowseLimit(rawLimit: number | undefined): number {
  if (!Number.isFinite(rawLimit)) {
    return DEFAULT_BROWSE_LIMIT
  }

  return Math.min(
    MAX_BROWSE_LIMIT,
    Math.max(1, Math.trunc(rawLimit as number)),
  )
}

function normalizeBrowseTimeoutMs(rawTimeoutMs: number | undefined): number {
  if (!Number.isFinite(rawTimeoutMs)) {
    return DEFAULT_BROWSE_TIMEOUT_MS
  }

  return Math.max(1_000, Math.trunc(rawTimeoutMs as number))
}

type BuildBrowseScriptOptions = {
  targetPath?: string
  limit: number
}

export function buildRemoteDirectoryBrowseScript(
  options: BuildBrowseScriptOptions,
): string {
  const rawTargetPath = options.targetPath?.trim() ?? ''

  return [
    `requested_path=${shellEscape(rawTargetPath)}`,
    `limit=${String(options.limit)}`,
    'if [ -z "$requested_path" ]; then',
    '  target_path="$HOME"',
    'else',
    '  case "$requested_path" in',
    '    "~") target_path="$HOME" ;;',
    '    "~/"*) target_path="$HOME/${requested_path#~/}" ;;',
    '    "\\$HOME") target_path="$HOME" ;;',
    '    "\\$HOME/"*) target_path="$HOME/${requested_path#\\$HOME/}" ;;',
    '    /*) target_path="$requested_path" ;;',
    `    *) printf '${MARKER_ERROR}\\tPATH_DENIED\\tTarget path must be absolute.\\n'; exit 3 ;;`,
    '  esac',
    'fi',
    'if [ "$target_path" != "/" ]; then',
    '  target_path="${target_path%/}"',
    'fi',
    'if [ ! -d "$target_path" ]; then',
    `  printf '${MARKER_ERROR}\\tPATH_DENIED\\tTarget path is not a directory.\\n'`,
    '  exit 3',
    'fi',
    'if [ ! -x "$target_path" ]; then',
    `  printf '${MARKER_ERROR}\\tPATH_DENIED\\tPermission denied for target path.\\n'`,
    '  exit 3',
    'fi',
    `printf '${MARKER_CURRENT}\\t%s\\n' "$target_path"`,
    'entry_count=0',
    'truncated=0',
    'for entry in "$target_path"/* "$target_path"/.[!.]* "$target_path"/..?*; do',
    '  [ -e "$entry" ] || continue',
    '  if [ -d "$entry" ]; then',
    '    name=$(basename "$entry")',
    '    kind="directory"',
    '    if [ -L "$entry" ]; then',
    '      kind="symlink"',
    '    fi',
    '    entry_count=$((entry_count + 1))',
    '    if [ "$entry_count" -le "$limit" ]; then',
    `      printf '${MARKER_ENTRY}\\t%s\\t%s\\n' "$kind" "$name"`,
    '    else',
    '      truncated=1',
    '    fi',
    '  fi',
    'done',
    `printf '${MARKER_TRUNCATED}\\t%s\\n' "$truncated"`,
  ].join('\n')
}

function parseBrowseOutput(stdout: string): ParsedBrowseOutput {
  const lines = stdout.split(/\r?\n/)
  const entries: Array<{ name: string; kind: 'directory' | 'symlink' }> = []
  let currentPath = ''
  let truncated = false
  let errorCode: RemoteAgentErrorCode | undefined
  let errorMessage: string | undefined

  for (const line of lines) {
    if (!line.trim()) {
      continue
    }

    const [marker, ...rest] = line.split('\t')
    if (marker === MARKER_CURRENT) {
      currentPath = rest.join('\t').trim()
      continue
    }

    if (marker === MARKER_ENTRY) {
      const [kindRaw, ...nameParts] = rest
      const name = nameParts.join('\t')
      if (!name || name === '.' || name === '..') {
        continue
      }
      const kind: 'directory' | 'symlink' =
        kindRaw === 'symlink' ? 'symlink' : 'directory'
      entries.push({
        name,
        kind,
      })
      continue
    }

    if (marker === MARKER_TRUNCATED) {
      truncated = rest[0] === '1'
      continue
    }

    if (marker === MARKER_ERROR) {
      errorCode = parseErrorCode(rest[0])
      errorMessage = rest.slice(1).join('\t').trim()
    }
  }

  return {
    currentPath,
    entries,
    truncated,
    errorCode,
    errorMessage,
  }
}

function parseErrorCode(rawCode: string | undefined): RemoteAgentErrorCode {
  if (rawCode === 'AUTH_FAILED') {
    return 'AUTH_FAILED'
  }
  if (rawCode === 'TIMEOUT') {
    return 'TIMEOUT'
  }
  if (rawCode === 'AGENT_PROTOCOL_MISMATCH') {
    return 'AGENT_PROTOCOL_MISMATCH'
  }
  if (rawCode === 'PATH_DENIED') {
    return 'PATH_DENIED'
  }
  if (rawCode === 'CONNECTION_CLOSED') {
    return 'CONNECTION_CLOSED'
  }
  if (rawCode === 'INVALID_RESPONSE') {
    return 'INVALID_RESPONSE'
  }
  if (rawCode === 'BOOTSTRAP_FAILED') {
    return 'BOOTSTRAP_FAILED'
  }
  return 'UNKNOWN'
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

function buildBrowseSshArgs(
  request: RemoteDirectoryBrowseRequest,
  command: string,
): string[] {
  return buildSshArgs(
    {
      workspaceId: '__remote-browse__',
      host: request.host.trim(),
      remoteRoot: '/',
      ...(request.user?.trim() ? { user: request.user.trim() } : {}),
      ...(request.port ? { port: request.port } : {}),
      ...(request.identityFile?.trim()
        ? { identityFile: request.identityFile.trim() }
        : {}),
      ...(request.connectTimeoutMs
        ? { connectTimeoutMs: request.connectTimeoutMs }
        : {}),
    },
    shellEscape(command),
  )
}

async function runSshCommand(
  request: RemoteDirectoryBrowseRequest,
  command: string,
  timeoutMs: number,
): Promise<RemoteSshCommandResult> {
  const args = buildBrowseSshArgs(request, command)

  return new Promise<RemoteSshCommandResult>((resolve, reject) => {
    execFile(
      'ssh',
      args,
      {
        maxBuffer: SSH_MAX_BUFFER_BYTES,
        timeout: timeoutMs,
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

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  return /timeout|timed out|etimedout/i.test(error.message)
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
