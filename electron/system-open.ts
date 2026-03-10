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

function getWorkspaceKind(
  request: SystemOpenInRequest,
): 'local' | 'remote' {
  return request.workspaceKind === 'remote' ? 'remote' : 'local'
}

function getApplicationName(target: Exclude<SystemOpenTarget, 'finder'>): string {
  return target === 'iterm' ? 'iTerm' : 'Visual Studio Code'
}

function quoteShellArgument(value: string): string {
  return "'" + value.replace(/'/g, `'"'"'`) + "'"
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function buildRemoteItermCommand(
  profile: SystemOpenRemoteProfile,
): string {
  const destination = profile.user
    ? `${profile.user}@${profile.host}`
    : profile.host
  const remoteCommand = `cd ${quoteShellArgument(profile.remoteRoot)} && exec $SHELL -l`
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
): string[] {
  const sshAlias = profile.sshAlias?.trim()
  if (!sshAlias) {
    throw new Error(
      'Open in VSCode for remote workspace requires SSH Alias in the remote profile.',
    )
  }

  return [
    '-a',
    'Visual Studio Code',
    '--args',
    '--remote',
    `ssh-remote+${sshAlias}`,
    profile.remoteRoot,
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

    await dependencies.execFile('open', [
      '-a',
      getApplicationName(target),
      resolvedRootPath,
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

    await dependencies.execFile('open', buildVsCodeRemoteArgs(profile))
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message.trim().length > 0) {
      if (error.message.includes('requires SSH Alias')) {
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
    statPath: dependencies.statPath ?? stat,
  }

  if (getWorkspaceKind(request) === 'remote') {
    return openRemoteWorkspaceInExternalTool(
      target,
      request.remoteProfile,
      resolvedDependencies,
    )
  }

  return openLocalWorkspaceInExternalTool(
    target,
    rootPath,
    resolvedDependencies,
  )
}
