/**
 * Shared IPC type definitions for the Electron main process and preload bridge.
 *
 * This file contains TypeScript types and the IPC_CHANNELS constant map.
 * The preload script uses `import type` for types (erased at build time).
 * IPC_CHANNELS is a plain string-literal object with no Node.js module deps,
 * so it is safe to import at runtime in the preload sandbox if needed.
 */

import type { WorkspaceGitLineMarker } from './git-line-markers'
import type { GitFileStatusMap } from './git-file-statuses'
import type {
  WorkspaceWatchMode,
  WorkspaceWatchModePreference,
} from './workspace-watch-mode'
import type { RemoteConnectionProfile } from './remote-agent/types'
import type {
  RemoteDirectoryBrowseEntry,
  RemoteDirectoryBrowseRequest,
} from './remote-agent/directory-browser'
import type {
  WorkspaceSyncVsCodeSshConfigRequest,
  WorkspaceSyncVsCodeSshConfigResult,
} from './vscode-ssh-config'
import type {
  SystemOpenInRequest,
  SystemOpenInResult,
} from './system-open'

// Re-export imported types so consumers can get everything from one place
export type {
  WorkspaceGitLineMarker,
  GitFileStatusMap,
  WorkspaceWatchMode,
  WorkspaceWatchModePreference,
  RemoteConnectionProfile,
  RemoteDirectoryBrowseEntry,
  RemoteDirectoryBrowseRequest,
  WorkspaceSyncVsCodeSshConfigRequest,
  WorkspaceSyncVsCodeSshConfigResult,
  SystemOpenInRequest,
  SystemOpenInResult,
}

// ---------------------------------------------------------------------------
// Workspace dialog
// ---------------------------------------------------------------------------

export type WorkspaceOpenDialogResult = {
  canceled: boolean
  selectedPath: string | null
  error?: string
}

// ---------------------------------------------------------------------------
// File tree / indexing
// ---------------------------------------------------------------------------

export type WorkspaceFileNode = {
  name: string
  relativePath: string
  kind: 'file' | 'directory'
  children?: WorkspaceFileNode[]
  childrenStatus?: 'complete' | 'not-loaded' | 'partial'
  totalChildCount?: number
}

export type WorkspaceIndexRequest = {
  rootPath: string
}

export type WorkspaceIndexResult = {
  ok: boolean
  fileTree: WorkspaceFileNode[]
  truncated?: boolean
  error?: string
}

export type WorkspaceSearchFilesRequest = {
  rootPath: string
  query: string
  maxDepth?: number
  maxResults?: number
  maxDirectoryChildren?: number
  timeBudgetMs?: number
}

export type WorkspaceSearchFileMatch = {
  relativePath: string
  fileName: string
  parentRelativePath: string
}

export type WorkspaceSearchFilesResult = {
  ok: boolean
  results: WorkspaceSearchFileMatch[]
  truncated: boolean
  skippedLargeDirectoryCount: number
  depthLimitHit: boolean
  timedOut: boolean
  error?: string
}

export type WorkspaceIndexDirectoryRequest = {
  rootPath: string
  relativePath: string
  offset?: number
  limit?: number
}

export type WorkspaceIndexDirectoryResult = {
  ok: boolean
  children: WorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
  error?: string
}

// ---------------------------------------------------------------------------
// File read / write / CRUD
// ---------------------------------------------------------------------------

export type WorkspacePreviewUnavailableReason =
  | 'file_too_large'
  | 'binary_file'
  | 'blocked_resource'

export type WorkspaceImagePreview = {
  mimeType: string
  dataUrl: string
}

export type WorkspaceReadFileRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceReadFileResult = {
  ok: boolean
  content: string | null
  imagePreview?: WorkspaceImagePreview
  error?: string
  previewUnavailableReason?: WorkspacePreviewUnavailableReason
}

export type WorkspaceWriteFileRequest = {
  rootPath: string
  relativePath: string
  content: string
}

export type WorkspaceWriteFileResult = {
  ok: boolean
  error?: string
}

export type WorkspaceCreateFileRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceCreateFileResult = {
  ok: boolean
  error?: string
}

export type WorkspaceCreateDirectoryRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceCreateDirectoryResult = {
  ok: boolean
  error?: string
}

export type WorkspaceDeleteFileRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceDeleteFileResult = {
  ok: boolean
  error?: string
}

export type WorkspaceDeleteDirectoryRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceDeleteDirectoryResult = {
  ok: boolean
  error?: string
}

export type WorkspaceRenameRequest = {
  rootPath: string
  oldRelativePath: string
  newRelativePath: string
}

export type WorkspaceRenameResult = {
  ok: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

export type WorkspaceGetGitLineMarkersRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceGetGitLineMarkersResult = {
  ok: boolean
  markers: WorkspaceGitLineMarker[]
  error?: string
}

export type WorkspaceGetGitFileStatusesRequest = {
  rootPath: string
}

export type WorkspaceGetGitFileStatusesResult = {
  ok: boolean
  statuses: GitFileStatusMap
  error?: string
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export type CodeCommentRecord = {
  id: string
  relativePath: string
  startLine: number
  endLine: number
  body: string
  anchor: {
    snippet: string
    hash: string
    before?: string
    after?: string
    startOffset?: number
    endOffset?: number
  }
  createdAt: string
  exportedAt?: string
}

export type WorkspaceReadCommentsRequest = {
  rootPath: string
}

export type WorkspaceReadCommentsResult = {
  ok: boolean
  comments: CodeCommentRecord[]
  error?: string
}

export type WorkspaceWriteCommentsRequest = {
  rootPath: string
  comments: CodeCommentRecord[]
}

export type WorkspaceWriteCommentsResult = {
  ok: boolean
  error?: string
}

export type WorkspaceReadGlobalCommentsRequest = {
  rootPath: string
}

export type WorkspaceReadGlobalCommentsResult = {
  ok: boolean
  body: string
  error?: string
}

export type WorkspaceWriteGlobalCommentsRequest = {
  rootPath: string
  body: string
}

export type WorkspaceWriteGlobalCommentsResult = {
  ok: boolean
  error?: string
}

export type WorkspaceExportCommentsBundleRequest = {
  rootPath: string
  commentsMarkdown?: string
  bundleMarkdown?: string
  writeCommentsFile: boolean
  writeBundleFile: boolean
}

export type WorkspaceExportCommentsBundleResult = {
  ok: boolean
  commentsPath?: string
  bundlePath?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Workspace watching
// ---------------------------------------------------------------------------

export type WorkspaceWatchStartRequest = {
  workspaceId: string
  rootPath: string
  watchModePreference?: WorkspaceWatchModePreference
}

export type WorkspaceWatchStopRequest = {
  workspaceId: string
}

export type WorkspaceWatchControlResult = {
  ok: boolean
  watchMode?: WorkspaceWatchMode
  isRemoteMounted?: boolean
  fallbackApplied?: boolean
  error?: string
}

export type WorkspaceWatchEventPayload = {
  workspaceId: string
  changedRelativePaths: string[]
  hasStructureChanges: boolean
}

export type WorkspaceWatchFallbackEvent = {
  workspaceId: string
  watchMode: WorkspaceWatchMode
}

// ---------------------------------------------------------------------------
// History navigation
// ---------------------------------------------------------------------------

export type WorkspaceHistoryNavigationDirection = 'back' | 'forward'

export type WorkspaceHistoryNavigationSource = 'app-command' | 'swipe'

export type WorkspaceHistoryNavigationEventPayload = {
  direction: WorkspaceHistoryNavigationDirection
  source: WorkspaceHistoryNavigationSource
}

// ---------------------------------------------------------------------------
// Remote workspace
// ---------------------------------------------------------------------------

export type WorkspaceConnectRemoteRequest = {
  profile: RemoteConnectionProfile
}

export type WorkspaceBrowseRemoteDirectoriesRequest = {
  request: RemoteDirectoryBrowseRequest
}

export type WorkspaceBrowseRemoteDirectoriesResult = {
  ok: boolean
  currentPath: string
  entries: RemoteDirectoryBrowseEntry[]
  truncated: boolean
  errorCode?: string
  error?: string
}

export type WorkspaceSyncVsCodeSshConfigIpcRequest = WorkspaceSyncVsCodeSshConfigRequest

export type WorkspaceDisconnectRemoteRequest = {
  workspaceId: string
}

// ---------------------------------------------------------------------------
// Preload-shared types (options, events, remote connection, clipboard)
// ---------------------------------------------------------------------------

export type WorkspaceIndexDirectoryOptions = {
  offset?: number
  limit?: number
}

export type WorkspaceSearchFilesOptions = {
  maxDepth?: number
  maxResults?: number
  maxDirectoryChildren?: number
  timeBudgetMs?: number
}

export type WorkspaceRemoteConnectionProfile = {
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

export type WorkspaceRemoteDirectoryBrowseRequest = {
  host: string
  user?: string
  port?: number
  identityFile?: string
  targetPath?: string
  connectTimeoutMs?: number
  limit?: number
}

export type WorkspaceRemoteDirectoryEntry = {
  name: string
  path: string
  kind: 'directory' | 'symlink'
}

export type WorkspaceRemoteDirectoryBrowseResult = {
  ok: boolean
  currentPath: string
  entries: WorkspaceRemoteDirectoryEntry[]
  truncated: boolean
  errorCode?: string
  error?: string
}

export type WorkspaceRemoteConnectionEvent = {
  workspaceId: string
  sessionId?: string
  state: 'connecting' | 'connected' | 'degraded' | 'disconnected'
  errorCode?: string
  message?: string
  occurredAt: string
}

export type WorkspaceConnectRemoteResult =
  | {
      ok: true
      workspaceId: string
      sessionId: string
      rootPath: string
      remoteConnectionState: 'connected' | 'degraded'
      state: 'connected' | 'degraded'
    }
  | {
      ok: false
      workspaceId: string
      errorCode: string
      error: string
    }

export type WorkspaceDisconnectRemoteResult = {
  ok: boolean
  workspaceId: string
  error?: string
}

export type WorkspaceSetFileClipboardResult = {
  ok: boolean
  error?: string
}

export type WorkspaceReadFileClipboardResult = {
  ok: boolean
  hasFiles: boolean
  source: 'internal' | 'finder' | 'none'
  error?: string
}

export type WorkspaceCopyEntriesResult = {
  ok: boolean
  copiedPaths?: string[]
  error?: string
}

export type WorkspacePasteFromClipboardResult = {
  ok: boolean
  pastedPaths?: string[]
  source: 'internal' | 'finder' | 'none'
  error?: string
}

// ---------------------------------------------------------------------------
// IPC channel name constants
// ---------------------------------------------------------------------------

export const IPC_CHANNELS = {
  WORKSPACE_OPEN_DIALOG: 'workspace:openDialog',
  WORKSPACE_INDEX: 'workspace:index',
  WORKSPACE_INDEX_DIRECTORY: 'workspace:indexDirectory',
  WORKSPACE_SEARCH_FILES: 'workspace:searchFiles',
  WORKSPACE_READ_FILE: 'workspace:readFile',
  WORKSPACE_WRITE_FILE: 'workspace:writeFile',
  WORKSPACE_CREATE_FILE: 'workspace:createFile',
  WORKSPACE_CREATE_DIRECTORY: 'workspace:createDirectory',
  WORKSPACE_DELETE_FILE: 'workspace:deleteFile',
  WORKSPACE_DELETE_DIRECTORY: 'workspace:deleteDirectory',
  WORKSPACE_RENAME: 'workspace:rename',
  WORKSPACE_GET_GIT_LINE_MARKERS: 'workspace:getGitLineMarkers',
  WORKSPACE_GET_GIT_FILE_STATUSES: 'workspace:getGitFileStatuses',
  WORKSPACE_READ_COMMENTS: 'workspace:readComments',
  WORKSPACE_WRITE_COMMENTS: 'workspace:writeComments',
  WORKSPACE_READ_GLOBAL_COMMENTS: 'workspace:readGlobalComments',
  WORKSPACE_WRITE_GLOBAL_COMMENTS: 'workspace:writeGlobalComments',
  WORKSPACE_EXPORT_COMMENTS_BUNDLE: 'workspace:exportCommentsBundle',
  WORKSPACE_WATCH_START: 'workspace:watchStart',
  WORKSPACE_WATCH_STOP: 'workspace:watchStop',
  WORKSPACE_CONNECT_REMOTE: 'workspace:connectRemote',
  WORKSPACE_SYNC_VSCODE_SSH_CONFIG: 'workspace:syncVsCodeSshConfig',
  WORKSPACE_BROWSE_REMOTE_DIRECTORIES: 'workspace:browseRemoteDirectories',
  WORKSPACE_DISCONNECT_REMOTE: 'workspace:disconnectRemote',
  SYSTEM_OPEN_IN_ITERM: 'system:openInIterm',
  SYSTEM_OPEN_IN_VSCODE: 'system:openInVsCode',
  SYSTEM_OPEN_IN_FINDER: 'system:openInFinder',
  WORKSPACE_SET_FILE_CLIPBOARD: 'workspace:setFileClipboard',
  WORKSPACE_READ_FILE_CLIPBOARD: 'workspace:readFileClipboard',
  WORKSPACE_COPY_ENTRIES: 'workspace:copyEntries',
  WORKSPACE_PASTE_FROM_CLIPBOARD: 'workspace:pasteFromClipboard',
  // Event channels (main -> renderer, not handle/invoke)
  WORKSPACE_WATCH_EVENT: 'workspace:watchEvent',
  WORKSPACE_WATCH_FALLBACK: 'workspace:watchFallback',
  WORKSPACE_REMOTE_CONNECTION_EVENT: 'workspace:remoteConnectionEvent',
  WORKSPACE_HISTORY_NAVIGATE: 'workspace:historyNavigate',
} as const
