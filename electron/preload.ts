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
}

contextBridge.exposeInMainWorld('workspace', workspaceApi)
