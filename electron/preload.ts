import { ipcRenderer, contextBridge } from 'electron'
import {
  APPEARANCE_THEME_CHANGED_CHANNEL,
  APPEARANCE_THEME_MENU_REQUEST_CHANNEL,
} from './appearance-menu'
import {
  parseAppearanceTheme,
  type AppearanceTheme,
} from '../src/appearance-theme'

type WorkspaceOpenDialogResult = {
  canceled: boolean
  selectedPath: string | null
  error?: string
}

type WorkspaceFileNode = {
  name: string
  relativePath: string
  kind: 'file' | 'directory'
  children?: WorkspaceFileNode[]
  childrenStatus?: 'complete' | 'not-loaded' | 'partial'
  totalChildCount?: number
}

type WorkspaceIndexDirectoryResult = {
  ok: boolean
  children: WorkspaceFileNode[]
  childrenStatus: 'complete' | 'partial'
  totalChildCount: number
  error?: string
}

type WorkspaceIndexDirectoryOptions = {
  offset?: number
  limit?: number
}

type WorkspaceSearchFilesOptions = {
  maxDepth?: number
  maxResults?: number
  maxDirectoryChildren?: number
  timeBudgetMs?: number
}

type WorkspaceIndexResult = {
  ok: boolean
  fileTree: WorkspaceFileNode[]
  truncated?: boolean
  error?: string
}

type WorkspaceSearchFileMatch = {
  relativePath: string
  fileName: string
  parentRelativePath: string
}

type WorkspaceSearchFilesResult = {
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

type WorkspaceImagePreview = {
  mimeType: string
  dataUrl: string
}

type WorkspaceReadFileResult = {
  ok: boolean
  content: string | null
  imagePreview?: WorkspaceImagePreview
  error?: string
  previewUnavailableReason?: WorkspacePreviewUnavailableReason
}

type WorkspaceWriteFileResult = {
  ok: boolean
  error?: string
}

type WorkspaceCreateFileResult = {
  ok: boolean
  error?: string
}

type WorkspaceCreateDirectoryResult = {
  ok: boolean
  error?: string
}

type WorkspaceDeleteFileResult = {
  ok: boolean
  error?: string
}

type WorkspaceDeleteDirectoryResult = {
  ok: boolean
  error?: string
}

type WorkspaceGitLineMarkerKind = 'added' | 'modified'

type WorkspaceGitLineMarker = {
  line: number
  kind: WorkspaceGitLineMarkerKind
}

type WorkspaceGetGitLineMarkersResult = {
  ok: boolean
  markers: WorkspaceGitLineMarker[]
  error?: string
}

type CodeCommentRecord = {
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

type WorkspaceReadCommentsResult = {
  ok: boolean
  comments: CodeCommentRecord[]
  error?: string
}

type WorkspaceWriteCommentsResult = {
  ok: boolean
  error?: string
}

type WorkspaceReadGlobalCommentsResult = {
  ok: boolean
  body: string
  error?: string
}

type WorkspaceWriteGlobalCommentsResult = {
  ok: boolean
  error?: string
}

type WorkspaceExportCommentsBundleRequest = {
  rootPath: string
  commentsMarkdown?: string
  bundleMarkdown?: string
  writeCommentsFile: boolean
  writeBundleFile: boolean
}

type WorkspaceExportCommentsBundleResult = {
  ok: boolean
  commentsPath?: string
  bundlePath?: string
  error?: string
}

type WorkspaceWatchMode = 'native' | 'polling'

type WorkspaceWatchModePreference = 'auto' | 'native' | 'polling'

type WorkspaceWatchControlResult = {
  ok: boolean
  watchMode?: WorkspaceWatchMode
  isRemoteMounted?: boolean
  fallbackApplied?: boolean
  error?: string
}

type WorkspaceWatchFallbackEvent = {
  workspaceId: string
  watchMode: WorkspaceWatchMode
}

type WorkspaceWatchEvent = {
  workspaceId: string
  changedRelativePaths: string[]
  hasStructureChanges?: boolean
}

type WorkspaceHistoryNavigationDirection = 'back' | 'forward'

type WorkspaceHistoryNavigationSource = 'app-command' | 'swipe'

type WorkspaceHistoryNavigationEvent = {
  direction: WorkspaceHistoryNavigationDirection
  source: WorkspaceHistoryNavigationSource
}

type WorkspaceRemoteConnectionProfile = {
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

type WorkspaceRemoteDirectoryBrowseRequest = {
  host: string
  user?: string
  port?: number
  identityFile?: string
  targetPath?: string
  connectTimeoutMs?: number
  limit?: number
}

type WorkspaceRemoteDirectoryEntry = {
  name: string
  path: string
  kind: 'directory' | 'symlink'
}

type WorkspaceRemoteDirectoryBrowseResult = {
  ok: boolean
  currentPath: string
  entries: WorkspaceRemoteDirectoryEntry[]
  truncated: boolean
  errorCode?: string
  error?: string
}

type WorkspaceSyncVsCodeSshConfigRequest = {
  sshAlias: string
  host: string
  user?: string
  port?: number
  identityFile?: string
}

type WorkspaceSyncVsCodeSshConfigResult =
  | {
      ok: true
      configPath: string
      managedConfigPath: string
      includeInserted: boolean
      entryUpdated: boolean
    }
  | {
      ok: false
      error: string
    }

type WorkspaceRemoteConnectionEvent = {
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

type WorkspaceDisconnectRemoteResult = {
  ok: boolean
  workspaceId: string
  error?: string
}

type SystemOpenInRequest = {
  rootPath: string
  workspaceKind?: 'local' | 'remote'
  remoteProfile?: WorkspaceRemoteConnectionProfile | null
}

type SystemOpenInResult = {
  ok: boolean
  error?: string
}

type WorkspaceSetFileClipboardResult = {
  ok: boolean
  error?: string
}

type WorkspaceReadFileClipboardResult = {
  ok: boolean
  hasFiles: boolean
  source: 'internal' | 'finder' | 'none'
  error?: string
}

type WorkspaceCopyEntriesResult = {
  ok: boolean
  copiedPaths?: string[]
  error?: string
}

type WorkspacePasteFromClipboardResult = {
  ok: boolean
  pastedPaths?: string[]
  source: 'internal' | 'finder' | 'none'
  error?: string
}

const workspaceApi = {
  openDialog() {
    return ipcRenderer.invoke(
      'workspace:openDialog',
    ) as Promise<WorkspaceOpenDialogResult>
  },
  index(rootPath: string) {
    return ipcRenderer.invoke('workspace:index', {
      rootPath,
    }) as Promise<WorkspaceIndexResult>
  },
  indexDirectory(
    rootPath: string,
    relativePath: string,
    options?: WorkspaceIndexDirectoryOptions,
  ) {
    return ipcRenderer.invoke('workspace:indexDirectory', {
      rootPath,
      relativePath,
      offset: options?.offset,
      limit: options?.limit,
    }) as Promise<WorkspaceIndexDirectoryResult>
  },
  searchFiles(
    rootPath: string,
    query: string,
    options?: WorkspaceSearchFilesOptions,
  ) {
    return ipcRenderer.invoke('workspace:searchFiles', {
      rootPath,
      query,
      maxDepth: options?.maxDepth,
      maxResults: options?.maxResults,
      maxDirectoryChildren: options?.maxDirectoryChildren,
      timeBudgetMs: options?.timeBudgetMs,
    }) as Promise<WorkspaceSearchFilesResult>
  },
  readFile(rootPath: string, relativePath: string) {
    return ipcRenderer.invoke('workspace:readFile', {
      rootPath,
      relativePath,
    }) as Promise<WorkspaceReadFileResult>
  },
  writeFile(rootPath: string, relativePath: string, content: string) {
    return ipcRenderer.invoke('workspace:writeFile', {
      rootPath,
      relativePath,
      content,
    }) as Promise<WorkspaceWriteFileResult>
  },
  createFile(rootPath: string, relativePath: string) {
    return ipcRenderer.invoke('workspace:createFile', {
      rootPath,
      relativePath,
    }) as Promise<WorkspaceCreateFileResult>
  },
  createDirectory(rootPath: string, relativePath: string) {
    return ipcRenderer.invoke('workspace:createDirectory', {
      rootPath,
      relativePath,
    }) as Promise<WorkspaceCreateDirectoryResult>
  },
  deleteFile(rootPath: string, relativePath: string) {
    return ipcRenderer.invoke('workspace:deleteFile', {
      rootPath,
      relativePath,
    }) as Promise<WorkspaceDeleteFileResult>
  },
  deleteDirectory(rootPath: string, relativePath: string) {
    return ipcRenderer.invoke('workspace:deleteDirectory', {
      rootPath,
      relativePath,
    }) as Promise<WorkspaceDeleteDirectoryResult>
  },
  rename(rootPath: string, oldRelativePath: string, newRelativePath: string) {
    return ipcRenderer.invoke('workspace:rename', {
      rootPath,
      oldRelativePath,
      newRelativePath,
    }) as Promise<WorkspaceRenameResult>
  },
  getGitLineMarkers(rootPath: string, relativePath: string) {
    return ipcRenderer.invoke('workspace:getGitLineMarkers', {
      rootPath,
      relativePath,
    }) as Promise<WorkspaceGetGitLineMarkersResult>
  },
  getGitFileStatuses(rootPath: string) {
    return ipcRenderer.invoke('workspace:getGitFileStatuses', {
      rootPath,
    }) as Promise<WorkspaceGetGitFileStatusesResult>
  },
  readComments(rootPath: string) {
    return ipcRenderer.invoke('workspace:readComments', {
      rootPath,
    }) as Promise<WorkspaceReadCommentsResult>
  },
  writeComments(rootPath: string, comments: CodeCommentRecord[]) {
    return ipcRenderer.invoke('workspace:writeComments', {
      rootPath,
      comments,
    }) as Promise<WorkspaceWriteCommentsResult>
  },
  readGlobalComments(rootPath: string) {
    return ipcRenderer.invoke('workspace:readGlobalComments', {
      rootPath,
    }) as Promise<WorkspaceReadGlobalCommentsResult>
  },
  writeGlobalComments(rootPath: string, body: string) {
    return ipcRenderer.invoke('workspace:writeGlobalComments', {
      rootPath,
      body,
    }) as Promise<WorkspaceWriteGlobalCommentsResult>
  },
  exportCommentsBundle(request: WorkspaceExportCommentsBundleRequest) {
    return ipcRenderer.invoke(
      'workspace:exportCommentsBundle',
      request,
    ) as Promise<WorkspaceExportCommentsBundleResult>
  },
  watchStart(
    workspaceId: string,
    rootPath: string,
    watchModePreference: WorkspaceWatchModePreference = 'auto',
  ) {
    return ipcRenderer.invoke('workspace:watchStart', {
      workspaceId,
      rootPath,
      watchModePreference,
    }) as Promise<WorkspaceWatchControlResult>
  },
  watchStop(workspaceId: string) {
    return ipcRenderer.invoke('workspace:watchStop', {
      workspaceId,
    }) as Promise<WorkspaceWatchControlResult>
  },
  connectRemote(profile: WorkspaceRemoteConnectionProfile) {
    return ipcRenderer.invoke('workspace:connectRemote', {
      profile,
    }) as Promise<WorkspaceConnectRemoteResult>
  },
  syncVsCodeSshConfig(request: WorkspaceSyncVsCodeSshConfigRequest) {
    return ipcRenderer.invoke(
      'workspace:syncVsCodeSshConfig',
      request,
    ) as Promise<WorkspaceSyncVsCodeSshConfigResult>
  },
  browseRemoteDirectories(request: WorkspaceRemoteDirectoryBrowseRequest) {
    return ipcRenderer.invoke('workspace:browseRemoteDirectories', {
      request,
    }) as Promise<WorkspaceRemoteDirectoryBrowseResult>
  },
  disconnectRemote(workspaceId: string) {
    return ipcRenderer.invoke('workspace:disconnectRemote', {
      workspaceId,
    }) as Promise<WorkspaceDisconnectRemoteResult>
  },
  onWatchEvent(listener: (event: WorkspaceWatchEvent) => void) {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: WorkspaceWatchEvent,
    ) => {
      listener(payload)
    }
    ipcRenderer.on('workspace:watchEvent', handler)
    return () => {
      ipcRenderer.off('workspace:watchEvent', handler)
    }
  },
  onWatchFallback(listener: (event: WorkspaceWatchFallbackEvent) => void) {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: WorkspaceWatchFallbackEvent,
    ) => {
      listener(payload)
    }
    ipcRenderer.on('workspace:watchFallback', handler)
    return () => {
      ipcRenderer.off('workspace:watchFallback', handler)
    }
  },
  onRemoteConnectionEvent(
    listener: (event: WorkspaceRemoteConnectionEvent) => void,
  ) {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: WorkspaceRemoteConnectionEvent,
    ) => {
      listener(payload)
    }
    ipcRenderer.on('workspace:remoteConnectionEvent', handler)
    return () => {
      ipcRenderer.off('workspace:remoteConnectionEvent', handler)
    }
  },
  onHistoryNavigate(
    listener: (event: WorkspaceHistoryNavigationEvent) => void,
  ) {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: WorkspaceHistoryNavigationEvent,
    ) => {
      listener(payload)
    }
    ipcRenderer.on('workspace:historyNavigate', handler)
    return () => {
      ipcRenderer.off('workspace:historyNavigate', handler)
    }
  },
  onAppearanceThemeMenuRequest(listener: (theme: AppearanceTheme) => void) {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { theme?: string },
    ) => {
      const nextTheme = parseAppearanceTheme(payload?.theme ?? null)
      if (!nextTheme) {
        return
      }
      listener(nextTheme)
    }
    ipcRenderer.on(APPEARANCE_THEME_MENU_REQUEST_CHANNEL, handler)
    return () => {
      ipcRenderer.off(APPEARANCE_THEME_MENU_REQUEST_CHANNEL, handler)
    }
  },
  notifyAppearanceThemeChanged(theme: AppearanceTheme) {
    ipcRenderer.send(APPEARANCE_THEME_CHANGED_CHANNEL, {
      theme,
    })
  },
  openInIterm(request: SystemOpenInRequest) {
    return ipcRenderer.invoke('system:openInIterm', request) as Promise<SystemOpenInResult>
  },
  openInVsCode(request: SystemOpenInRequest) {
    return ipcRenderer.invoke('system:openInVsCode', request) as Promise<SystemOpenInResult>
  },
  openInFinder(request: SystemOpenInRequest) {
    return ipcRenderer.invoke('system:openInFinder', request) as Promise<SystemOpenInResult>
  },
  setFileClipboard(
    rootPath: string,
    paths: { relativePath: string; kind: 'file' | 'directory' }[],
  ) {
    return ipcRenderer.invoke('workspace:setFileClipboard', {
      rootPath,
      paths,
    }) as Promise<WorkspaceSetFileClipboardResult>
  },
  readFileClipboard() {
    return ipcRenderer.invoke(
      'workspace:readFileClipboard',
    ) as Promise<WorkspaceReadFileClipboardResult>
  },
  copyEntries(
    rootPath: string,
    entries: { relativePath: string; kind: 'file' | 'directory' }[],
    destDir: string,
  ) {
    return ipcRenderer.invoke('workspace:copyEntries', {
      rootPath,
      entries,
      destDir,
    }) as Promise<WorkspaceCopyEntriesResult>
  },
  pasteFromClipboard(rootPath: string, destDir: string, isRemote?: boolean) {
    return ipcRenderer.invoke('workspace:pasteFromClipboard', {
      rootPath,
      destDir,
      isRemote,
    }) as Promise<WorkspacePasteFromClipboardResult>
  },
}

contextBridge.exposeInMainWorld('workspace', workspaceApi)
