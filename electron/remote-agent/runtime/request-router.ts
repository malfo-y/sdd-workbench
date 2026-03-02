import {
  REMOTE_AGENT_PROTOCOL_VERSION,
  RemoteAgentError,
  type RemoteAgentErrorCode,
} from '../protocol'
import {
  workspaceCreateDirectory,
  workspaceCreateFile,
  workspaceDeleteDirectory,
  workspaceDeleteFile,
  workspaceExportCommentsBundle,
  workspaceGetGitFileStatuses,
  workspaceGetGitLineMarkers,
  workspaceIndex,
  workspaceIndexDirectory,
  workspaceReadComments,
  workspaceReadFile,
  workspaceReadGlobalComments,
  workspaceRename,
  workspaceWriteComments,
  workspaceWriteFile,
  workspaceWriteGlobalComments,
} from './workspace-ops'
import { RuntimeWatchService } from './watch-ops'
import type {
  RuntimeEventMessage,
  RuntimeFailureResponseMessage,
  RuntimeRequestMessage,
  RuntimeResponseMessage,
  RuntimeSuccessResponseMessage,
} from './runtime-types'

type EmitResponse = (response: RuntimeResponseMessage) => void

type EmitEvent = (event: RuntimeEventMessage) => void

type RuntimeRequestRouterOptions = {
  rootPath: string
  emitResponse: EmitResponse
  emitEvent: EmitEvent
}

const METHOD_NOT_FOUND_CODE: RemoteAgentErrorCode = 'PATH_DENIED'

export class RuntimeRequestRouter {
  private readonly rootPath: string
  private readonly emitResponse: EmitResponse
  private readonly emitEvent: EmitEvent
  private readonly watchService: RuntimeWatchService

  constructor(options: RuntimeRequestRouterOptions) {
    this.rootPath = options.rootPath
    this.emitResponse = options.emitResponse
    this.emitEvent = options.emitEvent
    this.watchService = new RuntimeWatchService(
      this.rootPath,
      (eventName, payload) => {
        this.emitEvent({
          type: 'event',
          event: eventName,
          payload,
          protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
        })

        if (eventName === 'workspace.watchEvent') {
          this.emitEvent({
            type: 'event',
            event: 'watch.event',
            payload,
            protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
          })
          return
        }

        if (eventName === 'workspace.watchFallback') {
          this.emitEvent({
            type: 'event',
            event: 'watch.fallback',
            payload,
            protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
          })
        }
      },
    )
  }

  async dispose(): Promise<void> {
    await this.watchService.dispose()
  }

  async handleMessage(rawMessage: unknown): Promise<void> {
    if (!isRuntimeRequestMessage(rawMessage)) {
      return
    }

    const request = rawMessage
    if (request.protocolVersion !== REMOTE_AGENT_PROTOCOL_VERSION) {
      this.emitResponse(
        this.buildErrorResponse(
          request.id,
          'AGENT_PROTOCOL_MISMATCH',
          `Unsupported protocol version: ${request.protocolVersion}`,
        ),
      )
      return
    }

    try {
      const result = await this.dispatchMethod(request.method, request.params)
      this.emitResponse(this.buildSuccessResponse(request.id, result))
    } catch (error) {
      const normalizedError = normalizeRequestError(error)
      this.emitResponse(
        this.buildErrorResponse(
          request.id,
          normalizedError.code,
          normalizedError.message,
        ),
      )
    }
  }

  private async dispatchMethod(
    method: string,
    params: unknown,
  ): Promise<unknown> {
    const methodParams = isRecord(params) ? params : {}

    switch (method) {
      case 'agent.healthcheck':
        return { ok: true }
      case 'workspace.index':
        return workspaceIndex({ rootPath: this.rootPath })
      case 'workspace.indexDirectory':
        return workspaceIndexDirectory({ rootPath: this.rootPath }, methodParams)
      case 'workspace.readFile':
        return workspaceReadFile({ rootPath: this.rootPath }, methodParams)
      case 'workspace.writeFile':
        return workspaceWriteFile({ rootPath: this.rootPath }, methodParams)
      case 'workspace.createFile':
        return workspaceCreateFile({ rootPath: this.rootPath }, methodParams)
      case 'workspace.createDirectory':
        return workspaceCreateDirectory({ rootPath: this.rootPath }, methodParams)
      case 'workspace.deleteFile':
        return workspaceDeleteFile({ rootPath: this.rootPath }, methodParams)
      case 'workspace.deleteDirectory':
        return workspaceDeleteDirectory({ rootPath: this.rootPath }, methodParams)
      case 'workspace.rename':
        return workspaceRename({ rootPath: this.rootPath }, methodParams)
      case 'workspace.getGitLineMarkers':
        return workspaceGetGitLineMarkers({ rootPath: this.rootPath }, methodParams)
      case 'workspace.getGitFileStatuses':
        return workspaceGetGitFileStatuses({ rootPath: this.rootPath })
      case 'workspace.readComments':
        return workspaceReadComments({ rootPath: this.rootPath })
      case 'workspace.writeComments':
        return workspaceWriteComments({ rootPath: this.rootPath }, methodParams)
      case 'workspace.readGlobalComments':
        return workspaceReadGlobalComments({ rootPath: this.rootPath })
      case 'workspace.writeGlobalComments':
        return workspaceWriteGlobalComments({ rootPath: this.rootPath }, methodParams)
      case 'workspace.exportCommentsBundle':
        return workspaceExportCommentsBundle({ rootPath: this.rootPath }, methodParams)
      case 'workspace.watchStart':
        return this.watchService.start(
          typeof methodParams.watchModePreference === 'string'
            ? methodParams.watchModePreference
            : undefined,
        )
      case 'workspace.watchStop':
        return this.watchService.stop()
      default:
        throw new RemoteAgentError(
          METHOD_NOT_FOUND_CODE,
          `Remote RPC method is not allowed: ${method || '<empty>'}.`,
        )
    }
  }

  private buildSuccessResponse(
    requestId: string,
    result: unknown,
  ): RuntimeSuccessResponseMessage {
    return {
      type: 'response',
      id: requestId,
      ok: true,
      result,
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
    }
  }

  private buildErrorResponse(
    requestId: string,
    code: RemoteAgentErrorCode,
    message: string,
  ): RuntimeFailureResponseMessage {
    return {
      type: 'response',
      id: requestId,
      ok: false,
      error: {
        code,
        message,
      },
      protocolVersion: REMOTE_AGENT_PROTOCOL_VERSION,
    }
  }
}

function normalizeRequestError(error: unknown): {
  code: RemoteAgentErrorCode
  message: string
} {
  if (error instanceof RemoteAgentError) {
    return {
      code: error.code,
      message: error.message,
    }
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN',
      message: error.message,
    }
  }

  return {
    code: 'UNKNOWN',
    message: 'Unknown remote runtime error.',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRuntimeRequestMessage(
  value: unknown,
): value is RuntimeRequestMessage {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.type === 'request' &&
    typeof value.id === 'string' &&
    typeof value.method === 'string' &&
    typeof value.protocolVersion === 'string'
  )
}
