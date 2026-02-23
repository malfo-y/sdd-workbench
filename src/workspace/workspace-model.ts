import type { CodeComment } from '../code-comments/comment-types'

export type WorkspaceId = string

export type LineSelectionRange = {
  startLine: number
  endLine: number
}

export type WorkspaceWatchMode = 'native' | 'polling'

export type WorkspaceWatchModePreference = 'auto' | 'native' | 'polling'

export type WorkspaceSession = {
  rootPath: string
  fileTree: WorkspaceFileNode[]
  changedFiles: string[]
  fileLastLineByPath: Record<string, number>
  fileHistory: string[]
  fileHistoryIndex: number
  activeFile: string | null
  activeSpec: string | null
  activeFileContent: string | null
  activeFileImagePreview: WorkspaceImagePreview | null
  activeSpecContent: string | null
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

export function createWorkspaceSession(rootPath: string): WorkspaceSession {
  return {
    rootPath,
    fileTree: [],
    changedFiles: [],
    fileLastLineByPath: {},
    fileHistory: [],
    fileHistoryIndex: -1,
    activeFile: null,
    activeSpec: null,
    activeFileContent: null,
    activeFileImagePreview: null,
    activeSpecContent: null,
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
): AddOrFocusWorkspaceResult {
  const workspaceId = createWorkspaceId(rootPath)
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
    [workspaceId]: createWorkspaceSession(rootPath),
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
): WorkspaceFileNode[] {
  return tree.map((node): WorkspaceFileNode => {
    if (node.kind !== 'directory') {
      return node
    }

    if (node.relativePath === directoryRelativePath) {
      return {
        ...node,
        children,
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
        ),
      }
    }

    return node
  })
}
