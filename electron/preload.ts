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

type WorkspaceWatchControlResult = {
  ok: boolean
  error?: string
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
  readFile(rootPath: string, relativePath: string) {
    return ipcRenderer.invoke('workspace:readFile', {
      rootPath,
      relativePath,
    }) as Promise<WorkspaceReadFileResult>
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
  exportCommentsBundle(request: WorkspaceExportCommentsBundleRequest) {
    return ipcRenderer.invoke(
      'workspace:exportCommentsBundle',
      request,
    ) as Promise<WorkspaceExportCommentsBundleResult>
  },
  watchStart(workspaceId: string, rootPath: string) {
    return ipcRenderer.invoke('workspace:watchStart', {
      workspaceId,
      rootPath,
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
}

contextBridge.exposeInMainWorld('workspace', workspaceApi)
