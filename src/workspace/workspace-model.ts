export type WorkspaceId = string

export type LineSelectionRange = {
  startLine: number
  endLine: number
}

export type WorkspaceSession = {
  rootPath: string
  fileTree: WorkspaceFileNode[]
  activeFile: string | null
  activeSpec: string | null
  activeFileContent: string | null
  activeSpecContent: string | null
  isIndexing: boolean
  isReadingFile: boolean
  isReadingSpec: boolean
  readFileError: string | null
  activeSpecReadError: string | null
  previewUnavailableReason: WorkspacePreviewUnavailableReason | null
  selectionRange: LineSelectionRange | null
  expandedDirectories: string[]
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
    activeFile: null,
    activeSpec: null,
    activeFileContent: null,
    activeSpecContent: null,
    isIndexing: false,
    isReadingFile: false,
    isReadingSpec: false,
    readFileError: null,
    activeSpecReadError: null,
    previewUnavailableReason: null,
    selectionRange: null,
    expandedDirectories: [],
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
