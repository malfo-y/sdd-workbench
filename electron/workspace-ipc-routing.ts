/**
 * Workspace IPC routing logic extracted from main.ts.
 * Sets up the local/remote backend router and provides routed handler
 * functions that delegate to the appropriate backend.
 */

import type { IpcMainInvokeEvent } from 'electron'
import { toRemoteAgentError } from './remote-agent/protocol'
import { redactRemoteErrorMessage } from './remote-agent/security'
import type { RemoteConnectionService } from './remote-agent/connection-service'
import type {
  RemoteConnectResult,
  RemoteDisconnectResult,
} from './remote-agent/types'
import { createLocalWorkspaceBackend } from './workspace-backend/local-workspace-backend'
import { createRemoteWorkspaceBackend } from './workspace-backend/remote-workspace-backend'
import { WorkspaceBackendRouter } from './workspace-backend/backend-router'
import type { WorkspaceBackend } from './workspace-backend/types'
import { copyEntries as localCopyEntries } from './workspace-backend/copy-entries'
import {
  syncVsCodeSshConfig,
} from './vscode-ssh-config'
import type {
  WorkspaceBrowseRemoteDirectoriesRequest,
  WorkspaceBrowseRemoteDirectoriesResult,
  WorkspaceConnectRemoteRequest,
  WorkspaceCreateDirectoryRequest,
  WorkspaceCreateDirectoryResult,
  WorkspaceCreateFileRequest,
  WorkspaceCreateFileResult,
  WorkspaceDeleteDirectoryRequest,
  WorkspaceDeleteDirectoryResult,
  WorkspaceDeleteFileRequest,
  WorkspaceDeleteFileResult,
  WorkspaceDisconnectRemoteRequest,
  WorkspaceExportCommentsBundleRequest,
  WorkspaceExportCommentsBundleResult,
  WorkspaceGetGitFileStatusesRequest,
  WorkspaceGetGitFileStatusesResult,
  WorkspaceGetGitLineMarkersRequest,
  WorkspaceGetGitLineMarkersResult,
  WorkspaceIndexDirectoryRequest,
  WorkspaceIndexDirectoryResult,
  WorkspaceIndexRequest,
  WorkspaceIndexResult,
  WorkspaceReadCommentsRequest,
  WorkspaceReadCommentsResult,
  WorkspaceReadFileRequest,
  WorkspaceReadFileResult,
  WorkspaceReadGlobalCommentsRequest,
  WorkspaceReadGlobalCommentsResult,
  WorkspaceRenameRequest,
  WorkspaceRenameResult,
  WorkspaceSearchFilesRequest,
  WorkspaceSearchFilesResult,
  WorkspaceSyncVsCodeSshConfigIpcRequest,
  WorkspaceSyncVsCodeSshConfigResult,
  WorkspaceWatchControlResult,
  WorkspaceWatchStartRequest,
  WorkspaceWatchStopRequest,
  WorkspaceWriteCommentsRequest,
  WorkspaceWriteCommentsResult,
  WorkspaceWriteFileRequest,
  WorkspaceWriteFileResult,
  WorkspaceWriteGlobalCommentsRequest,
  WorkspaceWriteGlobalCommentsResult,
} from './ipc-types'
import {
  handleWorkspaceCreateDirectory,
  handleWorkspaceCreateFile,
  handleWorkspaceDeleteDirectory,
  handleWorkspaceDeleteFile,
  handleWorkspaceExportCommentsBundle,
  handleWorkspaceGetGitFileStatuses,
  handleWorkspaceGetGitLineMarkers,
  handleWorkspaceIndex,
  handleWorkspaceIndexDirectory,
  handleWorkspaceReadComments,
  handleWorkspaceReadFile,
  handleWorkspaceReadGlobalComments,
  handleWorkspaceRename,
  handleWorkspaceSearchFiles,
  handleWorkspaceWriteComments,
  handleWorkspaceWriteFile,
  handleWorkspaceWriteGlobalComments,
} from './workspace-ipc-handlers'
import {
  handleWorkspaceWatchStart,
  handleWorkspaceWatchStop,
  sendWorkspaceWatchEvent,
  sendWorkspaceWatchFallbackEvent,
} from './workspace-watchers'
import {
  browseRemoteDirectories,
} from './remote-agent/directory-browser'

// ---------------------------------------------------------------------------
// Types for dependency injection
// ---------------------------------------------------------------------------

export type RoutingDependencies = {
  remoteConnectionService: RemoteConnectionService
  queueRemoteAgentLog: (payload: Record<string, unknown>) => void
  sanitizeRemoteLogMessage: (message: string | undefined) => string | null
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const DUMMY_IPC_EVENT = {} as IpcMainInvokeEvent

let _deps: RoutingDependencies | null = null

let localWorkspaceBackend: ReturnType<typeof createLocalWorkspaceBackend>
let workspaceBackendRouter: WorkspaceBackendRouter

type RoutedWorkspaceRequest = {
  rootPath: string
}

type RoutedWorkspaceBackendMethod =
  | 'index'
  | 'indexDirectory'
  | 'searchFiles'
  | 'readFile'
  | 'writeFile'
  | 'createFile'
  | 'createDirectory'
  | 'deleteFile'
  | 'deleteDirectory'
  | 'rename'
  | 'getGitLineMarkers'
  | 'getGitFileStatuses'
  | 'readComments'
  | 'writeComments'
  | 'readGlobalComments'
  | 'writeGlobalComments'
  | 'exportCommentsBundle'
  | 'watchStart'

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export function initRouting(deps: RoutingDependencies): WorkspaceBackendRouter {
  _deps = deps

  localWorkspaceBackend = createLocalWorkspaceBackend({
    index: async (request) => handleWorkspaceIndex(DUMMY_IPC_EVENT, request),
    indexDirectory: async (request) =>
      handleWorkspaceIndexDirectory(DUMMY_IPC_EVENT, request),
    searchFiles: async (request) =>
      handleWorkspaceSearchFiles(DUMMY_IPC_EVENT, request),
    readFile: async (request) => handleWorkspaceReadFile(DUMMY_IPC_EVENT, request),
    writeFile: async (request) =>
      handleWorkspaceWriteFile(DUMMY_IPC_EVENT, request),
    createFile: async (request) =>
      handleWorkspaceCreateFile(DUMMY_IPC_EVENT, request),
    createDirectory: async (request) =>
      handleWorkspaceCreateDirectory(DUMMY_IPC_EVENT, request),
    deleteFile: async (request) =>
      handleWorkspaceDeleteFile(DUMMY_IPC_EVENT, request),
    deleteDirectory: async (request) =>
      handleWorkspaceDeleteDirectory(DUMMY_IPC_EVENT, request),
    rename: async (request) => handleWorkspaceRename(DUMMY_IPC_EVENT, request),
    getGitLineMarkers: async (request) =>
      handleWorkspaceGetGitLineMarkers(DUMMY_IPC_EVENT, request),
    getGitFileStatuses: async (request) =>
      handleWorkspaceGetGitFileStatuses(DUMMY_IPC_EVENT, request),
    readComments: async (request) =>
      handleWorkspaceReadComments(DUMMY_IPC_EVENT, request),
    writeComments: async (request) =>
      handleWorkspaceWriteComments(DUMMY_IPC_EVENT, request),
    readGlobalComments: async (request) =>
      handleWorkspaceReadGlobalComments(DUMMY_IPC_EVENT, request),
    writeGlobalComments: async (request) =>
      handleWorkspaceWriteGlobalComments(DUMMY_IPC_EVENT, request),
    exportCommentsBundle: async (request) =>
      handleWorkspaceExportCommentsBundle(DUMMY_IPC_EVENT, request),
    copyEntries: async (request) => {
      await localCopyEntries(request)
      return { ok: true }
    },
    watchStart: async (request) =>
      handleWorkspaceWatchStart(DUMMY_IPC_EVENT, request),
    watchStop: async (request) =>
      handleWorkspaceWatchStop(DUMMY_IPC_EVENT, request),
  })

  workspaceBackendRouter = new WorkspaceBackendRouter(localWorkspaceBackend)
  return workspaceBackendRouter
}

export function getWorkspaceBackendRouter(): WorkspaceBackendRouter {
  return workspaceBackendRouter
}

// ---------------------------------------------------------------------------
// Error formatting
// ---------------------------------------------------------------------------

function toBackendErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  try {
    const normalized = toRemoteAgentError(error)
    return redactRemoteErrorMessage(normalized.message, fallbackMessage)
  } catch {
    if (error instanceof Error) {
      return redactRemoteErrorMessage(error.message, fallbackMessage)
    }
    return fallbackMessage
  }
}

function resolveWorkspaceBackend(request: RoutedWorkspaceRequest): WorkspaceBackend {
  return workspaceBackendRouter.resolveByRootPath(request?.rootPath ?? '')
}

function createRoutedWorkspaceHandler<
  Request extends RoutedWorkspaceRequest,
  Result,
>(
  backendMethod: RoutedWorkspaceBackendMethod,
  fallbackMessage: string,
  buildErrorResult: (errorMessage: string) => Result,
) {
  return async (
    _event: IpcMainInvokeEvent,
    request: Request,
  ): Promise<Result> => {
    try {
      const backend = resolveWorkspaceBackend(request)
      return (await backend[backendMethod](request)) as Result
    } catch (error) {
      return buildErrorResult(
        toBackendErrorMessage(error, fallbackMessage),
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Routed workspace handlers
// ---------------------------------------------------------------------------

export const handleWorkspaceIndexRouted = createRoutedWorkspaceHandler<
  WorkspaceIndexRequest,
  WorkspaceIndexResult
>('index', 'Failed to index workspace', (error) => ({
  ok: false,
  fileTree: [],
  error,
}))

export const handleWorkspaceIndexDirectoryRouted = createRoutedWorkspaceHandler<
  WorkspaceIndexDirectoryRequest,
  WorkspaceIndexDirectoryResult
>('indexDirectory', 'Failed to index directory', (error) => ({
  ok: false,
  children: [],
  childrenStatus: 'complete',
  totalChildCount: 0,
  error,
}))

export const handleWorkspaceSearchFilesRouted = createRoutedWorkspaceHandler<
  WorkspaceSearchFilesRequest,
  WorkspaceSearchFilesResult
>('searchFiles', 'Failed to search files', (error) => ({
  ok: false,
  results: [],
  truncated: false,
  skippedLargeDirectoryCount: 0,
  depthLimitHit: false,
  timedOut: false,
  error,
}))

export const handleWorkspaceReadFileRouted = createRoutedWorkspaceHandler<
  WorkspaceReadFileRequest,
  WorkspaceReadFileResult
>('readFile', 'Failed to read file', (error) => ({
  ok: false,
  content: null,
  error,
}))

export const handleWorkspaceWriteFileRouted = createRoutedWorkspaceHandler<
  WorkspaceWriteFileRequest,
  WorkspaceWriteFileResult
>('writeFile', 'Failed to write file.', (error) => ({
  ok: false,
  error,
}))

export const handleWorkspaceCreateFileRouted = createRoutedWorkspaceHandler<
  WorkspaceCreateFileRequest,
  WorkspaceCreateFileResult
>('createFile', 'Failed to create file.', (error) => ({
  ok: false,
  error,
}))

export const handleWorkspaceCreateDirectoryRouted = createRoutedWorkspaceHandler<
  WorkspaceCreateDirectoryRequest,
  WorkspaceCreateDirectoryResult
>('createDirectory', 'Failed to create directory.', (error) => ({
  ok: false,
  error,
}))

export const handleWorkspaceDeleteFileRouted = createRoutedWorkspaceHandler<
  WorkspaceDeleteFileRequest,
  WorkspaceDeleteFileResult
>('deleteFile', 'Failed to delete file.', (error) => ({
  ok: false,
  error,
}))

export const handleWorkspaceDeleteDirectoryRouted = createRoutedWorkspaceHandler<
  WorkspaceDeleteDirectoryRequest,
  WorkspaceDeleteDirectoryResult
>('deleteDirectory', 'Failed to delete directory.', (error) => ({
  ok: false,
  error,
}))

export const handleWorkspaceRenameRouted = createRoutedWorkspaceHandler<
  WorkspaceRenameRequest,
  WorkspaceRenameResult
>('rename', 'Failed to rename.', (error) => ({
  ok: false,
  error,
}))

export const handleWorkspaceGetGitLineMarkersRouted = createRoutedWorkspaceHandler<
  WorkspaceGetGitLineMarkersRequest,
  WorkspaceGetGitLineMarkersResult
>('getGitLineMarkers', 'Failed to read git line markers.', (error) => ({
  ok: false,
  markers: [],
  error,
}))

export const handleWorkspaceGetGitFileStatusesRouted = createRoutedWorkspaceHandler<
  WorkspaceGetGitFileStatusesRequest,
  WorkspaceGetGitFileStatusesResult
>('getGitFileStatuses', 'Failed to read git file statuses.', (error) => ({
  ok: false,
  statuses: {},
  error,
}))

export const handleWorkspaceReadCommentsRouted = createRoutedWorkspaceHandler<
  WorkspaceReadCommentsRequest,
  WorkspaceReadCommentsResult
>('readComments', 'Failed to read comments.', (error) => ({
  ok: false,
  comments: [],
  error,
}))

export const handleWorkspaceWriteCommentsRouted = createRoutedWorkspaceHandler<
  WorkspaceWriteCommentsRequest,
  WorkspaceWriteCommentsResult
>('writeComments', 'Failed to write comments.', (error) => ({
  ok: false,
  error,
}))

export const handleWorkspaceReadGlobalCommentsRouted = createRoutedWorkspaceHandler<
  WorkspaceReadGlobalCommentsRequest,
  WorkspaceReadGlobalCommentsResult
>('readGlobalComments', 'Failed to read global comments.', (error) => ({
  ok: false,
  body: '',
  error,
}))

export const handleWorkspaceWriteGlobalCommentsRouted = createRoutedWorkspaceHandler<
  WorkspaceWriteGlobalCommentsRequest,
  WorkspaceWriteGlobalCommentsResult
>('writeGlobalComments', 'Failed to write global comments.', (error) => ({
  ok: false,
  error,
}))

export const handleWorkspaceExportCommentsBundleRouted = createRoutedWorkspaceHandler<
  WorkspaceExportCommentsBundleRequest,
  WorkspaceExportCommentsBundleResult
>('exportCommentsBundle', 'Failed to export comments bundle.', (error) => ({
  ok: false,
  error,
}))

export const handleWorkspaceWatchStartRouted = createRoutedWorkspaceHandler<
  WorkspaceWatchStartRequest,
  WorkspaceWatchControlResult
>('watchStart', 'Failed to start workspace watcher.', (error) => ({
  ok: false,
  error,
}))

export async function handleWorkspaceWatchStopRouted(
  _event: IpcMainInvokeEvent,
  request: WorkspaceWatchStopRequest,
): Promise<WorkspaceWatchControlResult> {
  try {
    const workspaceId = request?.workspaceId
    if (!workspaceId) {
      return {
        ok: false,
        error: 'workspaceId is required.',
      }
    }

    const remoteRootPath = workspaceBackendRouter.getRemoteRootPath(workspaceId)
    if (remoteRootPath) {
      const backend = workspaceBackendRouter.resolveByRootPath(remoteRootPath)
      return (await backend.watchStop(request)) as WorkspaceWatchControlResult
    }

    return (await localWorkspaceBackend.watchStop(
      request,
    )) as WorkspaceWatchControlResult
  } catch (error) {
    return {
      ok: false,
      error: toBackendErrorMessage(error, 'Failed to stop workspace watcher.'),
    }
  }
}

// ---------------------------------------------------------------------------
// Remote connection handlers
// ---------------------------------------------------------------------------

export async function handleWorkspaceConnectRemote(
  _event: IpcMainInvokeEvent,
  request: WorkspaceConnectRemoteRequest,
): Promise<RemoteConnectResult> {
  if (!_deps) {
    return {
      ok: false,
      workspaceId: '',
      errorCode: 'UNKNOWN',
      error: 'Routing not initialized.',
    }
  }

  const profile = request?.profile
  if (!profile) {
    return {
      ok: false,
      workspaceId: '',
      errorCode: 'UNKNOWN',
      error: 'profile is required.',
    }
  }

  _deps.queueRemoteAgentLog({
    at: new Date().toISOString(),
    source: 'connectRemote.request',
    workspaceId: profile.workspaceId ?? null,
    host: profile.host ?? null,
    user: profile.user ?? null,
    port: profile.port ?? null,
    remoteRoot: profile.remoteRoot ?? null,
    agentPath: profile.agentPath ?? null,
    hasIdentityFile:
      typeof profile.identityFile === 'string' && profile.identityFile.trim().length > 0,
  })

  const connectResult = await _deps.remoteConnectionService.connect(profile)
  if (!connectResult.ok) {
    _deps.queueRemoteAgentLog({
      at: new Date().toISOString(),
      source: 'connectRemote.result',
      ok: false,
      workspaceId: connectResult.workspaceId,
      errorCode: connectResult.errorCode,
      error: _deps.sanitizeRemoteLogMessage(connectResult.error),
    })
    return connectResult
  }

  _deps.queueRemoteAgentLog({
    at: new Date().toISOString(),
    source: 'connectRemote.result',
    ok: true,
    workspaceId: connectResult.workspaceId,
    sessionId: connectResult.sessionId,
    rootPath: connectResult.rootPath,
    remoteConnectionState: connectResult.remoteConnectionState,
  })

  const remoteBackend = createRemoteWorkspaceBackend({
    workspaceId: connectResult.workspaceId,
    rootPath: connectResult.rootPath,
    requestRemote: async (workspaceId, method, params) =>
      _deps!.remoteConnectionService.request(workspaceId, method, params),
    subscribeAgentEvents: (workspaceId, listener) =>
      _deps!.remoteConnectionService.onAgentEvent(workspaceId, listener),
    sendWatchEvent: sendWorkspaceWatchEvent,
    sendWatchFallback: sendWorkspaceWatchFallbackEvent,
  })

  workspaceBackendRouter.registerRemoteWorkspace({
    workspaceId: connectResult.workspaceId,
    rootPath: connectResult.rootPath,
    backend: remoteBackend,
  })

  return connectResult
}

export async function handleWorkspaceBrowseRemoteDirectories(
  _event: IpcMainInvokeEvent,
  payload: WorkspaceBrowseRemoteDirectoriesRequest,
): Promise<WorkspaceBrowseRemoteDirectoriesResult> {
  const request = payload?.request
  if (!request) {
    return {
      ok: false,
      currentPath: '',
      entries: [],
      truncated: false,
      errorCode: 'UNKNOWN',
      error: 'request is required.',
    }
  }

  _deps?.queueRemoteAgentLog({
    at: new Date().toISOString(),
    source: 'remoteBrowse.request',
    host: request.host ?? null,
    user: request.user ?? null,
    port: request.port ?? null,
    targetPath: request.targetPath ?? null,
    hasIdentityFile:
      typeof request.identityFile === 'string' && request.identityFile.trim().length > 0,
    limit: request.limit ?? null,
  })

  try {
    const result = await browseRemoteDirectories(request)
    _deps?.queueRemoteAgentLog({
      at: new Date().toISOString(),
      source: 'remoteBrowse.result',
      ok: true,
      currentPath: result.currentPath,
      entryCount: result.entries.length,
      truncated: result.truncated,
    })

    return {
      ok: true,
      currentPath: result.currentPath,
      entries: result.entries,
      truncated: result.truncated,
    }
  } catch (error) {
    const normalized = toRemoteAgentError(error, 'UNKNOWN')
    const sanitizedError = redactRemoteErrorMessage(
      normalized.message,
      'Failed to browse remote directories.',
    )

    _deps?.queueRemoteAgentLog({
      at: new Date().toISOString(),
      source: 'remoteBrowse.result',
      ok: false,
      errorCode: normalized.code,
      error: sanitizedError,
    })

    return {
      ok: false,
      currentPath: request.targetPath?.trim() ?? '',
      entries: [],
      truncated: false,
      errorCode: normalized.code,
      error: sanitizedError,
    }
  }
}

export async function handleWorkspaceSyncVsCodeSshConfig(
  _event: IpcMainInvokeEvent,
  request: WorkspaceSyncVsCodeSshConfigIpcRequest,
): Promise<WorkspaceSyncVsCodeSshConfigResult> {
  return syncVsCodeSshConfig(request)
}

export async function handleWorkspaceDisconnectRemote(
  _event: IpcMainInvokeEvent,
  request: WorkspaceDisconnectRemoteRequest,
): Promise<RemoteDisconnectResult> {
  if (!_deps) {
    return {
      ok: false,
      workspaceId: '',
      error: 'Routing not initialized.',
    }
  }

  const workspaceId = request?.workspaceId
  if (!workspaceId) {
    return {
      ok: false,
      workspaceId: '',
      error: 'workspaceId is required.',
    }
  }

  const disconnectResult = await _deps.remoteConnectionService.disconnect(workspaceId)
  await workspaceBackendRouter.unregisterRemoteWorkspaceByWorkspaceId(
    workspaceId.trim(),
  )
  return disconnectResult
}

// ---------------------------------------------------------------------------
// Re-exports for registerIpcHandlers convenience
// ---------------------------------------------------------------------------

export { handleWorkspaceOpenDialog } from './workspace-ipc-handlers'
export {
  handleSystemOpenInFinder,
  handleSystemOpenInIterm,
  handleSystemOpenInVsCode,
} from './workspace-ipc-handlers'
