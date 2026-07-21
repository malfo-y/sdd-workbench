import type { RemoteAgentErrorCode } from '../protocol'

export type RuntimeRequestMessage = {
  type: 'request'
  id: string
  method: string
  params?: unknown
  protocolVersion: string
}

export type RuntimeSuccessResponseMessage = {
  type: 'response'
  id: string
  ok: true
  result: unknown
  protocolVersion: string
}

export type RuntimeFailureResponseMessage = {
  type: 'response'
  id: string
  ok: false
  error: {
    code: RemoteAgentErrorCode
    message: string
  }
  protocolVersion: string
}

export type RuntimeResponseMessage =
  | RuntimeSuccessResponseMessage
  | RuntimeFailureResponseMessage

export type RuntimeEventMessage = {
  type: 'event'
  event: string
  payload?: unknown
  protocolVersion: string
}

export type RuntimeWorkspaceFileNode =
  | {
      name: string
      relativePath: string
      kind: 'file'
    }
  | {
      name: string
      relativePath: string
      kind: 'directory'
      children: RuntimeWorkspaceFileNode[]
      childrenStatus?: 'not-loaded' | 'complete' | 'partial'
      totalChildCount?: number
    }

export type RuntimeWorkspaceSearchFileMatch = {
  relativePath: string
  fileName: string
  parentRelativePath: string
}

export type RuntimeWorkspaceSearchFilesResult = {
  ok: true
  results: RuntimeWorkspaceSearchFileMatch[]
  truncated: boolean
  skippedLargeDirectoryCount: number
  skippedUnreadablePathCount: number
  depthLimitHit: boolean
  timedOut: boolean
}

export type RuntimeWorkspaceSearchTextMatch = {
  relativePath: string
  lineNumber: number
  snippet: string
}

export type RuntimeWorkspaceSearchTextResult = {
  ok: true
  results: RuntimeWorkspaceSearchTextMatch[]
  truncated: boolean
  skippedLargeDirectoryCount: number
  skippedLargeFileCount: number
  skippedBinaryFileCount: number
  skippedUnreadablePathCount: number
  depthLimitHit: boolean
  timedOut: boolean
}

export type RuntimeWatchMode = 'native' | 'polling'

export type RuntimeWatchEventPayload = {
  changedRelativePaths: string[]
  hasStructureChanges: boolean
}

export type RuntimeWatchFallbackPayload = {
  watchMode: RuntimeWatchMode
}
