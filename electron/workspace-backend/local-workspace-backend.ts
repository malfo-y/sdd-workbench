import type {
  WorkspaceBackend,
  WorkspaceBackendMethodName,
  WorkspaceBackendRequest,
  WorkspaceBackendResult,
} from './types'

type LocalWorkspaceBackendHandlers = {
  [Method in WorkspaceBackendMethodName]: (
    request: WorkspaceBackendRequest<Method>,
  ) => Promise<WorkspaceBackendResult<Method>>
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
    copyEntries: handlers.copyEntries,
    watchStart: handlers.watchStart,
    watchStop: handlers.watchStop,
  }
}
