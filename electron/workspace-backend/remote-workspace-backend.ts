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
  WorkspaceCreateDirectoryRequest,
  WorkspaceCreateFileRequest,
  WorkspaceDeleteDirectoryRequest,
  WorkspaceDeleteFileRequest,
  WorkspaceExportCommentsBundleRequest,
  WorkspaceGetGitFileStatusesRequest,
  WorkspaceGetGitLineMarkersRequest,
  WorkspaceIndexDirectoryRequest,
  WorkspaceIndexRequest,
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

  index(request: WorkspaceIndexRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    return this.requestWorkspaceMethod('workspace.index')
  }

  indexDirectory(request: WorkspaceIndexDirectoryRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    if (request.relativePath.trim().length > 0) {
      this.assertRelativePathInWorkspace(request.relativePath)
    }
    return this.requestWorkspaceMethod('workspace.indexDirectory', {
      relativePath: request.relativePath,
      offset: request.offset,
      limit: request.limit,
    })
  }

  readFile(request: WorkspaceReadFileRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.relativePath)
    return this.requestWorkspaceMethod('workspace.readFile', {
      relativePath: request.relativePath,
    })
  }

  writeFile(request: WorkspaceWriteFileRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.relativePath)
    return this.requestWorkspaceMethod('workspace.writeFile', {
      relativePath: request.relativePath,
      content: request.content,
    })
  }

  createFile(request: WorkspaceCreateFileRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.relativePath)
    return this.requestWorkspaceMethod('workspace.createFile', {
      relativePath: request.relativePath,
    })
  }

  createDirectory(request: WorkspaceCreateDirectoryRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.relativePath)
    return this.requestWorkspaceMethod('workspace.createDirectory', {
      relativePath: request.relativePath,
    })
  }

  deleteFile(request: WorkspaceDeleteFileRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.relativePath)
    return this.requestWorkspaceMethod('workspace.deleteFile', {
      relativePath: request.relativePath,
    })
  }

  deleteDirectory(request: WorkspaceDeleteDirectoryRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.relativePath)
    return this.requestWorkspaceMethod('workspace.deleteDirectory', {
      relativePath: request.relativePath,
    })
  }

  rename(request: WorkspaceRenameRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.oldRelativePath)
    this.assertRelativePathInWorkspace(request.newRelativePath)
    return this.requestWorkspaceMethod('workspace.rename', {
      oldRelativePath: request.oldRelativePath,
      newRelativePath: request.newRelativePath,
    })
  }

  getGitLineMarkers(request: WorkspaceGetGitLineMarkersRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    this.assertRelativePathInWorkspace(request.relativePath)
    return this.gitBridge.getGitLineMarkers(request)
  }

  getGitFileStatuses(request: WorkspaceGetGitFileStatusesRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    return this.gitBridge.getGitFileStatuses(request)
  }

  readComments(request: WorkspaceReadCommentsRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    return this.requestWorkspaceMethod('workspace.readComments')
  }

  writeComments(request: WorkspaceWriteCommentsRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    return this.requestWorkspaceMethod('workspace.writeComments', {
      comments: request.comments,
    })
  }

  readGlobalComments(request: WorkspaceReadGlobalCommentsRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    return this.requestWorkspaceMethod('workspace.readGlobalComments')
  }

  writeGlobalComments(
    request: WorkspaceWriteGlobalCommentsRequest,
  ): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    return this.requestWorkspaceMethod('workspace.writeGlobalComments', {
      body: request.body,
    })
  }

  exportCommentsBundle(
    request: WorkspaceExportCommentsBundleRequest,
  ): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    return this.requestWorkspaceMethod('workspace.exportCommentsBundle', {
      commentsMarkdown: request.commentsMarkdown,
      bundleMarkdown: request.bundleMarkdown,
      writeCommentsFile: request.writeCommentsFile,
      writeBundleFile: request.writeBundleFile,
    })
  }

  watchStart(request: WorkspaceWatchStartRequest): Promise<unknown> {
    this.assertRootPath(request.rootPath)
    return this.watchBridge.start(request.watchModePreference)
  }

  async watchStop(_request: WorkspaceWatchStopRequest): Promise<unknown> {
    try {
      await this.watchBridge.stop()
    } catch (error) {
      const normalized = toRemoteAgentError(error)
      if (normalized.code !== 'CONNECTION_CLOSED') {
        throw new RemoteAgentError(
          normalized.code,
          redactRemoteErrorMessage(normalized.message),
          normalized.cause,
        )
      }
    }
    return {
      ok: true,
    }
  }

  async dispose(): Promise<void> {
    try {
      await this.watchBridge.stop()
    } catch (error) {
      const normalized = toRemoteAgentError(error)
      if (normalized.code !== 'CONNECTION_CLOSED') {
        throw new RemoteAgentError(
          normalized.code,
          redactRemoteErrorMessage(normalized.message),
          normalized.cause,
        )
      }
    }
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

  private async requestWorkspaceMethod(
    method: string,
    params?: unknown,
  ): Promise<unknown> {
    assertRemoteWorkspaceMethodAllowed(method)

    try {
      return await this.requestRemote(this.workspaceId, method, params)
    } catch (error) {
      const normalized = toRemoteAgentError(error)
      throw new RemoteAgentError(
        normalized.code,
        redactRemoteErrorMessage(normalized.message),
        normalized.cause,
      )
    }
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
