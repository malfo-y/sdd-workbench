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
  error?: string
}

type WorkspacePreviewUnavailableReason = 'file_too_large' | 'binary_file'

type WorkspaceReadFileResult = {
  ok: boolean
  content: string | null
  error?: string
  previewUnavailableReason?: WorkspacePreviewUnavailableReason
}

type WorkspaceWatchControlResult = {
  ok: boolean
  error?: string
}

type WorkspaceWatchEvent = {
  workspaceId: string
  changedRelativePaths: string[]
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
