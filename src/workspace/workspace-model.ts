import type { CodeComment } from '../code-comments/comment-types'

export type WorkspaceId = string

export type LineSelectionRange = {
  startLine: number
  endLine: number
}

export type DocumentSaveState = 'clean' | 'dirty' | 'saving' | 'conflict'

export type WorkspaceDocumentSession = {
  relativePath: string
  savedContent: string
  draftContent: string
  saveState: DocumentSaveState
  /**
   * When `saveState === 'conflict'`, this holds the best-effort disk content that
   * triggered the conflict. UI/workspace logic can use it to offer deterministic
   * "Reload from disk" behavior.
   */
  conflictDiskContent: string | null
}

export type WorkspaceWatchMode = 'native' | 'polling'

export type WorkspaceWatchModePreference = 'auto' | 'native' | 'polling'

export type WorkspaceGitLineMarkerKind = 'added' | 'modified'

export type WorkspaceGitLineMarker = {
  line: number
  kind: WorkspaceGitLineMarkerKind
}

export type GitFileStatusKind = 'added' | 'modified' | 'untracked'

export type WorkspaceKind = 'local' | 'remote'

export type WorkspaceRemoteConnectionState =
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'disconnected'

export type WorkspaceRemoteProfile = {
  workspaceId: string
  host: string
  remoteRoot: string
  user?: string
  port?: number
  agentPath?: string
  identityFile?: string
  sshAlias?: string
  requestTimeoutMs?: number
  connectTimeoutMs?: number
}

export type WorkspaceSession = {
  rootPath: string
  workspaceKind: WorkspaceKind
  remoteWorkspaceId: string | null
  remoteProfile: WorkspaceRemoteProfile | null
  remoteConnectionState: WorkspaceRemoteConnectionState | null
  remoteErrorCode: string | null
  fileTree: WorkspaceFileNode[]
  changedFiles: string[]
  fileLastLineByPath: Record<string, number>
  fileHistory: string[]
  fileHistoryIndex: number
  activeFile: string | null
  activeSpec: string | null
  activeFileContent: string | null
  activeFileImagePreview: WorkspaceImagePreview | null
  activeFileGitLineMarkers: WorkspaceGitLineMarker[]
  activeSpecContent: string | null
  /**
   * Runtime-only, path-keyed cache for text/markdown documents.
   * This is the canonical source of truth for draft/save/conflict lifecycle.
   */
  documentSessionsByPath: Record<string, WorkspaceDocumentSession>
  isIndexing: boolean
  isReadingFile: boolean
  isReadingSpec: boolean
  readFileError: string | null
  activeSpecReadError: string | null
  previewUnavailableReason: WorkspacePreviewUnavailableReason | null
  selectionRange: LineSelectionRange | null
  expandedDirectories: string[]
  comments: CodeComment[]
  isReadingComments: boolean
  isWritingComments: boolean
  commentsError: string | null
  globalComments: string
  isReadingGlobalComments: boolean
  isWritingGlobalComments: boolean
  globalCommentsError: string | null
  watchModePreference: WorkspaceWatchModePreference
  watchMode: WorkspaceWatchMode | null
  isRemoteMounted: boolean
  loadingDirectories: string[]
  isDirty: boolean
  gitFileStatuses: Record<string, GitFileStatusKind>
}

export type WorkspaceState = {
  activeWorkspaceId: WorkspaceId | null
  workspaceOrder: WorkspaceId[]
  workspacesById: Record<WorkspaceId, WorkspaceSession>
}

type AddOrFocusWorkspaceResult = {
  state: WorkspaceState
  workspaceId: WorkspaceId
  created: boolean
}

type CreateWorkspaceSessionOptions = {
  workspaceKind?: WorkspaceKind
  remoteWorkspaceId?: string | null
  remoteProfile?: WorkspaceRemoteProfile | null
  remoteConnectionState?: WorkspaceRemoteConnectionState | null
  remoteErrorCode?: string | null
}

type AddOrFocusWorkspaceOptions = {
  workspaceId?: WorkspaceId
  sessionOptions?: CreateWorkspaceSessionOptions
}

export type WorkspaceFileHistoryDirection = 'back' | 'forward'

export type WorkspaceFileHistoryStepResult = {
  nextSession: WorkspaceSession
  targetRelativePath: string | null
}

export const MAX_WORKSPACE_FILE_HISTORY = 200

export function createEmptyWorkspaceState(): WorkspaceState {
  return {
    activeWorkspaceId: null,
    workspaceOrder: [],
    workspacesById: {},
  }
}

export function createWorkspaceId(rootPath: string): WorkspaceId {
  const slashNormalizedPath = rootPath.replace(/\\/g, '/')
  const trimmedPath =
    slashNormalizedPath.length > 1
      ? slashNormalizedPath.replace(/\/+$/, '')
      : slashNormalizedPath

  if (trimmedPath === '') {
    return '/'
  }

  if (/^[A-Za-z]:$/.test(trimmedPath)) {
    return `${trimmedPath}/`
  }

  return trimmedPath
}

export function createWorkspaceSession(
  rootPath: string,
  options: CreateWorkspaceSessionOptions = {},
): WorkspaceSession {
  const workspaceKind = options.workspaceKind ?? 'local'

  return {
    rootPath,
    workspaceKind,
    remoteWorkspaceId:
      workspaceKind === 'remote' ? (options.remoteWorkspaceId ?? null) : null,
    remoteProfile:
      workspaceKind === 'remote' ? (options.remoteProfile ?? null) : null,
    remoteConnectionState:
      workspaceKind === 'remote' ? (options.remoteConnectionState ?? null) : null,
    remoteErrorCode:
      workspaceKind === 'remote' ? (options.remoteErrorCode ?? null) : null,
    fileTree: [],
    changedFiles: [],
    fileLastLineByPath: {},
    fileHistory: [],
    fileHistoryIndex: -1,
    activeFile: null,
    activeSpec: null,
    activeFileContent: null,
    activeFileImagePreview: null,
    activeFileGitLineMarkers: [],
    activeSpecContent: null,
    documentSessionsByPath: {},
    isIndexing: false,
    isReadingFile: false,
    isReadingSpec: false,
    readFileError: null,
    activeSpecReadError: null,
    previewUnavailableReason: null,
    selectionRange: null,
    expandedDirectories: [],
    comments: [],
    isReadingComments: false,
    isWritingComments: false,
    commentsError: null,
    globalComments: '',
    isReadingGlobalComments: false,
    isWritingGlobalComments: false,
    globalCommentsError: null,
    watchModePreference: 'auto',
    watchMode: null,
    isRemoteMounted: false,
    loadingDirectories: [],
    isDirty: false,
    gitFileStatuses: {},
  }
}

export function createWorkspaceDocumentSession(
  relativePath: string,
  content: string,
): WorkspaceDocumentSession {
  return {
    relativePath,
    savedContent: content,
    draftContent: content,
    saveState: 'clean',
    conflictDiskContent: null,
  }
}

export function getWorkspaceDocumentSession(
  session: WorkspaceSession,
  relativePath: string,
): WorkspaceDocumentSession | null {
  return session.documentSessionsByPath[relativePath] ?? null
}

export function upsertWorkspaceDocumentSessionFromDisk(
  session: WorkspaceSession,
  relativePath: string,
  diskContent: string,
): WorkspaceSession {
  const existing = session.documentSessionsByPath[relativePath]
  const next =
    existing === undefined
      ? createWorkspaceDocumentSession(relativePath, diskContent)
      : {
          ...existing,
          savedContent: diskContent,
          draftContent: diskContent,
          saveState: 'clean' as const,
          conflictDiskContent: null,
        }

  if (existing === next) {
    return session
  }

  return {
    ...session,
    documentSessionsByPath: {
      ...session.documentSessionsByPath,
      [relativePath]: next,
    },
  }
}

export function setWorkspaceDocumentDraftContent(
  session: WorkspaceSession,
  relativePath: string,
  draftContent: string,
): WorkspaceSession {
  const existing =
    session.documentSessionsByPath[relativePath] ??
    createWorkspaceDocumentSession(relativePath, draftContent)

  const nextSaveState: DocumentSaveState =
    existing.saveState === 'conflict' || existing.saveState === 'saving'
      ? existing.saveState
      : draftContent === existing.savedContent
        ? 'clean'
        : 'dirty'

  const next =
    existing.draftContent === draftContent && existing.saveState === nextSaveState
      ? existing
      : {
          ...existing,
          draftContent,
          saveState: nextSaveState,
        }

  if (next === existing) {
    return session
  }

  return {
    ...session,
    documentSessionsByPath: {
      ...session.documentSessionsByPath,
      [relativePath]: next,
    },
  }
}

/**
 * Mark a document as dirty when the editor has signaled unsaved work but the
 * current draft text has not yet been synchronized into the workspace session.
 *
 * This intentionally updates only `saveState`; callers that know the draft text
 * should continue using `setWorkspaceDocumentDraftContent`.
 */
export function markWorkspaceDocumentDirtyWithoutDraftSync(
  session: WorkspaceSession,
  relativePath: string,
  baselineContent: string,
): WorkspaceSession {
  const existing =
    session.documentSessionsByPath[relativePath] ??
    createWorkspaceDocumentSession(relativePath, baselineContent)

  if (existing.saveState === 'dirty' || existing.saveState === 'saving') {
    return session
  }

  if (existing.saveState === 'conflict') {
    return session
  }

  const next: WorkspaceDocumentSession = {
    ...existing,
    saveState: 'dirty',
  }

  if (next === existing) {
    return session
  }

  return {
    ...session,
    documentSessionsByPath: {
      ...session.documentSessionsByPath,
      [relativePath]: next,
    },
  }
}

/**
 * Deprecated compatibility alias. Prefer `markWorkspaceDocumentDirtyWithoutDraftSync`.
 */
export function markWorkspaceDocumentDirtyCompatibility(
  session: WorkspaceSession,
  relativePath: string,
  baselineContent: string,
): WorkspaceSession {
  return markWorkspaceDocumentDirtyWithoutDraftSync(
    session,
    relativePath,
    baselineContent,
  )
}

export function beginWorkspaceDocumentSave(
  session: WorkspaceSession,
  relativePath: string,
): WorkspaceSession {
  const existing = session.documentSessionsByPath[relativePath]
  if (!existing) {
    return session
  }

  if (existing.saveState === 'saving') {
    return session
  }

  const next: WorkspaceDocumentSession = {
    ...existing,
    saveState: 'saving',
  }

  return {
    ...session,
    documentSessionsByPath: {
      ...session.documentSessionsByPath,
      [relativePath]: next,
    },
  }
}

export function completeWorkspaceDocumentSaveSuccess(
  session: WorkspaceSession,
  relativePath: string,
  savedContent: string,
): WorkspaceSession {
  const existing = session.documentSessionsByPath[relativePath]
  if (!existing) {
    return session
  }

  const next: WorkspaceDocumentSession = {
    ...existing,
    savedContent,
    draftContent: savedContent,
    saveState: 'clean',
    conflictDiskContent: null,
  }

  return {
    ...session,
    documentSessionsByPath: {
      ...session.documentSessionsByPath,
      [relativePath]: next,
    },
  }
}

export function completeWorkspaceDocumentSaveFailure(
  session: WorkspaceSession,
  relativePath: string,
): WorkspaceSession {
  const existing = session.documentSessionsByPath[relativePath]
  if (!existing) {
    return session
  }

  if (existing.saveState !== 'saving') {
    return session
  }

  const nextSaveState: DocumentSaveState =
    existing.draftContent === existing.savedContent ? 'clean' : 'dirty'

  return {
    ...session,
    documentSessionsByPath: {
      ...session.documentSessionsByPath,
      [relativePath]: {
        ...existing,
        saveState: nextSaveState,
      },
    },
  }
}

export function markWorkspaceDocumentConflict(
  session: WorkspaceSession,
  relativePath: string,
  diskContent: string | null,
): WorkspaceSession {
  const existing = session.documentSessionsByPath[relativePath]
  if (!existing) {
    return session
  }

  const next: WorkspaceDocumentSession =
    existing.saveState === 'conflict' && existing.conflictDiskContent === diskContent
      ? existing
      : {
          ...existing,
          saveState: 'conflict',
          conflictDiskContent: diskContent,
        }

  if (next === existing) {
    return session
  }

  return {
    ...session,
    documentSessionsByPath: {
      ...session.documentSessionsByPath,
      [relativePath]: next,
    },
  }
}

export function removeWorkspaceDocumentSession(
  session: WorkspaceSession,
  relativePath: string,
): WorkspaceSession {
  if (session.documentSessionsByPath[relativePath] === undefined) {
    return session
  }

  const next = { ...session.documentSessionsByPath }
  delete next[relativePath]

  return {
    ...session,
    documentSessionsByPath: next,
  }
}

function matchesWorkspacePathScope(
  candidatePath: string,
  targetPath: string,
): boolean {
  return (
    candidatePath === targetPath ||
    candidatePath.startsWith(`${targetPath}/`)
  )
}

function renameWorkspacePath(
  candidatePath: string,
  oldPath: string,
  newPath: string,
): string {
  if (!matchesWorkspacePathScope(candidatePath, oldPath)) {
    return candidatePath
  }
  return `${newPath}${candidatePath.slice(oldPath.length)}`
}

function filterWorkspaceHistoryPaths(
  fileHistory: string[],
  fileHistoryIndex: number,
  shouldRemove: (relativePath: string) => boolean,
): {
  fileHistory: string[]
  fileHistoryIndex: number
} {
  if (fileHistory.length === 0) {
    return {
      fileHistory,
      fileHistoryIndex,
    }
  }

  const nextFileHistory: string[] = []
  let removedAtOrBeforeIndex = 0

  fileHistory.forEach((relativePath, index) => {
    if (shouldRemove(relativePath)) {
      if (index <= fileHistoryIndex) {
        removedAtOrBeforeIndex += 1
      }
      return
    }
    nextFileHistory.push(relativePath)
  })

  if (
    nextFileHistory.length === fileHistory.length &&
    removedAtOrBeforeIndex === 0
  ) {
    return {
      fileHistory,
      fileHistoryIndex,
    }
  }

  if (nextFileHistory.length === 0) {
    return {
      fileHistory: [],
      fileHistoryIndex: -1,
    }
  }

  const nextHistoryIndex = Math.max(
    0,
    Math.min(
      fileHistoryIndex - removedAtOrBeforeIndex,
      nextFileHistory.length - 1,
    ),
  )

  return {
    fileHistory: nextFileHistory,
    fileHistoryIndex: nextHistoryIndex,
  }
}

export function renameWorkspaceSessionPaths(
  session: WorkspaceSession,
  oldPath: string,
  newPath: string,
): WorkspaceSession {
  if (oldPath === newPath) {
    return session
  }

  let changed = false
  const renameIfMatched = (relativePath: string): string => {
    const nextRelativePath = renameWorkspacePath(relativePath, oldPath, newPath)
    if (nextRelativePath !== relativePath) {
      changed = true
    }
    return nextRelativePath
  }

  const nextDocumentSessionsByPath: Record<string, WorkspaceDocumentSession> = {}
  Object.entries(session.documentSessionsByPath).forEach(([relativePath, doc]) => {
    const nextRelativePath = renameIfMatched(relativePath)
    nextDocumentSessionsByPath[nextRelativePath] =
      nextRelativePath === relativePath
        ? doc
        : {
            ...doc,
            relativePath: nextRelativePath,
          }
  })

  const nextFileLastLineByPath: Record<string, number> = {}
  Object.entries(session.fileLastLineByPath).forEach(([relativePath, lineNumber]) => {
    nextFileLastLineByPath[renameIfMatched(relativePath)] = lineNumber
  })

  const nextGitFileStatuses: Record<string, GitFileStatusKind> = {}
  Object.entries(session.gitFileStatuses).forEach(([relativePath, status]) => {
    nextGitFileStatuses[renameIfMatched(relativePath)] = status
  })

  const nextChangedFiles = session.changedFiles.map(renameIfMatched)
  const nextFileHistory = session.fileHistory.map(renameIfMatched)
  const nextActiveFile = session.activeFile ? renameIfMatched(session.activeFile) : null
  const nextActiveSpec = session.activeSpec ? renameIfMatched(session.activeSpec) : null

  if (!changed) {
    return session
  }

  return {
    ...session,
    changedFiles: nextChangedFiles,
    fileLastLineByPath: nextFileLastLineByPath,
    fileHistory: nextFileHistory,
    activeFile: nextActiveFile,
    activeSpec: nextActiveSpec,
    documentSessionsByPath: nextDocumentSessionsByPath,
    gitFileStatuses: nextGitFileStatuses,
  }
}

export function removeWorkspaceSessionPaths(
  session: WorkspaceSession,
  targetPath: string,
): WorkspaceSession {
  const shouldRemovePath = (relativePath: string) =>
    matchesWorkspacePathScope(relativePath, targetPath)

  let changed = false
  const nextDocumentSessionsByPath: Record<string, WorkspaceDocumentSession> = {}
  Object.entries(session.documentSessionsByPath).forEach(([relativePath, doc]) => {
    if (shouldRemovePath(relativePath)) {
      changed = true
      return
    }
    nextDocumentSessionsByPath[relativePath] = doc
  })

  const nextFileLastLineByPath: Record<string, number> = {}
  Object.entries(session.fileLastLineByPath).forEach(([relativePath, lineNumber]) => {
    if (shouldRemovePath(relativePath)) {
      changed = true
      return
    }
    nextFileLastLineByPath[relativePath] = lineNumber
  })

  const nextGitFileStatuses: Record<string, GitFileStatusKind> = {}
  Object.entries(session.gitFileStatuses).forEach(([relativePath, status]) => {
    if (shouldRemovePath(relativePath)) {
      changed = true
      return
    }
    nextGitFileStatuses[relativePath] = status
  })

  const nextChangedFiles = session.changedFiles.filter((relativePath) => {
    const shouldRemove = shouldRemovePath(relativePath)
    if (shouldRemove) {
      changed = true
    }
    return !shouldRemove
  })

  const {
    fileHistory: nextFileHistory,
    fileHistoryIndex: nextFileHistoryIndex,
  } = filterWorkspaceHistoryPaths(
    session.fileHistory,
    session.fileHistoryIndex,
    shouldRemovePath,
  )
  if (
    nextFileHistory !== session.fileHistory ||
    nextFileHistoryIndex !== session.fileHistoryIndex
  ) {
    changed = true
  }

  const nextActiveFile =
    session.activeFile && shouldRemovePath(session.activeFile)
      ? null
      : session.activeFile
  const nextActiveSpec =
    session.activeSpec && shouldRemovePath(session.activeSpec)
      ? null
      : session.activeSpec

  if (nextActiveFile !== session.activeFile || nextActiveSpec !== session.activeSpec) {
    changed = true
  }

  if (!changed) {
    return session
  }

  const clearedActiveFile = nextActiveFile === null
  const clearedActiveSpec = nextActiveSpec === null

  return {
    ...session,
    changedFiles: nextChangedFiles,
    fileLastLineByPath: nextFileLastLineByPath,
    fileHistory: nextFileHistory,
    fileHistoryIndex: nextFileHistoryIndex,
    activeFile: nextActiveFile,
    activeSpec: nextActiveSpec,
    activeFileContent: clearedActiveFile ? null : session.activeFileContent,
    activeFileImagePreview: clearedActiveFile ? null : session.activeFileImagePreview,
    activeFileGitLineMarkers: clearedActiveFile ? [] : session.activeFileGitLineMarkers,
    activeSpecContent: clearedActiveSpec ? null : session.activeSpecContent,
    documentSessionsByPath: nextDocumentSessionsByPath,
    isReadingFile: clearedActiveFile ? false : session.isReadingFile,
    isReadingSpec: clearedActiveSpec ? false : session.isReadingSpec,
    readFileError: clearedActiveFile ? null : session.readFileError,
    activeSpecReadError: clearedActiveSpec ? null : session.activeSpecReadError,
    previewUnavailableReason: clearedActiveFile
      ? null
      : session.previewUnavailableReason,
    selectionRange: clearedActiveFile ? null : session.selectionRange,
    gitFileStatuses: nextGitFileStatuses,
  }
}

export function getActiveWorkspaceDocumentSaveState(
  session: WorkspaceSession,
): DocumentSaveState | null {
  const activeFile = session.activeFile
  if (!activeFile) {
    return null
  }
  return session.documentSessionsByPath[activeFile]?.saveState ?? null
}

export function deriveWorkspaceHasUnsavedChanges(
  session: WorkspaceSession,
): boolean {
  const saveState = getActiveWorkspaceDocumentSaveState(session)
  if (saveState === null) {
    return false
  }
  return saveState !== 'clean'
}

/**
 * Deprecated compatibility alias. Prefer `deriveWorkspaceHasUnsavedChanges`.
 */
export function deriveWorkspaceIsDirtyCompatibility(
  session: WorkspaceSession,
): boolean {
  return deriveWorkspaceHasUnsavedChanges(session)
}

export function setDirty(
  session: WorkspaceSession,
  dirty: boolean,
): WorkspaceSession {
  return {
    ...session,
    isDirty: dirty,
  }
}

export function normalizeLineNumber(lineNumber: number): number {
  if (!Number.isFinite(lineNumber)) {
    return 1
  }
  return Math.max(1, Math.trunc(lineNumber))
}

function normalizeSelectionRange(
  selectionRange: LineSelectionRange,
): LineSelectionRange {
  const normalizedStartLine = normalizeLineNumber(selectionRange.startLine)
  const normalizedEndLine = normalizeLineNumber(selectionRange.endLine)
  return normalizedStartLine <= normalizedEndLine
    ? {
        startLine: normalizedStartLine,
        endLine: normalizedEndLine,
      }
    : {
        startLine: normalizedEndLine,
        endLine: normalizedStartLine,
      }
}

export function getWorkspaceFileLastLine(
  session: WorkspaceSession,
  relativePath: string,
): number | null {
  const rawLineNumber = session.fileLastLineByPath[relativePath]
  if (!Number.isInteger(rawLineNumber) || rawLineNumber < 1) {
    return null
  }
  return rawLineNumber
}

export function setWorkspaceSelectionRange(
  session: WorkspaceSession,
  selectionRange: LineSelectionRange | null,
): WorkspaceSession {
  if (selectionRange === null) {
    if (session.selectionRange === null) {
      return session
    }

    return {
      ...session,
      selectionRange: null,
    }
  }

  const normalizedSelectionRange = normalizeSelectionRange(selectionRange)
  const activeFile = session.activeFile
  const nextLastLineByPath =
    activeFile === null
      ? session.fileLastLineByPath
      : {
          ...session.fileLastLineByPath,
          [activeFile]: normalizedSelectionRange.endLine,
        }

  const selectionUnchanged =
    session.selectionRange !== null &&
    session.selectionRange.startLine === normalizedSelectionRange.startLine &&
    session.selectionRange.endLine === normalizedSelectionRange.endLine
  const fileLastLineUnchanged =
    activeFile === null ||
    session.fileLastLineByPath[activeFile] === normalizedSelectionRange.endLine

  if (selectionUnchanged && fileLastLineUnchanged) {
    return session
  }

  return {
    ...session,
    selectionRange: normalizedSelectionRange,
    fileLastLineByPath: nextLastLineByPath,
  }
}

function getNormalizedHistoryIndex(
  fileHistory: string[],
  fileHistoryIndex: number,
): number {
  if (fileHistory.length === 0) {
    return -1
  }

  if (fileHistoryIndex < 0) {
    return -1
  }

  return Math.min(fileHistoryIndex, fileHistory.length - 1)
}

export function pushWorkspaceFileHistory(
  session: WorkspaceSession,
  relativePath: string,
): WorkspaceSession {
  const normalizedHistoryIndex = getNormalizedHistoryIndex(
    session.fileHistory,
    session.fileHistoryIndex,
  )
  const currentRelativePath =
    normalizedHistoryIndex >= 0
      ? session.fileHistory[normalizedHistoryIndex] ?? null
      : null

  if (currentRelativePath === relativePath) {
    if (normalizedHistoryIndex === session.fileHistoryIndex) {
      return session
    }

    return {
      ...session,
      fileHistoryIndex: normalizedHistoryIndex,
    }
  }

  const truncatedHistory =
    normalizedHistoryIndex >= 0
      ? session.fileHistory.slice(0, normalizedHistoryIndex + 1)
      : []
  const nextHistory = [...truncatedHistory, relativePath]
  const overflowCount = nextHistory.length - MAX_WORKSPACE_FILE_HISTORY
  const limitedHistory =
    overflowCount > 0 ? nextHistory.slice(overflowCount) : nextHistory

  return {
    ...session,
    fileHistory: limitedHistory,
    fileHistoryIndex: limitedHistory.length - 1,
  }
}

export function canStepWorkspaceFileHistory(
  session: WorkspaceSession,
  direction: WorkspaceFileHistoryDirection,
): boolean {
  const normalizedHistoryIndex = getNormalizedHistoryIndex(
    session.fileHistory,
    session.fileHistoryIndex,
  )

  if (normalizedHistoryIndex < 0) {
    return false
  }

  if (direction === 'back') {
    return normalizedHistoryIndex > 0
  }

  return normalizedHistoryIndex < session.fileHistory.length - 1
}

export function stepWorkspaceFileHistory(
  session: WorkspaceSession,
  direction: WorkspaceFileHistoryDirection,
): WorkspaceFileHistoryStepResult {
  if (!canStepWorkspaceFileHistory(session, direction)) {
    return {
      nextSession: session,
      targetRelativePath: null,
    }
  }

  const normalizedHistoryIndex = getNormalizedHistoryIndex(
    session.fileHistory,
    session.fileHistoryIndex,
  )
  const nextHistoryIndex =
    direction === 'back'
      ? normalizedHistoryIndex - 1
      : normalizedHistoryIndex + 1
  const targetRelativePath = session.fileHistory[nextHistoryIndex] ?? null

  if (!targetRelativePath) {
    return {
      nextSession: session,
      targetRelativePath: null,
    }
  }

  if (nextHistoryIndex === session.fileHistoryIndex) {
    return {
      nextSession: session,
      targetRelativePath,
    }
  }

  return {
    nextSession: {
      ...session,
      fileHistoryIndex: nextHistoryIndex,
    },
    targetRelativePath,
  }
}

export function addOrFocusWorkspace(
  state: WorkspaceState,
  rootPath: string,
  options?: AddOrFocusWorkspaceOptions,
): AddOrFocusWorkspaceResult {
  const requestedWorkspaceId = options?.workspaceId?.trim()
  const workspaceId = requestedWorkspaceId || createWorkspaceId(rootPath)
  const existingSession = state.workspacesById[workspaceId]

  if (existingSession) {
    return {
      state: setActiveWorkspace(state, workspaceId),
      workspaceId,
      created: false,
    }
  }

  const nextWorkspacesById = {
    ...state.workspacesById,
    [workspaceId]: createWorkspaceSession(rootPath, options?.sessionOptions),
  }

  return {
    state: {
      activeWorkspaceId: workspaceId,
      workspaceOrder: [...state.workspaceOrder, workspaceId],
      workspacesById: nextWorkspacesById,
    },
    workspaceId,
    created: true,
  }
}

export function switchActiveWorkspace(
  state: WorkspaceState,
  workspaceId: WorkspaceId,
): WorkspaceState {
  const session = state.workspacesById[workspaceId]
  if (!session) {
    return state
  }

  if (state.activeWorkspaceId === workspaceId) {
    return state
  }

  const nextSession =
    session.selectionRange === null
      ? session
      : {
          ...session,
          selectionRange: null,
        }

  return {
    activeWorkspaceId: workspaceId,
    workspaceOrder: state.workspaceOrder,
    workspacesById:
      nextSession === session
        ? state.workspacesById
        : {
            ...state.workspacesById,
            [workspaceId]: nextSession,
          },
  }
}

export function setActiveWorkspace(
  state: WorkspaceState,
  workspaceId: WorkspaceId,
): WorkspaceState {
  const session = state.workspacesById[workspaceId]
  if (!session) {
    return state
  }

  if (state.activeWorkspaceId === workspaceId) {
    return state
  }

  const nextWorkspaceOrder = [
    ...state.workspaceOrder.filter((currentId) => currentId !== workspaceId),
    workspaceId,
  ]
  const nextSession =
    session.selectionRange === null
      ? session
      : {
          ...session,
          selectionRange: null,
        }

  return {
    activeWorkspaceId: workspaceId,
    workspaceOrder: nextWorkspaceOrder,
    workspacesById:
      nextSession === session
        ? state.workspacesById
        : {
            ...state.workspacesById,
            [workspaceId]: nextSession,
          },
  }
}

export function closeWorkspace(
  state: WorkspaceState,
  workspaceId: WorkspaceId,
): WorkspaceState {
  const existingSession = state.workspacesById[workspaceId]
  if (!existingSession) {
    return state
  }

  const nextWorkspacesById = { ...state.workspacesById }
  delete nextWorkspacesById[workspaceId]

  const nextWorkspaceOrder = state.workspaceOrder.filter(
    (currentId) => currentId !== workspaceId,
  )

  if (nextWorkspaceOrder.length === 0) {
    return {
      activeWorkspaceId: null,
      workspaceOrder: [],
      workspacesById: nextWorkspacesById,
    }
  }

  if (state.activeWorkspaceId !== workspaceId) {
    return {
      activeWorkspaceId: state.activeWorkspaceId,
      workspaceOrder: nextWorkspaceOrder,
      workspacesById: nextWorkspacesById,
    }
  }

  const promotedWorkspaceId = nextWorkspaceOrder[nextWorkspaceOrder.length - 1]
  return setActiveWorkspace(
    {
      activeWorkspaceId: workspaceId,
      workspaceOrder: nextWorkspaceOrder,
      workspacesById: nextWorkspacesById,
    },
    promotedWorkspaceId,
  )
}

export function updateWorkspaceSession(
  state: WorkspaceState,
  workspaceId: WorkspaceId,
  updater: (session: WorkspaceSession) => WorkspaceSession,
): WorkspaceState {
  const currentSession = state.workspacesById[workspaceId]
  if (!currentSession) {
    return state
  }

  const nextSession = updater(currentSession)
  if (nextSession === currentSession) {
    return state
  }

  return {
    ...state,
    workspacesById: {
      ...state.workspacesById,
      [workspaceId]: nextSession,
    },
  }
}

export function listWorkspaces(
  state: WorkspaceState,
): Array<{ id: WorkspaceId; rootPath: string }> {
  return state.workspaceOrder
    .map((workspaceId) => {
      const session = state.workspacesById[workspaceId]
      if (!session) {
        return null
      }

      return {
        id: workspaceId,
        rootPath: session.rootPath,
      }
    })
    .filter(
      (
        workspace,
      ): workspace is {
        id: WorkspaceId
        rootPath: string
      } => workspace !== null,
    )
}

export function mergeDirectoryChildren(
  tree: WorkspaceFileNode[],
  directoryRelativePath: string,
  children: WorkspaceFileNode[],
  childrenStatus: 'complete' | 'partial',
  totalChildCount: number,
  options?: { appendChildren?: boolean },
): WorkspaceFileNode[] {
  return tree.map((node): WorkspaceFileNode => {
    if (node.kind !== 'directory') {
      return node
    }

    if (node.relativePath === directoryRelativePath) {
      const nextChildren = options?.appendChildren
        ? [
            ...(node.children ?? []),
            ...children.filter(
              (childNode) =>
                !(node.children ?? []).some(
                  (existingChildNode) =>
                    existingChildNode.relativePath === childNode.relativePath,
                ),
            ),
          ]
        : children
      return {
        ...node,
        children: nextChildren,
        childrenStatus,
        totalChildCount,
      }
    }

    if (
      node.children &&
      directoryRelativePath.startsWith(node.relativePath + '/')
    ) {
      return {
        ...node,
        children: mergeDirectoryChildren(
          node.children,
          directoryRelativePath,
          children,
          childrenStatus,
          totalChildCount,
          options,
        ),
      }
    }

    return node
  })
}
