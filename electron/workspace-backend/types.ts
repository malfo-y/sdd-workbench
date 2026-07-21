import type {
  WorkspaceCopyEntriesResult,
  WorkspaceCreateDirectoryResult,
  WorkspaceCreateFileResult,
  WorkspaceDeleteDirectoryResult,
  WorkspaceDeleteFileResult,
  WorkspaceExportCommentsBundleResult,
  WorkspaceGetGitFileStatusesResult,
  WorkspaceGetGitLineMarkersResult,
  WorkspaceIndexDirectoryResult,
  WorkspaceIndexResult,
  WorkspaceReadCommentsResult,
  WorkspaceReadFileResult,
  WorkspaceReadGlobalCommentsResult,
  WorkspaceRenameResult,
  WorkspaceSearchFilesResult,
  WorkspaceSearchTextResult,
  WorkspaceWatchControlResult,
  WorkspaceWatchSetFocusedPathsResult,
  WorkspaceWriteCommentsResult,
  WorkspaceWriteFileResult,
  WorkspaceWriteGlobalCommentsResult,
} from '../ipc-types'

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

export type WorkspaceSearchFilesRequest = {
  rootPath: string
  query: string
  maxDepth?: number
  maxResults?: number
  maxDirectoryChildren?: number
  timeBudgetMs?: number
}

export type WorkspaceSearchTextRequest = {
  rootPath: string
  query: string
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

export type WorkspaceCodeCommentRecord = {
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

export type WorkspaceWriteCommentsRequest = {
  rootPath: string
  comments: WorkspaceCodeCommentRecord[]
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

export type WorkspaceCopyEntriesRequest = {
  rootPath: string
  entries: { relativePath: string; kind: 'file' | 'directory' }[]
  destDir: string // 대상 디렉토리 (rootPath 기준 상대경로, '' = root)
}

export type WorkspaceWatchStartRequest = {
  workspaceId: string
  rootPath: string
  watchModePreference?: WorkspaceWatchModePreference
}

export type WorkspaceWatchStopRequest = {
  workspaceId: string
}

export type WorkspaceWatchSetFocusedPathsRequest = {
  workspaceId: string
  rootPath: string
  focusedRelativePaths: string[]
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

export type WorkspaceBackendMethodMap = {
  index: {
    request: WorkspaceIndexRequest
    result: WorkspaceIndexResult
  }
  indexDirectory: {
    request: WorkspaceIndexDirectoryRequest
    result: WorkspaceIndexDirectoryResult
  }
  searchFiles: {
    request: WorkspaceSearchFilesRequest
    result: WorkspaceSearchFilesResult
  }
  searchText: {
    request: WorkspaceSearchTextRequest
    result: WorkspaceSearchTextResult
  }
  readFile: {
    request: WorkspaceReadFileRequest
    result: WorkspaceReadFileResult
  }
  writeFile: {
    request: WorkspaceWriteFileRequest
    result: WorkspaceWriteFileResult
  }
  createFile: {
    request: WorkspaceCreateFileRequest
    result: WorkspaceCreateFileResult
  }
  createDirectory: {
    request: WorkspaceCreateDirectoryRequest
    result: WorkspaceCreateDirectoryResult
  }
  deleteFile: {
    request: WorkspaceDeleteFileRequest
    result: WorkspaceDeleteFileResult
  }
  deleteDirectory: {
    request: WorkspaceDeleteDirectoryRequest
    result: WorkspaceDeleteDirectoryResult
  }
  rename: {
    request: WorkspaceRenameRequest
    result: WorkspaceRenameResult
  }
  getGitLineMarkers: {
    request: WorkspaceGetGitLineMarkersRequest
    result: WorkspaceGetGitLineMarkersResult
  }
  getGitFileStatuses: {
    request: WorkspaceGetGitFileStatusesRequest
    result: WorkspaceGetGitFileStatusesResult
  }
  readComments: {
    request: WorkspaceReadCommentsRequest
    result: WorkspaceReadCommentsResult
  }
  writeComments: {
    request: WorkspaceWriteCommentsRequest
    result: WorkspaceWriteCommentsResult
  }
  readGlobalComments: {
    request: WorkspaceReadGlobalCommentsRequest
    result: WorkspaceReadGlobalCommentsResult
  }
  writeGlobalComments: {
    request: WorkspaceWriteGlobalCommentsRequest
    result: WorkspaceWriteGlobalCommentsResult
  }
  exportCommentsBundle: {
    request: WorkspaceExportCommentsBundleRequest
    result: WorkspaceExportCommentsBundleResult
  }
  copyEntries: {
    request: WorkspaceCopyEntriesRequest
    result: WorkspaceCopyEntriesResult
  }
  watchStart: {
    request: WorkspaceWatchStartRequest
    result: WorkspaceWatchControlResult
  }
  watchStop: {
    request: WorkspaceWatchStopRequest
    result: WorkspaceWatchControlResult
  }
  watchSetFocusedPaths: {
    request: WorkspaceWatchSetFocusedPathsRequest
    result: WorkspaceWatchSetFocusedPathsResult
  }
}

export type WorkspaceBackendMethodName = keyof WorkspaceBackendMethodMap

export type WorkspaceBackendRequest<
  Method extends WorkspaceBackendMethodName,
> = WorkspaceBackendMethodMap[Method]['request']

export type WorkspaceBackendResult<
  Method extends WorkspaceBackendMethodName,
> = WorkspaceBackendMethodMap[Method]['result']

export interface WorkspaceBackend {
  readonly kind: WorkspaceBackendKind
  index: (
    request: WorkspaceBackendRequest<'index'>,
  ) => Promise<WorkspaceBackendResult<'index'>>
  indexDirectory: (
    request: WorkspaceBackendRequest<'indexDirectory'>,
  ) => Promise<WorkspaceBackendResult<'indexDirectory'>>
  searchFiles: (
    request: WorkspaceBackendRequest<'searchFiles'>,
  ) => Promise<WorkspaceBackendResult<'searchFiles'>>
  searchText: (
    request: WorkspaceBackendRequest<'searchText'>,
  ) => Promise<WorkspaceBackendResult<'searchText'>>
  readFile: (
    request: WorkspaceBackendRequest<'readFile'>,
  ) => Promise<WorkspaceBackendResult<'readFile'>>
  writeFile: (
    request: WorkspaceBackendRequest<'writeFile'>,
  ) => Promise<WorkspaceBackendResult<'writeFile'>>
  createFile: (
    request: WorkspaceBackendRequest<'createFile'>,
  ) => Promise<WorkspaceBackendResult<'createFile'>>
  createDirectory: (
    request: WorkspaceBackendRequest<'createDirectory'>,
  ) => Promise<WorkspaceBackendResult<'createDirectory'>>
  deleteFile: (
    request: WorkspaceBackendRequest<'deleteFile'>,
  ) => Promise<WorkspaceBackendResult<'deleteFile'>>
  deleteDirectory: (
    request: WorkspaceBackendRequest<'deleteDirectory'>,
  ) => Promise<WorkspaceBackendResult<'deleteDirectory'>>
  rename: (
    request: WorkspaceBackendRequest<'rename'>,
  ) => Promise<WorkspaceBackendResult<'rename'>>
  getGitLineMarkers: (
    request: WorkspaceBackendRequest<'getGitLineMarkers'>,
  ) => Promise<WorkspaceBackendResult<'getGitLineMarkers'>>
  getGitFileStatuses: (
    request: WorkspaceBackendRequest<'getGitFileStatuses'>,
  ) => Promise<WorkspaceBackendResult<'getGitFileStatuses'>>
  readComments: (
    request: WorkspaceBackendRequest<'readComments'>,
  ) => Promise<WorkspaceBackendResult<'readComments'>>
  writeComments: (
    request: WorkspaceBackendRequest<'writeComments'>,
  ) => Promise<WorkspaceBackendResult<'writeComments'>>
  readGlobalComments: (
    request: WorkspaceBackendRequest<'readGlobalComments'>,
  ) => Promise<WorkspaceBackendResult<'readGlobalComments'>>
  writeGlobalComments: (
    request: WorkspaceBackendRequest<'writeGlobalComments'>,
  ) => Promise<WorkspaceBackendResult<'writeGlobalComments'>>
  exportCommentsBundle: (
    request: WorkspaceBackendRequest<'exportCommentsBundle'>,
  ) => Promise<WorkspaceBackendResult<'exportCommentsBundle'>>
  copyEntries: (
    request: WorkspaceBackendRequest<'copyEntries'>,
  ) => Promise<WorkspaceBackendResult<'copyEntries'>>
  watchStart: (
    request: WorkspaceBackendRequest<'watchStart'>,
  ) => Promise<WorkspaceBackendResult<'watchStart'>>
  watchStop: (
    request: WorkspaceBackendRequest<'watchStop'>,
  ) => Promise<WorkspaceBackendResult<'watchStop'>>
  watchSetFocusedPaths?: (
    request: WorkspaceBackendRequest<'watchSetFocusedPaths'>,
  ) => Promise<WorkspaceBackendResult<'watchSetFocusedPaths'>>
  dispose?: () => Promise<void>
}
