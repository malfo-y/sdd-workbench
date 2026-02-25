import { ipcRenderer, contextBridge } from 'electron'

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

type WorkspaceIndexResult = {
  ok: boolean
  fileTree: WorkspaceFileNode[]
  truncated?: boolean
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

type SystemOpenInResult = {
  ok: boolean
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
  indexDirectory(rootPath: string, relativePath: string) {
    return ipcRenderer.invoke('workspace:indexDirectory', {
      rootPath,
      relativePath,
    }) as Promise<WorkspaceIndexDirectoryResult>
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
  getGitLineMarkers(rootPath: string, relativePath: string) {
    return ipcRenderer.invoke('workspace:getGitLineMarkers', {
      rootPath,
      relativePath,
    }) as Promise<WorkspaceGetGitLineMarkersResult>
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
  openInIterm(rootPath: string) {
    return ipcRenderer.invoke('system:openInIterm', {
      rootPath,
    }) as Promise<SystemOpenInResult>
  },
  openInVsCode(rootPath: string) {
    return ipcRenderer.invoke('system:openInVsCode', {
      rootPath,
    }) as Promise<SystemOpenInResult>
  },
  openInFinder(rootPath: string) {
    return ipcRenderer.invoke('system:openInFinder', {
      rootPath,
    }) as Promise<SystemOpenInResult>
  },
}

contextBridge.exposeInMainWorld('workspace', workspaceApi)
