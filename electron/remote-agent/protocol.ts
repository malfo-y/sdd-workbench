export const REMOTE_AGENT_PROTOCOL_VERSION = '1.0.0'

export const REMOTE_AGENT_ERROR_CODES = [
  'AUTH_FAILED',
  'TIMEOUT',
  'AGENT_PROTOCOL_MISMATCH',
  'PATH_DENIED',
  'CONNECTION_CLOSED',
  'INVALID_RESPONSE',
  'BOOTSTRAP_FAILED',
  'UNKNOWN',
] as const

export type RemoteAgentErrorCode = (typeof REMOTE_AGENT_ERROR_CODES)[number]

export type RemoteAgentRequest = {
  type: 'request'
  id: string
  method: string
  params?: unknown
  protocolVersion: string
}

export type RemoteAgentSuccessResponse = {
  type: 'response'
  id: string
  ok: true
  result: unknown
  protocolVersion: string
}

export type RemoteAgentFailureResponse = {
  type: 'response'
  id: string
  ok: false
  error: {
    code: RemoteAgentErrorCode
    message: string
  }
  protocolVersion: string
}

export type RemoteAgentResponse =
  | RemoteAgentSuccessResponse
  | RemoteAgentFailureResponse

export type RemoteAgentEvent = {
  type: 'event'
  event: string
  payload?: unknown
  protocolVersion: string
}

export type RemoteAgentMessage =
  | RemoteAgentRequest
  | RemoteAgentResponse
  | RemoteAgentEvent

export class RemoteAgentError extends Error {
  readonly code: RemoteAgentErrorCode
  readonly cause: unknown | undefined

  constructor(code: RemoteAgentErrorCode, message: string, cause?: unknown) {
    super(message)
    this.code = code
    this.cause = cause
    this.name = 'RemoteAgentError'
  }
}

export function isRemoteAgentError(value: unknown): value is RemoteAgentError {
  return value instanceof RemoteAgentError
}

export function isSupportedProtocolVersion(version: string): boolean {
  return version === REMOTE_AGENT_PROTOCOL_VERSION
}

export function ensureSupportedProtocolVersion(version: string): void {
  if (isSupportedProtocolVersion(version)) {
    return
  }

  throw new RemoteAgentError(
    'AGENT_PROTOCOL_MISMATCH',
    `Unsupported remote agent protocol version: ${version}. Expected ${REMOTE_AGENT_PROTOCOL_VERSION}.`,
  )
}

export function toRemoteAgentError(
  error: unknown,
  fallbackCode: RemoteAgentErrorCode = 'UNKNOWN',
): RemoteAgentError {
  if (isRemoteAgentError(error)) {
    return error
  }

  if (error instanceof Error) {
    const lowered = error.message.toLowerCase()
    if (lowered.includes('permission denied') || lowered.includes('auth')) {
      return new RemoteAgentError('AUTH_FAILED', error.message, error)
    }
    if (lowered.includes('timeout') || lowered.includes('timed out')) {
      return new RemoteAgentError('TIMEOUT', error.message, error)
    }
    return new RemoteAgentError(fallbackCode, error.message, error)
  }

  return new RemoteAgentError(fallbackCode, 'Unknown remote agent error.')
}

export function isRemoteAgentResponse(message: unknown): message is RemoteAgentResponse {
  if (!message || typeof message !== 'object') {
    return false
  }

  const candidate = message as Partial<RemoteAgentResponse>
  return candidate.type === 'response' && typeof candidate.id === 'string'
}

export function isRemoteAgentEvent(message: unknown): message is RemoteAgentEvent {
  if (!message || typeof message !== 'object') {
    return false
  }

  const candidate = message as Partial<RemoteAgentEvent>
  return candidate.type === 'event' && typeof candidate.event === 'string'
}
