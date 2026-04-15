import { execFile as execFileWithCallback } from 'node:child_process'
import { stat } from 'node:fs/promises'
import path from 'node:path'

export type SystemOpenTarget = 'iterm' | 'vscode' | 'finder'

export type SystemOpenRemoteProfile = {
  workspaceId: string
  host: string
  remoteRoot: string
  user?: string
  port?: number
  agentPath?: string
  identityFile?: string
  sshAlias?: string
  requestTimeoutMs?: number
  connectTimeoutMs?: number
}

export type SystemOpenInRequest = {
  rootPath: string
  relativePath?: string
  workspaceKind?: 'local' | 'remote'
  remoteProfile?: SystemOpenRemoteProfile | null
}

export type SystemOpenInResult = {
  ok: boolean
  error?: string
}

type StatLike = {
  isDirectory(): boolean
}

type SystemOpenDependencies = {
  platform?: NodeJS.Platform
  execFile?: (file: string, args: string[]) => Promise<void>
  execFileStdout?: (file: string, args: string[]) => Promise<string>
  statPath?: (targetPath: string) => Promise<StatLike>
}

function runExecFile(file: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFileWithCallback(file, args, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

function runExecFileStdout(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFileWithCallback(file, args, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      resolve(String(stdout))
    })
  })
}

function getWorkspaceKind(
  request: SystemOpenInRequest,
): 'local' | 'remote' {
  return request.workspaceKind === 'remote' ? 'remote' : 'local'
}

function getApplicationName(target: Exclude<SystemOpenTarget, 'finder'>): string {
  return target === 'iterm' ? 'iTerm' : 'Visual Studio Code'
}

const VSCODE_APP_BUNDLE_ID = 'com.microsoft.VSCode'
const VSCODE_APP_PATH_SCRIPT = `POSIX path of (path to application id "${VSCODE_APP_BUNDLE_ID}")`
const VSCODE_CLI_RELATIVE_PATH = path.join(
  'Contents',
  'Resources',
  'app',
  'bin',
  'code',
)
const REMOTE_PROFILE_VALIDATION_ERROR_PREFIX = 'Invalid remote workspace profile:'

function quoteShellArgument(value: string): string {
  return "'" + value.replace(/'/g, `'"'"'`) + "'"
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function normalizeWorkspaceRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
}

function buildRemoteProfileValidationError(detail: string): Error {
  return new Error(`${REMOTE_PROFILE_VALIDATION_ERROR_PREFIX} ${detail}`)
}

function normalizeRemoteSshValue(
  rawValue: string,
  label: string,
): string {
  const normalized = rawValue.trim()
  if (!normalized) {
    throw buildRemoteProfileValidationError(`${label} is required.`)
  }
  if (normalized.startsWith('-')) {
    throw buildRemoteProfileValidationError(`${label} cannot start with "-".`)
  }
  if (/[\r\n\t]/.test(normalized)) {
    throw buildRemoteProfileValidationError(`${label} cannot contain control characters.`)
  }
  if (/\s/.test(normalized)) {
    throw buildRemoteProfileValidationError(`${label} cannot contain whitespace.`)
  }
  return normalized
}

function normalizeRemoteRootPath(remoteRoot: string): string {
  const normalizedRemoteRoot = path.posix.normalize(remoteRoot.trim())
  if (!normalizedRemoteRoot) {
    throw buildRemoteProfileValidationError('remoteRoot is required.')
  }
  if (!normalizedRemoteRoot.startsWith('/')) {
    throw buildRemoteProfileValidationError(
      'remoteRoot must be an absolute POSIX path.',
    )
  }
  return normalizedRemoteRoot
}

function resolveLocalVsCodeTargetPath(
  rootPath: string,
  relativePath?: string,
): string {
  if (!relativePath) {
    return rootPath
  }

  const normalizedRelativePath = normalizeWorkspaceRelativePath(relativePath)
  const resolvedTargetPath = path.resolve(rootPath, normalizedRelativePath)
  if (
    resolvedTargetPath !== rootPath &&
    !resolvedTargetPath.startsWith(rootPath + path.sep)
  ) {
    throw new Error('Selected file is outside the workspace root.')
  }

  return resolvedTargetPath
}

function resolveRemoteVsCodeTargetPath(
  remoteRoot: string,
  relativePath?: string,
): string {
  const normalizedRemoteRoot = normalizeRemoteRootPath(remoteRoot)
  if (!relativePath) {
    return normalizedRemoteRoot
  }

  const normalizedRelativePath = normalizeWorkspaceRelativePath(relativePath)
  const resolvedTargetPath = path.posix.normalize(
    path.posix.join(normalizedRemoteRoot, normalizedRelativePath),
  )
  if (
    resolvedTargetPath !== normalizedRemoteRoot &&
    !resolvedTargetPath.startsWith(normalizedRemoteRoot + '/')
  ) {
    throw new Error('Selected remote file is outside the workspace root.')
  }

  return resolvedTargetPath
}

export function buildRemoteItermCommand(
  profile: SystemOpenRemoteProfile,
): string {
  const host = normalizeRemoteSshValue(profile.host, 'host')
  const user = profile.user?.trim()
    ? normalizeRemoteSshValue(profile.user, 'user')
    : null
  const remoteRoot = normalizeRemoteRootPath(profile.remoteRoot)
  const destination = user
    ? `${user}@${host}`
    : host
  const remoteCommand = `cd ${quoteShellArgument(remoteRoot)} && exec $SHELL -l`
  const parts: string[] = ['ssh']

  if (typeof profile.port === 'number' && Number.isInteger(profile.port)) {
    parts.push('-p', String(profile.port))
  }
  if (profile.identityFile) {
    parts.push('-i', profile.identityFile, '-o', 'IdentitiesOnly=yes')
  }

  parts.push(destination, '-t', remoteCommand)
  return parts.map(quoteShellArgument).join(' ')
}

export function buildVsCodeRemoteArgs(
  profile: SystemOpenRemoteProfile,
  relativePath?: string,
): string[] {
  const sshAlias = profile.sshAlias?.trim()
  if (!sshAlias) {
    throw new Error(
      'Open in VSCode for remote workspace requires a local SSH config Host alias.',
    )
  }
  const normalizedAlias = normalizeRemoteSshValue(sshAlias, 'sshAlias')

  const encodedPathUrl = new URL('vscode-remote://placeholder')
  encodedPathUrl.pathname = resolveRemoteVsCodeTargetPath(
    profile.remoteRoot,
    relativePath,
  )

  const remoteTargetUri = `vscode-remote://ssh-remote+${normalizedAlias}${encodedPathUrl.pathname}`

  if (relativePath) {
    return ['--file-uri', remoteTargetUri]
  }

  return ['--folder-uri', remoteTargetUri]
}

async function resolveVsCodeCliPath(
  dependencies: Required<SystemOpenDependencies>,
): Promise<string | null> {
  try {
    const appPath = (
      await dependencies.execFileStdout('osascript', ['-e', VSCODE_APP_PATH_SCRIPT])
    ).trim()
    if (!appPath) {
      return null
    }
    return path.join(appPath, VSCODE_CLI_RELATIVE_PATH)
  } catch {
    return null
  }
}

function buildVsCodeOpenAppArgs(
  profile: SystemOpenRemoteProfile,
  relativePath?: string,
): string[] {
  return [
    '-a',
    getApplicationName('vscode'),
    '--args',
    ...buildVsCodeRemoteArgs(profile, relativePath),
  ]
}

function buildItermAppleScriptArgs(command: string): string[] {
  const escapedCommand = escapeAppleScriptString(command)
  const lines = [
    'tell application "iTerm"',
    'activate',
    'create window with default profile',
    'tell current session of current window',
    `write text "${escapedCommand}"`,
    'end tell',
    'end tell',
  ]

  return lines.flatMap((line) => ['-e', line])
}

function getUnsupportedRemoteTargetMessage(target: SystemOpenTarget): string {
  if (target === 'finder') {
    return 'Open in Finder is unavailable for remote workspace.'
  }
  return `Open in ${target} is unavailable for remote workspace.`
}

async function openLocalWorkspaceInExternalTool(
  target: SystemOpenTarget,
  rootPath: string,
  relativePath: string | undefined,
  dependencies: Required<SystemOpenDependencies>,
): Promise<SystemOpenInResult> {
  try {
    const resolvedRootPath = path.resolve(rootPath)
    const rootStats = await dependencies.statPath(resolvedRootPath)
    if (!rootStats.isDirectory()) {
      return {
        ok: false,
        error: 'Selected workspace root is not a directory.',
      }
    }

    if (target === 'finder') {
      await dependencies.execFile('open', [resolvedRootPath])
      return { ok: true }
    }

    const openPath =
      target === 'vscode'
        ? resolveLocalVsCodeTargetPath(resolvedRootPath, relativePath)
        : resolvedRootPath
    await dependencies.statPath(openPath)
    await dependencies.execFile('open', [
      '-a',
      getApplicationName(target),
      openPath,
    ])
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : `Failed to open workspace in ${target}.`,
    }
  }
}

async function openRemoteWorkspaceInExternalTool(
  target: SystemOpenTarget,
  request: SystemOpenInRequest,
  profile: SystemOpenRemoteProfile | null | undefined,
  dependencies: Required<SystemOpenDependencies>,
): Promise<SystemOpenInResult> {
  if (!profile || !profile.host.trim() || !profile.remoteRoot.trim()) {
    return {
      ok: false,
      error: 'Remote workspace profile is unavailable.',
    }
  }

  if (target === 'finder') {
    return {
      ok: false,
      error: getUnsupportedRemoteTargetMessage(target),
    }
  }

  try {
    if (target === 'iterm') {
      const command = buildRemoteItermCommand(profile)
      await dependencies.execFile('osascript', buildItermAppleScriptArgs(command))
      return { ok: true }
    }

    const primaryArgs = buildVsCodeRemoteArgs(profile, request.relativePath)
    const fallbackArgs = request.relativePath
      ? buildVsCodeRemoteArgs(profile)
      : null

    // Launch the app-bundled CLI first so the remote folder args reach an
    // already-running VSCode instance reliably on macOS.
    const cliPath = await resolveVsCodeCliPath(dependencies)
    if (cliPath) {
      try {
        await dependencies.execFile(cliPath, primaryArgs)
        return { ok: true }
      } catch {
        if (fallbackArgs) {
          try {
            await dependencies.execFile(cliPath, fallbackArgs)
            return { ok: true }
          } catch {
            // Fall through to app launch args when the bundled CLI is unavailable.
          }
        }
      }
    }

    try {
      await dependencies.execFile(
        'open',
        buildVsCodeOpenAppArgs(profile, request.relativePath),
      )
      return { ok: true }
    } catch (error) {
      if (!fallbackArgs) {
        throw error
      }

      await dependencies.execFile('open', buildVsCodeOpenAppArgs(profile))
    }
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message.trim().length > 0) {
      if (
        error.message.includes('requires a local SSH config Host alias') ||
        error.message.startsWith(REMOTE_PROFILE_VALIDATION_ERROR_PREFIX)
      ) {
        return {
          ok: false,
          error: error.message,
        }
      }
    }

    return {
      ok: false,
      error:
        target === 'iterm'
          ? 'Failed to launch iTerm SSH session.'
          : 'Failed to launch VSCode remote window.',
    }
  }
}

export async function openWorkspaceInExternalTool(
  request: SystemOpenInRequest,
  target: SystemOpenTarget,
  dependencies: SystemOpenDependencies = {},
): Promise<SystemOpenInResult> {
  const platform = dependencies.platform ?? process.platform
  if (platform !== 'darwin') {
    return {
      ok: false,
      error: 'Open in app is only supported on macOS.',
    }
  }

  const rootPath = request?.rootPath
  if (!rootPath) {
    return {
      ok: false,
      error: 'rootPath is required.',
    }
  }

  const resolvedDependencies: Required<SystemOpenDependencies> = {
    platform,
    execFile: dependencies.execFile ?? runExecFile,
    execFileStdout: dependencies.execFileStdout ?? runExecFileStdout,
    statPath: dependencies.statPath ?? stat,
  }

  if (getWorkspaceKind(request) === 'remote') {
    return openRemoteWorkspaceInExternalTool(
      target,
      request,
      request.remoteProfile,
      resolvedDependencies,
    )
  }

  return openLocalWorkspaceInExternalTool(
    target,
    rootPath,
    request.relativePath,
    resolvedDependencies,
  )
}
