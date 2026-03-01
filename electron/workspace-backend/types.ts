export type WorkspaceWatchMode = 'native' | 'polling'
export type WorkspaceWatchModePreference = 'auto' | 'native' | 'polling'

export type WorkspaceIndexRequest = {
  rootPath: string
}

export type WorkspaceIndexDirectoryRequest = {
  rootPath: string
  relativePath: string
  offset?: number
  limit?: number
}

export type WorkspaceReadFileRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceWriteFileRequest = {
  rootPath: string
  relativePath: string
  content: string
}

export type WorkspaceCreateFileRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceCreateDirectoryRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceDeleteFileRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceDeleteDirectoryRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceRenameRequest = {
  rootPath: string
  oldRelativePath: string
  newRelativePath: string
}

export type WorkspaceGetGitLineMarkersRequest = {
  rootPath: string
  relativePath: string
}

export type WorkspaceGetGitFileStatusesRequest = {
  rootPath: string
}

export type WorkspaceReadCommentsRequest = {
  rootPath: string
}

export type WorkspaceWriteCommentsRequest = {
  rootPath: string
  comments: any[]
}

export type WorkspaceReadGlobalCommentsRequest = {
  rootPath: string
}

export type WorkspaceWriteGlobalCommentsRequest = {
  rootPath: string
  body: string
}

export type WorkspaceExportCommentsBundleRequest = {
  rootPath: string
  commentsMarkdown?: string
  bundleMarkdown?: string
  writeCommentsFile: boolean
  writeBundleFile: boolean
}

export type WorkspaceWatchStartRequest = {
  workspaceId: string
  rootPath: string
  watchModePreference?: WorkspaceWatchModePreference
}

export type WorkspaceWatchStopRequest = {
  workspaceId: string
}

export type WorkspaceWatchEventPayload = {
  workspaceId: string
  changedRelativePaths: string[]
  hasStructureChanges: boolean
}

export type WorkspaceWatchFallbackEventPayload = {
  workspaceId: string
  watchMode: WorkspaceWatchMode
}

export type WorkspaceBackendKind = 'local' | 'remote'

export interface WorkspaceBackend {
  readonly kind: WorkspaceBackendKind
  index: (request: WorkspaceIndexRequest) => Promise<unknown>
  indexDirectory: (request: WorkspaceIndexDirectoryRequest) => Promise<unknown>
  readFile: (request: WorkspaceReadFileRequest) => Promise<unknown>
  writeFile: (request: WorkspaceWriteFileRequest) => Promise<unknown>
  createFile: (request: WorkspaceCreateFileRequest) => Promise<unknown>
  createDirectory: (request: WorkspaceCreateDirectoryRequest) => Promise<unknown>
  deleteFile: (request: WorkspaceDeleteFileRequest) => Promise<unknown>
  deleteDirectory: (request: WorkspaceDeleteDirectoryRequest) => Promise<unknown>
  rename: (request: WorkspaceRenameRequest) => Promise<unknown>
  getGitLineMarkers: (
    request: WorkspaceGetGitLineMarkersRequest,
  ) => Promise<unknown>
  getGitFileStatuses: (
    request: WorkspaceGetGitFileStatusesRequest,
  ) => Promise<unknown>
  readComments: (request: WorkspaceReadCommentsRequest) => Promise<unknown>
  writeComments: (request: WorkspaceWriteCommentsRequest) => Promise<unknown>
  readGlobalComments: (
    request: WorkspaceReadGlobalCommentsRequest,
  ) => Promise<unknown>
  writeGlobalComments: (
    request: WorkspaceWriteGlobalCommentsRequest,
  ) => Promise<unknown>
  exportCommentsBundle: (
    request: WorkspaceExportCommentsBundleRequest,
  ) => Promise<unknown>
  watchStart: (request: WorkspaceWatchStartRequest) => Promise<unknown>
  watchStop: (request: WorkspaceWatchStopRequest) => Promise<unknown>
  dispose?: () => Promise<void>
}
