import type { WorkspaceFileNode } from './workspace/workspace-model'

export function collectWorkspaceFilePaths(
  nodes: WorkspaceFileNode[],
  paths = new Set<string>(),
): Set<string> {
  for (const node of nodes) {
    if (node.kind === 'file') {
      paths.add(node.relativePath)
      continue
    }

    collectWorkspaceFilePaths(node.children ?? [], paths)
  }

  return paths
}

export function formatWorkspaceWatchMode(watchMode: 'native' | 'polling' | null) {
  if (watchMode === 'native') {
    return 'Native'
  }
  if (watchMode === 'polling') {
    return 'Polling'
  }
  return 'Not started'
}

export function isFatalRemoteErrorCode(errorCode: string | null) {
  return (
    errorCode === 'AUTH_FAILED' ||
    errorCode === 'AGENT_PROTOCOL_MISMATCH' ||
    errorCode === 'PATH_DENIED'
  )
}

export function getRemoteRecoveryHint(errorCode: string | null) {
  if (!errorCode) {
    return 'Retry connection to restore remote workspace access.'
  }
  if (isFatalRemoteErrorCode(errorCode)) {
    return 'Connection failed due to configuration or permission issues. Fix credentials/path and reconnect.'
  }
  return 'Temporary connectivity issue detected. Retry connection to recover the session.'
}
