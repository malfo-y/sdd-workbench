import { ipcRenderer, contextBridge } from 'electron'
import {
  APPEARANCE_THEME_CHANGED_CHANNEL,
  APPEARANCE_THEME_MENU_REQUEST_CHANNEL,
} from './appearance-menu'
import {
  parseAppearanceTheme,
  type AppearanceTheme,
} from '../src/appearance-theme'
import type {
  CodeCommentRecord,
  SystemOpenInRequest,
  SystemOpenInResult,
  WorkspaceConnectRemoteResult,
  WorkspaceCopyEntriesResult,
  WorkspaceCreateDirectoryResult,
  WorkspaceCreateFileResult,
  WorkspaceDeleteDirectoryResult,
  WorkspaceDeleteFileResult,
  WorkspaceDisconnectRemoteResult,
  WorkspaceExportCommentsBundleRequest,
  WorkspaceExportCommentsBundleResult,
  WorkspaceGetGitFileStatusesResult,
  WorkspaceGetGitLineMarkersResult,
  WorkspaceIndexDirectoryOptions,
  WorkspaceIndexDirectoryResult,
  WorkspaceIndexResult,
  WorkspaceOpenDialogResult,
  WorkspacePasteFromClipboardResult,
  WorkspaceReadCommentsResult,
  WorkspaceReadFileClipboardResult,
  WorkspaceReadFileResult,
  WorkspaceReadGlobalCommentsResult,
  WorkspaceRemoteConnectionEvent,
  WorkspaceRemoteConnectionProfile,
  WorkspaceRemoteDirectoryBrowseRequest,
  WorkspaceRemoteDirectoryBrowseResult,
  WorkspaceRenameResult,
  WorkspaceSearchFilesOptions,
  WorkspaceSearchFilesResult,
  WorkspaceSetFileClipboardResult,
  WorkspaceSyncVsCodeSshConfigRequest,
  WorkspaceSyncVsCodeSshConfigResult,
  WorkspaceWatchControlResult,
  WorkspaceWatchFallbackEvent,
  WorkspaceWatchModePreference,
  WorkspaceWriteCommentsResult,
  WorkspaceWriteFileResult,
  WorkspaceWriteGlobalCommentsResult,
} from './ipc-types'

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
  onWatchEvent(listener: (event: WorkspaceWatchEventPayload) => void) {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: WorkspaceWatchEventPayload,
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
    listener: (event: WorkspaceHistoryNavigationEventPayload) => void,
  ) {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: WorkspaceHistoryNavigationEventPayload,
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
