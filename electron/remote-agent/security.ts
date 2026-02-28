import { RemoteAgentError } from './protocol'

const REMOTE_WORKSPACE_METHOD_ALLOWLIST = [
  'workspace.index',
  'workspace.indexDirectory',
  'workspace.readFile',
  'workspace.writeFile',
  'workspace.createFile',
  'workspace.createDirectory',
  'workspace.deleteFile',
  'workspace.deleteDirectory',
  'workspace.rename',
  'workspace.getGitLineMarkers',
  'workspace.getGitFileStatuses',
  'workspace.readComments',
  'workspace.writeComments',
  'workspace.readGlobalComments',
  'workspace.writeGlobalComments',
  'workspace.exportCommentsBundle',
  'workspace.watchStart',
  'workspace.watchStop',
] as const

const REMOTE_WORKSPACE_METHOD_ALLOWLIST_SET = new Set<string>(
  REMOTE_WORKSPACE_METHOD_ALLOWLIST,
)

const ABSOLUTE_PATH_PATTERN =
  /(?:[A-Za-z]:\\|\/)(?:[^\\/\s'":]+[\\/])*[^\\/\s'":]*/g
const HOME_SSH_PATH_PATTERN = /~\/\.ssh\/[^\s'":;,)]+/g
const KEY_VALUE_SECRET_PATTERN =
  /\b(password|passphrase|token|secret)\s*[:=]\s*([^\s,;]+)/gi
const SSH_STDERR_PATTERN = /\bssh(?:\s+\w+)*\s+stderr\s*:\s*/gi
const WHITESPACE_PATTERN = /\s+/g
const MAX_REDATED_MESSAGE_LENGTH = 240

export function getAllowedRemoteWorkspaceMethods(): readonly string[] {
  return REMOTE_WORKSPACE_METHOD_ALLOWLIST
}

export function assertRemoteWorkspaceMethodAllowed(method: string): void {
  const normalizedMethod = method.trim()
  if (REMOTE_WORKSPACE_METHOD_ALLOWLIST_SET.has(normalizedMethod)) {
    return
  }

  throw new RemoteAgentError(
    'PATH_DENIED',
    `Remote RPC method is not allowed: ${normalizedMethod || '<empty>'}.`,
  )
}

export function redactRemoteErrorMessage(
  message: string | undefined,
  fallbackMessage = 'Remote operation failed.',
): string {
  if (!message || message.trim().length === 0) {
    return fallbackMessage
  }

  let sanitized = message
    .replace(SSH_STDERR_PATTERN, '')
    .replace(KEY_VALUE_SECRET_PATTERN, (_input, key) => `${key}=[REDACTED]`)
    .replace(HOME_SSH_PATH_PATTERN, '[REDACTED_PATH]')
    .replace(ABSOLUTE_PATH_PATTERN, '[REDACTED_PATH]')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim()

  if (!sanitized) {
    return fallbackMessage
  }

  if (sanitized.length > MAX_REDATED_MESSAGE_LENGTH) {
    sanitized = `${sanitized.slice(0, MAX_REDATED_MESSAGE_LENGTH).trimEnd()}...`
  }

  return sanitized
}
