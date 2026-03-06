import type {
  WorkspaceBackend,
  WorkspaceCreateDirectoryRequest,
  WorkspaceCreateFileRequest,
  WorkspaceDeleteDirectoryRequest,
  WorkspaceDeleteFileRequest,
  WorkspaceExportCommentsBundleRequest,
  WorkspaceGetGitFileStatusesRequest,
  WorkspaceGetGitLineMarkersRequest,
  WorkspaceIndexDirectoryRequest,
  WorkspaceIndexRequest,
  WorkspaceSearchFilesRequest,
  WorkspaceReadCommentsRequest,
  WorkspaceReadFileRequest,
  WorkspaceReadGlobalCommentsRequest,
  WorkspaceRenameRequest,
  WorkspaceWatchStartRequest,
  WorkspaceWatchStopRequest,
  WorkspaceWriteCommentsRequest,
  WorkspaceWriteFileRequest,
  WorkspaceWriteGlobalCommentsRequest,
} from './types'

type LocalWorkspaceBackendHandlers = {
  index: (request: WorkspaceIndexRequest) => Promise<unknown>
  indexDirectory: (request: WorkspaceIndexDirectoryRequest) => Promise<unknown>
  searchFiles: (request: WorkspaceSearchFilesRequest) => Promise<unknown>
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
}

export function createLocalWorkspaceBackend(
  handlers: LocalWorkspaceBackendHandlers,
): WorkspaceBackend {
  return {
    kind: 'local',
    index: handlers.index,
    indexDirectory: handlers.indexDirectory,
    searchFiles: handlers.searchFiles,
    readFile: handlers.readFile,
    writeFile: handlers.writeFile,
    createFile: handlers.createFile,
    createDirectory: handlers.createDirectory,
    deleteFile: handlers.deleteFile,
    deleteDirectory: handlers.deleteDirectory,
    rename: handlers.rename,
    getGitLineMarkers: handlers.getGitLineMarkers,
    getGitFileStatuses: handlers.getGitFileStatuses,
    readComments: handlers.readComments,
    writeComments: handlers.writeComments,
    readGlobalComments: handlers.readGlobalComments,
    writeGlobalComments: handlers.writeGlobalComments,
    exportCommentsBundle: handlers.exportCommentsBundle,
    watchStart: handlers.watchStart,
    watchStop: handlers.watchStop,
  }
}
