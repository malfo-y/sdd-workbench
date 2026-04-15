import type {
  WorkspaceKind,
  WorkspaceRemoteConnectionState,
  WorkspaceRemoteProfile,
  WorkspaceState,
  WorkspaceWatchModePreference,
} from './workspace-model'

export const WORKSPACE_SESSION_STORAGE_KEY = 'sdd-workbench:workspace-session:v1'
export const WORKSPACE_SESSION_SCHEMA_VERSION = 2
export const MAX_PERSISTED_FILE_LAST_LINE_ENTRIES = 200
export const WORKSPACE_SPEC_SCROLL_STORAGE_KEY = 'sdd-workbench:spec-scroll:v1'
export const MAX_PERSISTED_SPEC_SCROLL_ENTRIES = 200

export type PersistedWorkspaceSession = {
  rootPath: string
  workspaceKind: WorkspaceKind
  remoteWorkspaceId: string | null
  remoteProfile: WorkspaceRemoteProfile | null
  remoteConnectionState: WorkspaceRemoteConnectionState | null
  remoteErrorCode: string | null
  activeFile: string | null
  activeSpec: string | null
  expandedDirectories: string[]
  fileLastLineByPath: Record<string, number>
  watchModePreference: WorkspaceWatchModePreference
}

export type WorkspaceSessionSnapshot = {
  schemaVersion: number
  activeWorkspaceId: string | null
  workspaceOrder: string[]
  workspacesById: Record<string, PersistedWorkspaceSession>
}

export type WorkspaceSessionSnapshotLoadResult = {
  snapshot: WorkspaceSessionSnapshot | null
  error: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function normalizeUniqueStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const nextValues: string[] = []
  for (const item of value) {
    if (!isNonEmptyString(item)) {
      continue
    }
    if (nextValues.includes(item)) {
      continue
    }
    nextValues.push(item)
  }
  return nextValues
}

function normalizeFileLastLineByPath(
  value: unknown,
): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }

  const nextEntries: Array<[string, number]> = []
  for (const [relativePath, rawLineNumber] of Object.entries(value)) {
    if (!isNonEmptyString(relativePath)) {
      continue
    }
    if (
      typeof rawLineNumber !== 'number' ||
      !Number.isInteger(rawLineNumber) ||
      rawLineNumber < 1
    ) {
      continue
    }
    nextEntries.push([relativePath, rawLineNumber])
  }

  const limitedEntries =
    nextEntries.length > MAX_PERSISTED_FILE_LAST_LINE_ENTRIES
      ? nextEntries.slice(nextEntries.length - MAX_PERSISTED_FILE_LAST_LINE_ENTRIES)
      : nextEntries

  return Object.fromEntries(limitedEntries)
}

function normalizeWatchModePreference(
  value: unknown,
): WorkspaceWatchModePreference {
  if (value === 'native' || value === 'polling' || value === 'auto') {
    return value
  }
  return 'auto'
}

function normalizeWorkspaceKind(value: unknown): WorkspaceKind {
  if (value === 'remote') {
    return 'remote'
  }
  return 'local'
}

function normalizeRemoteConnectionState(
  value: unknown,
): WorkspaceRemoteConnectionState | null {
  if (
    value === 'connecting' ||
    value === 'connected' ||
    value === 'degraded' ||
    value === 'disconnected'
  ) {
    return value
  }
  return null
}

function normalizeOptionalPositiveInteger(value: unknown): number | undefined {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return value
  }
  return undefined
}

function normalizeRemoteProfile(value: unknown): WorkspaceRemoteProfile | null {
  if (!isRecord(value)) {
    return null
  }

  const workspaceId = isNonEmptyString(value.workspaceId)
    ? value.workspaceId
    : null
  const host = isNonEmptyString(value.host) ? value.host : null
  const remoteRoot = isNonEmptyString(value.remoteRoot) ? value.remoteRoot : null
  if (!workspaceId || !host || !remoteRoot) {
    return null
  }

  const user = isNonEmptyString(value.user) ? value.user : undefined
  const agentPath = isNonEmptyString(value.agentPath) ? value.agentPath : undefined
  const identityFile = isNonEmptyString(value.identityFile)
    ? value.identityFile
    : undefined
  const sshAlias = isNonEmptyString(value.sshAlias) ? value.sshAlias : undefined

  return {
    workspaceId,
    host,
    remoteRoot,
    ...(user ? { user } : {}),
    ...(normalizeOptionalPositiveInteger(value.port)
      ? { port: normalizeOptionalPositiveInteger(value.port) }
      : {}),
    ...(agentPath ? { agentPath } : {}),
    ...(identityFile ? { identityFile } : {}),
    ...(sshAlias ? { sshAlias } : {}),
    ...(normalizeOptionalPositiveInteger(value.requestTimeoutMs)
      ? { requestTimeoutMs: normalizeOptionalPositiveInteger(value.requestTimeoutMs) }
      : {}),
    ...(normalizeOptionalPositiveInteger(value.connectTimeoutMs)
      ? { connectTimeoutMs: normalizeOptionalPositiveInteger(value.connectTimeoutMs) }
      : {}),
  }
}

function normalizeWorkspaceSession(
  value: unknown,
): PersistedWorkspaceSession | null {
  if (!isRecord(value)) {
    return null
  }

  const { rootPath, activeFile, expandedDirectories, fileLastLineByPath } = value
  if (!isNonEmptyString(rootPath)) {
    return null
  }

  const workspaceKind = normalizeWorkspaceKind(value.workspaceKind)
  const remoteProfile = normalizeRemoteProfile(value.remoteProfile)
  const remoteWorkspaceId = isNonEmptyString(value.remoteWorkspaceId)
    ? value.remoteWorkspaceId
    : remoteProfile?.workspaceId ?? null
  const remoteConnectionState =
    workspaceKind === 'remote'
      ? normalizeRemoteConnectionState(value.remoteConnectionState) ?? 'disconnected'
      : null
  const remoteErrorCode =
    workspaceKind === 'remote' && isNonEmptyString(value.remoteErrorCode)
      ? value.remoteErrorCode
      : null

  return {
    rootPath,
    workspaceKind,
    remoteWorkspaceId: workspaceKind === 'remote' ? remoteWorkspaceId : null,
    remoteProfile: workspaceKind === 'remote' ? remoteProfile : null,
    remoteConnectionState,
    remoteErrorCode,
    activeFile: isNonEmptyString(activeFile) ? activeFile : null,
    activeSpec: isNonEmptyString(value.activeSpec) ? value.activeSpec : null,
    expandedDirectories: normalizeUniqueStringArray(expandedDirectories),
    fileLastLineByPath: normalizeFileLastLineByPath(fileLastLineByPath),
    watchModePreference: normalizeWatchModePreference(
      value.watchModePreference,
    ),
  }
}

function normalizePersistedSpecScrollPositions(
  value: unknown,
): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }

  const normalizedEntries: Array<[string, number]> = []
  for (const [storageKey, rawScrollTop] of Object.entries(value)) {
    if (
      !isNonEmptyString(storageKey) ||
      typeof rawScrollTop !== 'number' ||
      !Number.isFinite(rawScrollTop) ||
      rawScrollTop < 0
    ) {
      continue
    }

    normalizedEntries.push([storageKey, Math.trunc(rawScrollTop)])
  }

  const limitedEntries =
    normalizedEntries.length > MAX_PERSISTED_SPEC_SCROLL_ENTRIES
      ? normalizedEntries.slice(
          normalizedEntries.length - MAX_PERSISTED_SPEC_SCROLL_ENTRIES,
        )
      : normalizedEntries

  return Object.fromEntries(limitedEntries)
}

function readStorageValue(storage: Storage, key: string): string | null {
  if (typeof storage.getItem === 'function') {
    return storage.getItem(key)
  }

  const rawValue = Reflect.get(storage, key)
  return typeof rawValue === 'string' ? rawValue : null
}

function writeStorageValue(storage: Storage, key: string, value: string) {
  if (typeof storage.setItem === 'function') {
    storage.setItem(key, value)
    return
  }

  Reflect.set(storage, key, value)
}

function deleteStorageValue(storage: Storage, key: string) {
  if (typeof storage.removeItem === 'function') {
    storage.removeItem(key)
    return
  }

  Reflect.deleteProperty(storage, key)
}

export function createWorkspaceSessionSnapshot(
  workspaceState: WorkspaceState,
): WorkspaceSessionSnapshot {
  const workspaceOrder = workspaceState.workspaceOrder.filter(
    (workspaceId, index, workspaceIds) =>
      workspaceState.workspacesById[workspaceId] !== undefined &&
      workspaceIds.indexOf(workspaceId) === index,
  )

  const workspacesById: Record<string, PersistedWorkspaceSession> = {}
  for (const workspaceId of workspaceOrder) {
    const workspaceSession = workspaceState.workspacesById[workspaceId]
    if (!workspaceSession) {
      continue
    }

    workspacesById[workspaceId] = {
      rootPath: workspaceSession.rootPath,
      workspaceKind: workspaceSession.workspaceKind,
      remoteWorkspaceId: workspaceSession.remoteWorkspaceId,
      remoteProfile: workspaceSession.remoteProfile,
      remoteConnectionState: workspaceSession.remoteConnectionState,
      remoteErrorCode: workspaceSession.remoteErrorCode,
      activeFile: workspaceSession.activeFile,
      activeSpec: workspaceSession.activeSpec,
      expandedDirectories: Array.from(
        new Set(workspaceSession.expandedDirectories),
      ),
      fileLastLineByPath: normalizeFileLastLineByPath(
        workspaceSession.fileLastLineByPath,
      ),
      watchModePreference: normalizeWatchModePreference(
        workspaceSession.watchModePreference,
      ),
    }
  }

  return {
    schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
    activeWorkspaceId:
      workspaceState.activeWorkspaceId &&
      workspacesById[workspaceState.activeWorkspaceId]
        ? workspaceState.activeWorkspaceId
        : null,
    workspaceOrder,
    workspacesById,
  }
}

export function loadWorkspaceSessionSnapshotWithDiagnostics(
  storage: Storage = window.localStorage,
): WorkspaceSessionSnapshotLoadResult {
  try {
    const rawValue = readStorageValue(storage, WORKSPACE_SESSION_STORAGE_KEY)
    if (!rawValue) {
      return {
        snapshot: null,
        error: null,
      }
    }

    const parsed = JSON.parse(rawValue) as unknown
    if (!isRecord(parsed)) {
      return {
        snapshot: null,
        error: 'Invalid workspace snapshot format.',
      }
    }

    if (
      parsed.schemaVersion !== 1 &&
      parsed.schemaVersion !== WORKSPACE_SESSION_SCHEMA_VERSION
    ) {
      return {
        snapshot: null,
        error: `Unsupported workspace snapshot schema version: ${String(parsed.schemaVersion)}.`,
      }
    }

    const rawWorkspacesById = isRecord(parsed.workspacesById)
      ? parsed.workspacesById
      : null
    if (!rawWorkspacesById) {
      return {
        snapshot: null,
        error: 'Workspace snapshot is missing workspacesById.',
      }
    }

    const normalizedWorkspacesById: Record<string, PersistedWorkspaceSession> = {}
    for (const [workspaceId, workspaceSession] of Object.entries(
      rawWorkspacesById,
    )) {
      if (!isNonEmptyString(workspaceId)) {
        continue
      }

      const normalizedWorkspaceSession =
        normalizeWorkspaceSession(workspaceSession)
      if (!normalizedWorkspaceSession) {
        continue
      }
      normalizedWorkspacesById[workspaceId] = normalizedWorkspaceSession
    }

    const normalizedWorkspaceOrder = normalizeUniqueStringArray(
      parsed.workspaceOrder,
    ).filter((workspaceId) => normalizedWorkspacesById[workspaceId] !== undefined)

    if (normalizedWorkspaceOrder.length === 0) {
      return {
        snapshot: null,
        error: 'Workspace snapshot does not contain any restorable workspace.',
      }
    }

    const rawActiveWorkspaceId = parsed.activeWorkspaceId
    const activeWorkspaceId =
      isNonEmptyString(rawActiveWorkspaceId) &&
      normalizedWorkspacesById[rawActiveWorkspaceId]
        ? rawActiveWorkspaceId
        : null

    return {
      snapshot: {
        schemaVersion: WORKSPACE_SESSION_SCHEMA_VERSION,
        activeWorkspaceId:
          activeWorkspaceId ??
          normalizedWorkspaceOrder[normalizedWorkspaceOrder.length - 1] ??
          null,
        workspaceOrder: normalizedWorkspaceOrder,
        workspacesById: normalizedWorkspacesById,
      },
      error: null,
    }
  } catch {
    return {
      snapshot: null,
      error: 'Invalid workspace snapshot JSON.',
    }
  }
}

export function loadWorkspaceSessionSnapshot(
  storage: Storage = window.localStorage,
): WorkspaceSessionSnapshot | null {
  return loadWorkspaceSessionSnapshotWithDiagnostics(storage).snapshot
}

export function saveWorkspaceSessionSnapshot(
  snapshot: WorkspaceSessionSnapshot,
  storage: Storage = window.localStorage,
) {
  try {
    writeStorageValue(
      storage,
      WORKSPACE_SESSION_STORAGE_KEY,
      JSON.stringify(snapshot),
    )
  } catch (error) {
    console.warn('Failed to persist workspace session snapshot.', error)
  }
}

export function clearWorkspaceSessionSnapshot(
  storage: Storage = window.localStorage,
) {
  try {
    deleteStorageValue(storage, WORKSPACE_SESSION_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear workspace session snapshot.', error)
  }
}

export function loadPersistedSpecScrollPositions(
  storage: Storage = window.localStorage,
): Record<string, number> {
  try {
    const rawValue = readStorageValue(storage, WORKSPACE_SPEC_SCROLL_STORAGE_KEY)
    if (!rawValue) {
      return {}
    }

    return normalizePersistedSpecScrollPositions(JSON.parse(rawValue) as unknown)
  } catch {
    return {}
  }
}

export function savePersistedSpecScrollPositions(
  positions: Record<string, number>,
  storage: Storage = window.localStorage,
) {
  try {
    writeStorageValue(
      storage,
      WORKSPACE_SPEC_SCROLL_STORAGE_KEY,
      JSON.stringify(normalizePersistedSpecScrollPositions(positions)),
    )
  } catch (error) {
    console.warn('Failed to persist spec scroll positions.', error)
  }
}
