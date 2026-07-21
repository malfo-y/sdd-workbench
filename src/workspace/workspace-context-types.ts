import type { ReactNode } from 'react'
import { type CodeComment } from '../code-comments/comment-types'
import type {
  GitFileStatusKind,
  LineSelectionRange,
  WorkspaceGitLineMarker,
  WorkspaceId,
  WorkspaceKind,
  WorkspaceRemoteConnectionState,
  WorkspaceRemoteProfile,
  WorkspaceWatchMode,
  WorkspaceWatchModePreference,
} from './workspace-model'

export type WorkspaceContextState = {
  workspaceOrder: WorkspaceId[]
  workspaces: Array<{ id: WorkspaceId; rootPath: string }>
  activeWorkspaceId: WorkspaceId | null
  rootPath: string | null
  workspaceKind: WorkspaceKind | null
  remoteProfile: WorkspaceRemoteProfile | null
  remoteConnectionState: WorkspaceRemoteConnectionState | null
  remoteErrorCode: string | null
  fileTree: WorkspaceFileNode[]
  changedFiles: string[]
  gitFileStatuses: Record<string, GitFileStatusKind>
  activeFile: string | null
  activeSpec: string | null
  activeFileContent: string | null
  activeFileImagePreview: WorkspaceImagePreview | null
  activeFileGitLineMarkers: WorkspaceGitLineMarker[]
  activeSpecContent: string | null
  isIndexing: boolean
  isReadingFile: boolean
  isReadingSpec: boolean
  readFileError: string | null
  activeSpecReadError: string | null
  previewUnavailableReason: WorkspacePreviewUnavailableReason | null
  selectionRange: LineSelectionRange | null
  expandedDirectories: string[]
  comments: CodeComment[]
  isReadingComments: boolean
  isWritingComments: boolean
  commentsError: string | null
  globalComments: string
  isReadingGlobalComments: boolean
  isWritingGlobalComments: boolean
  globalCommentsError: string | null
  loadingDirectories: string[]
  watchModePreference: WorkspaceWatchModePreference
  watchMode: WorkspaceWatchMode | null
  isRemoteMounted: boolean
  isDirty: boolean
  externalChangeDetected: boolean
  bannerMessage: string | null
}

export type WorkspaceContextRemote = {
  remoteProfile: WorkspaceRemoteProfile | null
  remoteConnectionState: WorkspaceRemoteConnectionState | null
  remoteErrorCode: string | null
  watchModePreference: WorkspaceWatchModePreference
  watchMode: WorkspaceWatchMode | null
  isRemoteMounted: boolean
  connectRemoteWorkspace: (profile: WorkspaceRemoteProfile) => Promise<boolean>
  disconnectRemoteWorkspace: (workspaceId?: WorkspaceId) => Promise<boolean>
  retryRemoteWorkspaceConnection: (workspaceId?: WorkspaceId) => Promise<boolean>
  setWatchModePreference: (preference: WorkspaceWatchModePreference) => Promise<void>
}

export type WorkspaceContextActions = {
  markFileDirty: (draftContent?: string) => void
  openWorkspace: () => Promise<void>
  setActiveWorkspace: (workspaceId: WorkspaceId) => void
  switchWorkspace: (workspaceId: WorkspaceId) => void
  closeWorkspace: (workspaceId: WorkspaceId) => Promise<void>
  selectFile: (relativePath: string) => void
  canGoBack: boolean
  canGoForward: boolean
  goBackInHistory: () => void
  goForwardInHistory: () => void
  reloadComments: () => Promise<void>
  saveComments: (comments: CodeComment[]) => Promise<boolean>
  reloadGlobalComments: () => Promise<void>
  saveGlobalComments: (body: string, workspaceId?: WorkspaceId) => Promise<boolean>
  showBanner: (message: string) => void
  saveFile: (content: string) => Promise<boolean>
  setSelectionRange: (selectionRange: LineSelectionRange | null) => void
  setExpandedDirectories: (expandedDirectories: string[]) => void
  loadDirectoryChildren: (
    relativePath: string,
    options?: { append?: boolean },
  ) => Promise<void>
  refreshFileTree: () => Promise<void>
  searchFiles: (query: string) => Promise<WorkspaceSearchFilesResult>
  searchText: (query: string) => Promise<WorkspaceSearchTextResult>
  clearBanner: () => void
  reloadExternalChange: () => void
  dismissExternalChange: () => void
  createFile: (relativePath: string) => Promise<boolean>
  createDirectory: (relativePath: string) => Promise<boolean>
  deleteFile: (relativePath: string) => Promise<boolean>
  deleteDirectory: (relativePath: string) => Promise<boolean>
  renameFileOrDirectory: (
    oldRelativePath: string,
    newRelativePath: string,
  ) => Promise<boolean>
}

export type WorkspaceContextValue =
  & WorkspaceContextState
  & WorkspaceContextRemote
  & WorkspaceContextActions
  & {
    state: WorkspaceContextState
    remote: WorkspaceContextRemote
    actions: WorkspaceContextActions
  }

export type WorkspaceProviderProps = {
  children: ReactNode
}
