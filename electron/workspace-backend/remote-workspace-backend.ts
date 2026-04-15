import path from 'node:path'
import {
  RemoteAgentError,
  toRemoteAgentError,
} from '../remote-agent/protocol'
import {
  assertRemoteWorkspaceMethodAllowed,
  redactRemoteErrorMessage,
} from '../remote-agent/security'
import { RemoteGitBridge } from './remote-git-bridge'
import { RemoteWatchBridge } from './remote-watch-bridge'
import type { RemoteAgentEvent } from '../remote-agent/protocol'
import type {
  WorkspaceBackend,
  WorkspaceBackendResult,
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
  WorkspaceWatchEventPayload,
  WorkspaceWatchFallbackEventPayload,
  WorkspaceWatchStartRequest,
  WorkspaceWatchStopRequest,
  WorkspaceWriteCommentsRequest,
  WorkspaceWriteFileRequest,
  WorkspaceWriteGlobalCommentsRequest,
} from './types'

type RequestRemote = (
  workspaceId: string,
  method: string,
  params?: unknown,
) => Promise<unknown>

type RemoteWorkspaceRequestError = RemoteAgentError & {
  readonly requestMethod: string
  readonly workspaceId: string
}

type SubscribeAgentEvents = (
  workspaceId: string,
  listener: (event: RemoteAgentEvent) => void,
) => () => void

type RemoteWorkspaceBackendOptions = {
  workspaceId: string
  rootPath: string
  requestRemote: RequestRemote
  subscribeAgentEvents: SubscribeAgentEvents
  sendWatchEvent: (event: WorkspaceWatchEventPayload) => void
  sendWatchFallback: (event: WorkspaceWatchFallbackEventPayload) => void
}

export function createRemoteWorkspaceBackend(
  options: RemoteWorkspaceBackendOptions,
): WorkspaceBackend {
  return new RemoteWorkspaceBackend(options)
}

const REMOTE_WORKSPACE_METHODS = {
  index: 'workspace.index',
  indexDirectory: 'workspace.indexDirectory',
  searchFiles: 'workspace.searchFiles',
  readFile: 'workspace.readFile',
  writeFile: 'workspace.writeFile',
  createFile: 'workspace.createFile',
  createDirectory: 'workspace.createDirectory',
  deleteFile: 'workspace.deleteFile',
  deleteDirectory: 'workspace.deleteDirectory',
  rename: 'workspace.rename',
  readComments: 'workspace.readComments',
  writeComments: 'workspace.writeComments',
  readGlobalComments: 'workspace.readGlobalComments',
  writeGlobalComments: 'workspace.writeGlobalComments',
  exportCommentsBundle: 'workspace.exportCommentsBundle',
  copyEntries: 'workspace.copyEntries',
} as const

class RemoteWorkspaceBackend implements WorkspaceBackend {
  readonly kind = 'remote' as const

  private readonly workspaceId: string
  private readonly rootPath: string
  private readonly requestRemote: RequestRemote
  private readonly watchBridge: RemoteWatchBridge
  private readonly gitBridge: RemoteGitBridge

  constructor(options: RemoteWorkspaceBackendOptions) {
    this.workspaceId = options.workspaceId
    this.rootPath = options.rootPath
    this.requestRemote = options.requestRemote
    const guardedRemoteRequest: RequestRemote = (
      _workspaceId,
      method,
      params,
    ) => this.requestWorkspaceMethod(method, params)
    this.watchBridge = new RemoteWatchBridge({
      workspaceId: options.workspaceId,
      requestRemote: guardedRemoteRequest,
      subscribeAgentEvents: options.subscribeAgentEvents,
      sendWatchEvent: options.sendWatchEvent,
      sendWatchFallback: options.sendWatchFallback,
    })
    this.gitBridge = new RemoteGitBridge({
      workspaceId: options.workspaceId,
      requestRemote: guardedRemoteRequest,
    })
  }

  index(request: WorkspaceIndexRequest): Promise<WorkspaceBackendResult<'index'>> {
    return this.forwardRootWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.index,
    )
  }

  indexDirectory(
    request: WorkspaceIndexDirectoryRequest,
  ): Promise<WorkspaceBackendResult<'indexDirectory'>> {
    return this.forwardDirectoryWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.indexDirectory,
      {
      relativePath: request.relativePath,
      offset: request.offset,
      limit: request.limit,
    },
    )
  }

  searchFiles(
    request: WorkspaceSearchFilesRequest,
  ): Promise<WorkspaceBackendResult<'searchFiles'>> {
    return this.forwardRootWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.searchFiles,
      {
      query: request.query,
      maxDepth: request.maxDepth,
      maxResults: request.maxResults,
      maxDirectoryChildren: request.maxDirectoryChildren,
      timeBudgetMs: request.timeBudgetMs,
    },
    )
  }

  readFile(
    request: WorkspaceReadFileRequest,
  ): Promise<WorkspaceBackendResult<'readFile'>> {
    return this.forwardRelativePathWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.readFile,
    )
  }

  writeFile(
    request: WorkspaceWriteFileRequest,
  ): Promise<WorkspaceBackendResult<'writeFile'>> {
    return this.forwardRelativePathWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.writeFile,
      {
      relativePath: request.relativePath,
      content: request.content,
    },
    )
  }

  createFile(
    request: WorkspaceCreateFileRequest,
  ): Promise<WorkspaceBackendResult<'createFile'>> {
    return this.forwardRelativePathWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.createFile,
    )
  }

  createDirectory(
    request: WorkspaceCreateDirectoryRequest,
  ): Promise<WorkspaceBackendResult<'createDirectory'>> {
    return this.forwardRelativePathWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.createDirectory,
    )
  }

  deleteFile(
    request: WorkspaceDeleteFileRequest,
  ): Promise<WorkspaceBackendResult<'deleteFile'>> {
    return this.forwardRelativePathWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.deleteFile,
    )
  }

  deleteDirectory(
    request: WorkspaceDeleteDirectoryRequest,
  ): Promise<WorkspaceBackendResult<'deleteDirectory'>> {
    return this.forwardRelativePathWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.deleteDirectory,
    )
  }

  rename(request: WorkspaceRenameRequest): Promise<WorkspaceBackendResult<'rename'>> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.oldRelativePath)
    this.assertRelativePathInWorkspace(request.newRelativePath)
    return this.requestWorkspaceMethod(REMOTE_WORKSPACE_METHODS.rename, {
      oldRelativePath: request.oldRelativePath,
      newRelativePath: request.newRelativePath,
    })
  }

  getGitLineMarkers(
    request: WorkspaceGetGitLineMarkersRequest,
  ): Promise<WorkspaceBackendResult<'getGitLineMarkers'>> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.relativePath)
    return this.gitBridge.getGitLineMarkers(request)
  }

  getGitFileStatuses(
    request: WorkspaceGetGitFileStatusesRequest,
  ): Promise<WorkspaceBackendResult<'getGitFileStatuses'>> {
    this.assertRootPath(request.rootPath)
    return this.gitBridge.getGitFileStatuses(request)
  }

  readComments(
    request: WorkspaceReadCommentsRequest,
  ): Promise<WorkspaceBackendResult<'readComments'>> {
    return this.forwardRootWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.readComments,
    )
  }

  writeComments(
    request: WorkspaceWriteCommentsRequest,
  ): Promise<WorkspaceBackendResult<'writeComments'>> {
    return this.forwardRootWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.writeComments,
      {
      comments: request.comments,
    },
    )
  }

  readGlobalComments(
    request: WorkspaceReadGlobalCommentsRequest,
  ): Promise<WorkspaceBackendResult<'readGlobalComments'>> {
    return this.forwardRootWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.readGlobalComments,
    )
  }

  writeGlobalComments(
    request: WorkspaceWriteGlobalCommentsRequest,
  ): Promise<WorkspaceBackendResult<'writeGlobalComments'>> {
    return this.forwardRootWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.writeGlobalComments,
      {
      body: request.body,
    },
    )
  }

  async copyEntries(request: {
    rootPath: string
    entries: { relativePath: string; kind: 'file' | 'directory' }[]
    destDir: string
  }): Promise<WorkspaceBackendResult<'copyEntries'>> {
    this.assertRootPath(request.rootPath)
    for (const entry of request.entries) {
      this.assertRelativePathInWorkspace(entry.relativePath)
    }
    return this.requestWorkspaceMethod(REMOTE_WORKSPACE_METHODS.copyEntries, {
      entries: request.entries,
      destDir: request.destDir,
    })
  }

  exportCommentsBundle(
    request: WorkspaceExportCommentsBundleRequest,
  ): Promise<WorkspaceBackendResult<'exportCommentsBundle'>> {
    return this.forwardRootWorkspaceMethod(
      request,
      REMOTE_WORKSPACE_METHODS.exportCommentsBundle,
      {
      commentsMarkdown: request.commentsMarkdown,
      bundleMarkdown: request.bundleMarkdown,
      writeCommentsFile: request.writeCommentsFile,
      writeBundleFile: request.writeBundleFile,
    },
    )
  }

  watchStart(
    request: WorkspaceWatchStartRequest,
  ): Promise<WorkspaceBackendResult<'watchStart'>> {
    this.assertRootPath(request.rootPath)
    return this.watchBridge.start(request.watchModePreference)
  }

  async watchStop(
    request: WorkspaceWatchStopRequest,
  ): Promise<WorkspaceBackendResult<'watchStop'>> {
    void request
    await this.stopWatchBridgeSafely()
    return {
      ok: true,
    }
  }

  async dispose(): Promise<void> {
    await this.stopWatchBridgeSafely()
  }

  private assertRootPath(rootPath: string): void {
    if (rootPath === this.rootPath) {
      return
    }

    throw new RemoteAgentError(
      'PATH_DENIED',
      'Remote workspace root mismatch.',
    )
  }

  private assertRelativePathInWorkspace(relativePath: string): void {
    const normalized = normalizeRemoteRelativePath(relativePath)
    if (!normalized) {
      throw new RemoteAgentError('PATH_DENIED', 'relativePath is required.')
    }

    if (normalized.startsWith('../') || normalized === '..') {
      throw new RemoteAgentError(
        'PATH_DENIED',
        'Relative path escaped remote workspace root.',
      )
    }
  }

  private forwardRootWorkspaceMethod<TResult>(
    request: { rootPath: string },
    method: string,
    params?: unknown,
  ): Promise<TResult> {
    this.assertRootPath(request.rootPath)
    return this.requestWorkspaceMethod(method, params)
  }

  private forwardDirectoryWorkspaceMethod<TResult>(
    request: WorkspaceIndexDirectoryRequest,
    method: string,
    params?: unknown,
  ): Promise<TResult> {
    this.assertRootPath(request.rootPath)
    if (request.relativePath.trim().length > 0) {
      this.assertRelativePathInWorkspace(request.relativePath)
    }
    return this.requestWorkspaceMethod(method, params)
  }

  private forwardRelativePathWorkspaceMethod<TResult>(
    request: { rootPath: string; relativePath: string },
    method: string,
    params?: unknown,
  ): Promise<TResult> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.relativePath)
    return this.requestWorkspaceMethod(method, params ?? {
      relativePath: request.relativePath,
    })
  }

  private async requestWorkspaceMethod<TResult>(
    method: string,
    params?: unknown,
  ): Promise<TResult> {
    assertRemoteWorkspaceMethodAllowed(method)

    try {
      if (params === undefined) {
        return await this.requestRemote(this.workspaceId, method) as TResult
      }
      return await this.requestRemote(this.workspaceId, method, params) as TResult
    } catch (error) {
      throw this.wrapRemoteRequestError(method, error)
    }
  }

  private async stopWatchBridgeSafely(): Promise<void> {
    try {
      await this.watchBridge.stop()
    } catch (error) {
      const normalized = toRemoteAgentError(error)
      if (normalized.code !== 'CONNECTION_CLOSED') {
        throw this.wrapRemoteRequestError(
          REMOTE_WORKSPACE_METHODS.watchStop,
          error,
        )
      }
    }
  }

  private wrapRemoteRequestError(
    method: string,
    error: unknown,
  ): RemoteWorkspaceRequestError {
    const normalized = toRemoteAgentError(error)
    return Object.assign(
      new RemoteAgentError(
        normalized.code,
        redactRemoteErrorMessage(normalized.message),
        normalized.cause ?? error,
      ),
      {
        requestMethod: method,
        workspaceId: this.workspaceId,
      },
    )
  }
}

function normalizeRemoteRelativePath(relativePath: string): string {
  const withForwardSlash = relativePath.split(path.sep).join('/')
  const normalized = path.posix.normalize(withForwardSlash)

  if (path.posix.isAbsolute(normalized)) {
    return ''
  }

  if (normalized === '.') {
    return ''
  }

  return normalized
}
