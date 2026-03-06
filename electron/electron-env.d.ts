/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

interface WorkspaceOpenDialogResult {
  canceled: boolean
  selectedPath: string | null
  error?: string
}

interface WorkspaceFileNode {
  name: string
  relativePath: string
  kind: 'file' | 'directory'
  children?: WorkspaceFileNode[]
  childrenStatus?: 'complete' | 'not-loaded' | 'partial'
  totalChildCount?: number
}

interface WorkspaceIndexResult {
  ok: boolean
  fileTree: WorkspaceFileNode[]
  truncated?: boolean
  error?: string
}

interface WorkspaceSearchFileMatch {
  relativePath: string
  fileName: string
  parentRelativePath: string
}

interface WorkspaceSearchFilesResult {
  ok: boolean
  results: WorkspaceSearchFileMatch[]
  truncated: boolean
  skippedLargeDirectoryCount: number
  depthLimitHit: boolean
  timedOut: boolean
  error?: string
}

type WorkspacePreviewUnavailableReason =
  | 'file_too_large'
  | 'binary_file'
  | 'blocked_resource'

interface WorkspaceImagePreview {
  mimeType: string
  dataUrl: string
}

interface WorkspaceReadFileResult {
  ok: boolean
  content: string | null
  imagePreview?: WorkspaceImagePreview
  error?: string
  previewUnavailableReason?: WorkspacePreviewUnavailableReason
}

interface WorkspaceWriteFileResult {
  ok: boolean
  error?: string
}

interface WorkspaceCreateFileResult {
  ok: boolean
  error?: string
}

interface WorkspaceCreateDirectoryResult {
  ok: boolean
  error?: string
}

interface WorkspaceDeleteFileResult {
  ok: boolean
  error?: string
}

interface WorkspaceDeleteDirectoryResult {
  ok: boolean
  error?: string
}

interface WorkspaceRenameResult {
  ok: boolean
  error?: string
}

type WorkspaceGitLineMarkerKind = 'added' | 'modified'

interface WorkspaceGitLineMarker {
  line: number
  kind: WorkspaceGitLineMarkerKind
}

interface WorkspaceGetGitLineMarkersResult {
  ok: boolean
  markers: WorkspaceGitLineMarker[]
  error?: string
}

type GitFileStatusKind = 'added' | 'modified' | 'untracked'

interface WorkspaceGetGitFileStatusesResult {
  ok: boolean
  statuses: Record<string, GitFileStatusKind>
  error?: string
}

interface CodeCommentRecord {
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
  }
  createdAt: string
  exportedAt?: string
}

interface WorkspaceReadCommentsResult {
  ok: boolean
  comments: CodeCommentRecord[]
  error?: string
}

interface WorkspaceWriteCommentsResult {
  ok: boolean
  error?: string
}

interface WorkspaceReadGlobalCommentsResult {
  ok: boolean
  body: string
  error?: string
}

interface WorkspaceWriteGlobalCommentsResult {
  ok: boolean
  error?: string
}

interface WorkspaceExportCommentsBundleRequest {
  rootPath: string
  commentsMarkdown?: string
  bundleMarkdown?: string
  writeCommentsFile: boolean
  writeBundleFile: boolean
}

interface WorkspaceExportCommentsBundleResult {
  ok: boolean
  commentsPath?: string
  bundlePath?: string
  error?: string
}

type WorkspaceWatchMode = 'native' | 'polling'

type WorkspaceWatchModePreference = 'auto' | 'native' | 'polling'

interface WorkspaceWatchControlResult {
  ok: boolean
  watchMode?: WorkspaceWatchMode
  isRemoteMounted?: boolean
  fallbackApplied?: boolean
  error?: string
}

interface WorkspaceWatchEvent {
  workspaceId: string
  changedRelativePaths: string[]
  hasStructureChanges?: boolean
}

interface WorkspaceWatchFallbackEvent {
  workspaceId: string
  watchMode: WorkspaceWatchMode
}

interface WorkspaceIndexDirectoryRequest {
  rootPath: string
  relativePath: string
  offset?: number
  limit?: number
}

interface WorkspaceIndexDirectoryResult {
  ok: boolean
  children: WorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
  error?: string
}

type WorkspaceHistoryNavigationDirection = 'back' | 'forward'

type WorkspaceHistoryNavigationSource = 'app-command' | 'swipe'

interface WorkspaceHistoryNavigationEvent {
  direction: WorkspaceHistoryNavigationDirection
  source: WorkspaceHistoryNavigationSource
}

interface WorkspaceRemoteConnectionProfile {
  workspaceId: string
  host: string
  remoteRoot: string
  user?: string
  port?: number
  agentPath?: string
  identityFile?: string
  requestTimeoutMs?: number
  connectTimeoutMs?: number
}

interface WorkspaceRemoteDirectoryBrowseRequest {
  host: string
  user?: string
  port?: number
  identityFile?: string
  targetPath?: string
  connectTimeoutMs?: number
  limit?: number
}

interface WorkspaceRemoteDirectoryEntry {
  name: string
  path: string
  kind: 'directory' | 'symlink'
}

interface WorkspaceRemoteDirectoryBrowseResult {
  ok: boolean
  currentPath: string
  entries: WorkspaceRemoteDirectoryEntry[]
  truncated: boolean
  errorCode?: string
  error?: string
}

interface WorkspaceRemoteConnectionEvent {
  workspaceId: string
  sessionId?: string
  state: 'connecting' | 'connected' | 'degraded' | 'disconnected'
  errorCode?: string
  message?: string
  occurredAt: string
}

type WorkspaceConnectRemoteResult =
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

interface WorkspaceDisconnectRemoteResult {
  ok: boolean
  workspaceId: string
  error?: string
}

interface SystemOpenInResult {
  ok: boolean
  error?: string
}

interface Window {
  workspace: {
    openDialog: () => Promise<WorkspaceOpenDialogResult>
    index: (rootPath: string) => Promise<WorkspaceIndexResult>
    indexDirectory: (
      rootPath: string,
      relativePath: string,
      options?: { offset?: number; limit?: number },
    ) => Promise<WorkspaceIndexDirectoryResult>
    searchFiles: (
      rootPath: string,
      query: string,
      options?: {
        maxDepth?: number
        maxResults?: number
        maxDirectoryChildren?: number
        timeBudgetMs?: number
      },
    ) => Promise<WorkspaceSearchFilesResult>
    readFile: (
      rootPath: string,
      relativePath: string,
    ) => Promise<WorkspaceReadFileResult>
    writeFile: (
      rootPath: string,
      relativePath: string,
      content: string,
    ) => Promise<WorkspaceWriteFileResult>
    createFile: (
      rootPath: string,
      relativePath: string,
    ) => Promise<WorkspaceCreateFileResult>
    createDirectory: (
      rootPath: string,
      relativePath: string,
    ) => Promise<WorkspaceCreateDirectoryResult>
    deleteFile: (
      rootPath: string,
      relativePath: string,
    ) => Promise<WorkspaceDeleteFileResult>
    deleteDirectory: (
      rootPath: string,
      relativePath: string,
    ) => Promise<WorkspaceDeleteDirectoryResult>
    rename: (
      rootPath: string,
      oldRelativePath: string,
      newRelativePath: string,
    ) => Promise<WorkspaceRenameResult>
    getGitLineMarkers: (
      rootPath: string,
      relativePath: string,
    ) => Promise<WorkspaceGetGitLineMarkersResult>
    getGitFileStatuses: (
      rootPath: string,
    ) => Promise<WorkspaceGetGitFileStatusesResult>
    readComments: (rootPath: string) => Promise<WorkspaceReadCommentsResult>
    writeComments: (
      rootPath: string,
      comments: CodeCommentRecord[],
    ) => Promise<WorkspaceWriteCommentsResult>
    readGlobalComments: (
      rootPath: string,
    ) => Promise<WorkspaceReadGlobalCommentsResult>
    writeGlobalComments: (
      rootPath: string,
      body: string,
    ) => Promise<WorkspaceWriteGlobalCommentsResult>
    exportCommentsBundle: (
      request: WorkspaceExportCommentsBundleRequest,
    ) => Promise<WorkspaceExportCommentsBundleResult>
    watchStart: (
      workspaceId: string,
      rootPath: string,
      watchModePreference?: WorkspaceWatchModePreference,
    ) => Promise<WorkspaceWatchControlResult>
    watchStop: (workspaceId: string) => Promise<WorkspaceWatchControlResult>
    connectRemote: (
      profile: WorkspaceRemoteConnectionProfile,
    ) => Promise<WorkspaceConnectRemoteResult>
    browseRemoteDirectories: (
      request: WorkspaceRemoteDirectoryBrowseRequest,
    ) => Promise<WorkspaceRemoteDirectoryBrowseResult>
    disconnectRemote: (
      workspaceId: string,
    ) => Promise<WorkspaceDisconnectRemoteResult>
    onWatchEvent: (
      listener: (event: WorkspaceWatchEvent) => void,
    ) => () => void
    onWatchFallback: (
      listener: (event: WorkspaceWatchFallbackEvent) => void,
    ) => () => void
    onRemoteConnectionEvent: (
      listener: (event: WorkspaceRemoteConnectionEvent) => void,
    ) => () => void
    onHistoryNavigate: (
      listener: (event: WorkspaceHistoryNavigationEvent) => void,
    ) => () => void
    openInIterm: (rootPath: string) => Promise<SystemOpenInResult>
    openInVsCode: (rootPath: string) => Promise<SystemOpenInResult>
    openInFinder: (rootPath: string) => Promise<SystemOpenInResult>
  }
}
