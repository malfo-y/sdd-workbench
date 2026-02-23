export type WorkspaceWatchMode = 'native' | 'polling'

export type WorkspaceWatchModePreference = 'auto' | 'native' | 'polling'

export type WorkspaceWatchModeResolvedBy = 'override' | 'heuristic'

export type ResolveWorkspaceWatchModeInput = {
  rootPath: string
  watchModePreference?: WorkspaceWatchModePreference
}

export type ResolveWorkspaceWatchModeResult = {
  watchMode: WorkspaceWatchMode
  isRemoteMounted: boolean
  resolvedBy: WorkspaceWatchModeResolvedBy
}

const REMOTE_MOUNT_ROOT = '/Volumes'
const REMOTE_MOUNT_PREFIX = `${REMOTE_MOUNT_ROOT}/`

function normalizePathForWatchMode(pathValue: string): string {
  const slashNormalizedPath = pathValue.replace(/\\/g, '/')
  return slashNormalizedPath.length > 1
    ? slashNormalizedPath.replace(/\/+$/, '')
    : slashNormalizedPath
}

function isRemoteMountedWorkspace(rootPath: string): boolean {
  const normalizedPath = normalizePathForWatchMode(rootPath)
  return (
    normalizedPath === REMOTE_MOUNT_ROOT ||
    normalizedPath.startsWith(REMOTE_MOUNT_PREFIX)
  )
}

function resolvePreference(
  watchModePreference: WorkspaceWatchModePreference | undefined,
): WorkspaceWatchModePreference {
  if (
    watchModePreference === 'native' ||
    watchModePreference === 'polling' ||
    watchModePreference === 'auto'
  ) {
    return watchModePreference
  }
  return 'auto'
}

export function resolveWorkspaceWatchMode(
  input: ResolveWorkspaceWatchModeInput,
): ResolveWorkspaceWatchModeResult {
  const preference = resolvePreference(input.watchModePreference)
  const isRemoteMounted = isRemoteMountedWorkspace(input.rootPath)

  if (preference === 'native' || preference === 'polling') {
    return {
      watchMode: preference,
      isRemoteMounted,
      resolvedBy: 'override',
    }
  }

  return {
    watchMode: isRemoteMounted ? 'polling' : 'native',
    isRemoteMounted,
    resolvedBy: 'heuristic',
  }
}
