import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addOrFocusWorkspace,
  closeWorkspace as closeWorkspaceInState,
  createEmptyWorkspaceState,
  createWorkspaceId,
  listWorkspaces,
  setActiveWorkspace as setActiveWorkspaceInState,
  updateWorkspaceSession,
  type LineSelectionRange,
  type WorkspaceId,
} from './workspace-model'

type WorkspaceContextValue = {
  workspaceOrder: WorkspaceId[]
  workspaces: Array<{ id: WorkspaceId; rootPath: string }>
  activeWorkspaceId: WorkspaceId | null
  rootPath: string | null
  fileTree: WorkspaceFileNode[]
  activeFile: string | null
  activeFileContent: string | null
  isIndexing: boolean
  isReadingFile: boolean
  readFileError: string | null
  previewUnavailableReason: WorkspacePreviewUnavailableReason | null
  selectionRange: LineSelectionRange | null
  expandedDirectories: string[]
  bannerMessage: string | null
  openWorkspace: () => Promise<void>
  setActiveWorkspace: (workspaceId: WorkspaceId) => void
  closeWorkspace: (workspaceId: WorkspaceId) => void
  selectFile: (relativePath: string) => void
  setSelectionRange: (selectionRange: LineSelectionRange | null) => void
  setExpandedDirectories: (expandedDirectories: string[]) => void
  clearBanner: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined,
)

type WorkspaceProviderProps = {
  children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspaceState, setWorkspaceState] = useState(createEmptyWorkspaceState)
  const workspaceStateRef = useRef(workspaceState)
  workspaceStateRef.current = workspaceState

  const [bannerMessage, setBannerMessage] = useState<string | null>(null)
  const indexRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readFileRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})

  const clearBanner = useCallback(() => {
    setBannerMessage(null)
  }, [])

  const loadWorkspaceIndex = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string) => {
    const requestId = (indexRequestIdByWorkspaceRef.current[workspaceId] ?? 0) + 1
    indexRequestIdByWorkspaceRef.current[workspaceId] = requestId

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
        ...currentSession,
        isIndexing: true,
        fileTree: [],
        activeFile: null,
        activeFileContent: null,
        isReadingFile: false,
        readFileError: null,
        previewUnavailableReason: null,
        selectionRange: null,
        expandedDirectories: [],
      })),
    )

    try {
      const indexResult = await window.workspace.index(rootPath)
      if (indexRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
        return
      }

      if (!indexResult.ok) {
        setBannerMessage(
          indexResult.error
            ? `Failed to index workspace: ${indexResult.error}`
            : 'Failed to index workspace.',
        )
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            isIndexing: false,
          })),
        )
        return
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...currentSession,
          fileTree: indexResult.fileTree,
          isIndexing: false,
        })),
      )
      setBannerMessage(null)
    } catch (error) {
      if (indexRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
        return
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...currentSession,
          isIndexing: false,
        })),
      )
      setBannerMessage(
        error instanceof Error
          ? `Failed to index workspace: ${error.message}`
          : 'Failed to index workspace.',
      )
    }
    },
    [],
  )

  const openWorkspace = useCallback(async () => {
    try {
      const result = await window.workspace.openDialog()

      if (result.canceled) {
        setBannerMessage(
          result.error
            ? `Failed to open workspace: ${result.error}`
            : 'Workspace selection was canceled.',
        )
        return
      }

      if (!result.selectedPath) {
        setBannerMessage('No workspace path was selected.')
        return
      }

      const selectedPath = result.selectedPath
      const selectedWorkspaceId = createWorkspaceId(selectedPath)
      const isExistingWorkspace =
        workspaceStateRef.current.workspacesById[selectedWorkspaceId] !== undefined

      setWorkspaceState((previous) => {
        const addResult = addOrFocusWorkspace(previous, selectedPath)
        return addResult.state
      })

      if (isExistingWorkspace) {
        setBannerMessage(null)
        return
      }

      await loadWorkspaceIndex(selectedWorkspaceId, selectedPath)
    } catch (error) {
      setBannerMessage(
        error instanceof Error
          ? `Failed to open workspace: ${error.message}`
          : 'Failed to open workspace.',
      )
    }
  }, [loadWorkspaceIndex])

  const setActiveWorkspace = useCallback((workspaceId: WorkspaceId) => {
    setWorkspaceState((previous) =>
      setActiveWorkspaceInState(previous, workspaceId),
    )
  }, [])

  const closeWorkspace = useCallback((workspaceId: WorkspaceId) => {
    delete indexRequestIdByWorkspaceRef.current[workspaceId]
    delete readFileRequestIdByWorkspaceRef.current[workspaceId]
    setWorkspaceState((previous) => closeWorkspaceInState(previous, workspaceId))
  }, [])

  const selectFile = useCallback((relativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const activeSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!activeSession) {
      return
    }

    const requestId =
      (readFileRequestIdByWorkspaceRef.current[activeWorkspaceId] ?? 0) + 1
    readFileRequestIdByWorkspaceRef.current[activeWorkspaceId] = requestId

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
        ...currentSession,
        activeFile: relativePath,
        activeFileContent: null,
        selectionRange: null,
        readFileError: null,
        previewUnavailableReason: null,
        isReadingFile: true,
      })),
    )

    void (async () => {
      try {
        const readResult = await window.workspace.readFile(
          activeSession.rootPath,
          relativePath,
        )
        if (
          readFileRequestIdByWorkspaceRef.current[activeWorkspaceId] !== requestId
        ) {
          return
        }

        if (!readResult.ok) {
          setWorkspaceState((previous) =>
            updateWorkspaceSession(
              previous,
              activeWorkspaceId,
              (currentSession) => ({
                ...currentSession,
                readFileError: readResult.error
                  ? `Failed to read file: ${readResult.error}`
                  : 'Failed to read file.',
                isReadingFile: false,
              }),
            ),
          )
          return
        }

        if (readResult.previewUnavailableReason) {
          setWorkspaceState((previous) =>
            updateWorkspaceSession(
              previous,
              activeWorkspaceId,
              (currentSession) => ({
                ...currentSession,
                previewUnavailableReason: readResult.previewUnavailableReason ?? null,
                isReadingFile: false,
              }),
            ),
          )
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
            ...currentSession,
            activeFileContent: readResult.content ?? '',
            isReadingFile: false,
          })),
        )
      } catch (error) {
        if (
          readFileRequestIdByWorkspaceRef.current[activeWorkspaceId] !== requestId
        ) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
            ...currentSession,
            readFileError:
              error instanceof Error
                ? `Failed to read file: ${error.message}`
                : 'Failed to read file.',
            isReadingFile: false,
          })),
        )
      }
    })()
  }, [])

  const setSelectionRange = useCallback(
    (selectionRange: LineSelectionRange | null) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
          ...currentSession,
          selectionRange,
        })),
      )
    },
    [],
  )

  const setExpandedDirectories = useCallback(
    (expandedDirectories: string[]) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }

      const nextExpandedDirectories = Array.from(new Set(expandedDirectories))
      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
          ...currentSession,
          expandedDirectories: nextExpandedDirectories,
        })),
      )
    },
    [],
  )

  const activeWorkspace = workspaceState.activeWorkspaceId
    ? workspaceState.workspacesById[workspaceState.activeWorkspaceId] ?? null
    : null

  const value = useMemo(
    () => ({
      workspaceOrder: workspaceState.workspaceOrder,
      workspaces: listWorkspaces(workspaceState),
      activeWorkspaceId: workspaceState.activeWorkspaceId,
      rootPath: activeWorkspace?.rootPath ?? null,
      fileTree: activeWorkspace?.fileTree ?? [],
      activeFile: activeWorkspace?.activeFile ?? null,
      activeFileContent: activeWorkspace?.activeFileContent ?? null,
      isIndexing: activeWorkspace?.isIndexing ?? false,
      isReadingFile: activeWorkspace?.isReadingFile ?? false,
      readFileError: activeWorkspace?.readFileError ?? null,
      previewUnavailableReason: activeWorkspace?.previewUnavailableReason ?? null,
      selectionRange: activeWorkspace?.selectionRange ?? null,
      expandedDirectories: activeWorkspace?.expandedDirectories ?? [],
      bannerMessage,
      openWorkspace,
      setActiveWorkspace,
      closeWorkspace,
      selectFile,
      setSelectionRange,
      setExpandedDirectories,
      clearBanner,
    }),
    [
      workspaceState,
      activeWorkspace,
      bannerMessage,
      openWorkspace,
      setActiveWorkspace,
      closeWorkspace,
      selectFile,
      setSelectionRange,
      setExpandedDirectories,
      clearBanner,
    ],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export { WorkspaceContext }
