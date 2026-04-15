import { WORKSPACE_WATCH_POLL_INTERVAL_MS } from './workspace-utils'

export type WorkspaceWatchMode = 'native' | 'polling'

export type WorkspaceWatchModePreference = 'auto' | 'native' | 'polling'

export type WorkspaceWatchModeResolvedBy = 'override' | 'heuristic'

export type ResolveWorkspaceWatchModeInput = {
  rootPath: string
  watchModePreference?: WorkspaceWatchModePreference
  isRemoteMountedHint?: boolean
}

export type ResolveWorkspaceWatchModeResult = {
  watchMode: WorkspaceWatchMode
  isRemoteMounted: boolean
  resolvedBy: WorkspaceWatchModeResolvedBy
  pollIntervalMs: number
}

const REMOTE_MOUNTED_POLL_INTERVAL_MS = WORKSPACE_WATCH_POLL_INTERVAL_MS * 2

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
  const isRemoteMounted = input.isRemoteMountedHint === true
  const pollIntervalMs = isRemoteMounted
    ? REMOTE_MOUNTED_POLL_INTERVAL_MS
    : WORKSPACE_WATCH_POLL_INTERVAL_MS

  if (preference === 'native' || preference === 'polling') {
    return {
      watchMode: preference,
      isRemoteMounted,
      resolvedBy: 'override',
      pollIntervalMs,
    }
  }

  return {
    watchMode: isRemoteMounted ? 'polling' : 'native',
    isRemoteMounted,
    resolvedBy: 'heuristic',
    pollIntervalMs,
  }
}
