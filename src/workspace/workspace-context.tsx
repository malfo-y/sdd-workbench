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
  bannerMessage: string | null
  openWorkspace: () => Promise<void>
  setActiveWorkspace: (workspaceId: WorkspaceId) => void
  closeWorkspace: (workspaceId: WorkspaceId) => void
  selectFile: (relativePath: string) => void
  showBanner: (message: string) => void
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

function isMarkdownFile(relativePath: string) {
  return relativePath.toLowerCase().endsWith('.md')
}

function getSpecPreviewUnavailableMessage(
  reason: WorkspacePreviewUnavailableReason,
) {
  if (reason === 'file_too_large') {
    return 'Failed to render markdown preview: file exceeds 2MB limit.'
  }

  return 'Failed to render markdown preview: binary file detected.'
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

  const showBanner = useCallback((message: string) => {
    setBannerMessage(message)
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
        activeSpec: null,
        activeFileContent: null,
        activeSpecContent: null,
        isReadingFile: false,
        isReadingSpec: false,
        readFileError: null,
        activeSpecReadError: null,
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
    const selectingMarkdown = isMarkdownFile(relativePath)

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
        ...currentSession,
        activeFile: relativePath,
        activeSpec: selectingMarkdown ? relativePath : currentSession.activeSpec,
        activeFileContent: null,
        selectionRange: null,
        readFileError: null,
        previewUnavailableReason: null,
        isReadingFile: true,
        activeSpecContent: selectingMarkdown
          ? null
          : currentSession.activeSpecContent,
        activeSpecReadError: selectingMarkdown
          ? null
          : currentSession.activeSpecReadError,
        isReadingSpec: selectingMarkdown,
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
                activeSpecContent: selectingMarkdown
                  ? null
                  : currentSession.activeSpecContent,
                activeSpecReadError: selectingMarkdown
                  ? readResult.error
                    ? `Failed to read file: ${readResult.error}`
                    : 'Failed to read file.'
                  : currentSession.activeSpecReadError,
                isReadingSpec: selectingMarkdown
                  ? false
                  : currentSession.isReadingSpec,
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
                activeSpecContent: selectingMarkdown
                  ? null
                  : currentSession.activeSpecContent,
                activeSpecReadError: selectingMarkdown
                  ? getSpecPreviewUnavailableMessage(
                      readResult.previewUnavailableReason ?? 'binary_file',
                    )
                  : currentSession.activeSpecReadError,
                isReadingSpec: selectingMarkdown
                  ? false
                  : currentSession.isReadingSpec,
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
            activeSpecContent: selectingMarkdown
              ? readResult.content ?? ''
              : currentSession.activeSpecContent,
            activeSpecReadError: selectingMarkdown
              ? null
              : currentSession.activeSpecReadError,
            isReadingSpec: selectingMarkdown
              ? false
              : currentSession.isReadingSpec,
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
            activeSpecContent: selectingMarkdown
              ? null
              : currentSession.activeSpecContent,
            activeSpecReadError: selectingMarkdown
              ? error instanceof Error
                ? `Failed to read file: ${error.message}`
                : 'Failed to read file.'
              : currentSession.activeSpecReadError,
            isReadingSpec: selectingMarkdown
              ? false
              : currentSession.isReadingSpec,
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
      activeSpec: activeWorkspace?.activeSpec ?? null,
      activeFileContent: activeWorkspace?.activeFileContent ?? null,
      activeSpecContent: activeWorkspace?.activeSpecContent ?? null,
      isIndexing: activeWorkspace?.isIndexing ?? false,
      isReadingFile: activeWorkspace?.isReadingFile ?? false,
      isReadingSpec: activeWorkspace?.isReadingSpec ?? false,
      readFileError: activeWorkspace?.readFileError ?? null,
      activeSpecReadError: activeWorkspace?.activeSpecReadError ?? null,
      previewUnavailableReason: activeWorkspace?.previewUnavailableReason ?? null,
      selectionRange: activeWorkspace?.selectionRange ?? null,
      expandedDirectories: activeWorkspace?.expandedDirectories ?? [],
      bannerMessage,
      openWorkspace,
      setActiveWorkspace,
      closeWorkspace,
      selectFile,
      showBanner,
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
      showBanner,
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
