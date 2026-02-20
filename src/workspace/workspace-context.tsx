import {
  createContext,
  useCallback,
  useEffect,
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
  changedFiles: string[]
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

function withoutChangedFileMarker(changedFiles: string[], relativePath: string) {
  if (!changedFiles.includes(relativePath)) {
    return changedFiles
  }
  return changedFiles.filter((path) => path !== relativePath)
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspaceState, setWorkspaceState] = useState(createEmptyWorkspaceState)
  const workspaceStateRef = useRef(workspaceState)
  workspaceStateRef.current = workspaceState

  const [bannerMessage, setBannerMessage] = useState<string | null>(null)
  const indexRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readFileRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const watchedWorkspaceIdsRef = useRef<Set<WorkspaceId>>(new Set())

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
        changedFiles: [],
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

  const startWorkspaceWatch = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string) => {
      if (watchedWorkspaceIdsRef.current.has(workspaceId)) {
        return true
      }

      try {
        const watchStartResult = await window.workspace.watchStart(
          workspaceId,
          rootPath,
        )
        if (!watchStartResult.ok) {
          setBannerMessage(
            watchStartResult.error
              ? `Failed to start watcher: ${watchStartResult.error}`
              : 'Failed to start watcher.',
          )
          return false
        }
        watchedWorkspaceIdsRef.current.add(workspaceId)
        return true
      } catch (error) {
        setBannerMessage(
          error instanceof Error
            ? `Failed to start watcher: ${error.message}`
            : 'Failed to start watcher.',
        )
        return false
      }
    },
    [],
  )

  const stopWorkspaceWatch = useCallback(async (workspaceId: WorkspaceId) => {
    watchedWorkspaceIdsRef.current.delete(workspaceId)
    try {
      await window.workspace.watchStop(workspaceId)
    } catch {
      // Watcher cleanup is best-effort because workspace close should always proceed.
    }
  }, [])

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

      await startWorkspaceWatch(selectedWorkspaceId, selectedPath)
      await loadWorkspaceIndex(selectedWorkspaceId, selectedPath)
    } catch (error) {
      setBannerMessage(
        error instanceof Error
          ? `Failed to open workspace: ${error.message}`
          : 'Failed to open workspace.',
      )
    }
  }, [loadWorkspaceIndex, startWorkspaceWatch])

  const setActiveWorkspace = useCallback((workspaceId: WorkspaceId) => {
    setWorkspaceState((previous) =>
      setActiveWorkspaceInState(previous, workspaceId),
    )
  }, [])

  const closeWorkspace = useCallback((workspaceId: WorkspaceId) => {
    delete indexRequestIdByWorkspaceRef.current[workspaceId]
    delete readFileRequestIdByWorkspaceRef.current[workspaceId]
    void stopWorkspaceWatch(workspaceId)
    setWorkspaceState((previous) => closeWorkspaceInState(previous, workspaceId))
  }, [stopWorkspaceWatch])

  const loadWorkspaceFile = useCallback(
    (
      workspaceId: WorkspaceId,
      relativePath: string,
      mode: 'select' | 'refresh',
    ) => {
      const workspaceSession = workspaceStateRef.current.workspacesById[workspaceId]
      if (!workspaceSession) {
        return
      }

      const requestId = (readFileRequestIdByWorkspaceRef.current[workspaceId] ?? 0) + 1
      readFileRequestIdByWorkspaceRef.current[workspaceId] = requestId
      const selectingMarkdown = isMarkdownFile(relativePath)
      const shouldUpdateSpec = selectingMarkdown && mode === 'select'
      const shouldRefreshSpec =
        selectingMarkdown && workspaceSession.activeSpec === relativePath

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => {
          const leavingActiveFile =
            mode === 'select' &&
            currentSession.activeFile !== null &&
            currentSession.activeFile !== relativePath
              ? currentSession.activeFile
              : null

          return {
            ...currentSession,
            changedFiles:
              leavingActiveFile === null
                ? currentSession.changedFiles
                : withoutChangedFileMarker(
                    currentSession.changedFiles,
                    leavingActiveFile,
                  ),
            activeFile: mode === 'select' ? relativePath : currentSession.activeFile,
            activeSpec: shouldUpdateSpec ? relativePath : currentSession.activeSpec,
            activeFileContent:
              mode === 'select' ? null : currentSession.activeFileContent,
            selectionRange:
              mode === 'select' ? null : currentSession.selectionRange,
            readFileError: null,
            previewUnavailableReason: null,
            isReadingFile: true,
            activeSpecContent:
              shouldUpdateSpec ? null : currentSession.activeSpecContent,
            activeSpecReadError:
              shouldUpdateSpec || shouldRefreshSpec
                ? null
                : currentSession.activeSpecReadError,
            isReadingSpec:
              shouldUpdateSpec || shouldRefreshSpec
                ? true
                : currentSession.isReadingSpec,
          }
        }),
      )

      void (async () => {
        try {
          const readResult = await window.workspace.readFile(
            workspaceSession.rootPath,
            relativePath,
          )
          if (readFileRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
            return
          }

          if (!readResult.ok) {
            setWorkspaceState((previous) =>
              updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                ...currentSession,
                readFileError: readResult.error
                  ? `Failed to read file: ${readResult.error}`
                  : 'Failed to read file.',
                isReadingFile: false,
                activeSpecContent:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? null
                    : currentSession.activeSpecContent,
                activeSpecReadError:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? readResult.error
                      ? `Failed to read file: ${readResult.error}`
                      : 'Failed to read file.'
                    : currentSession.activeSpecReadError,
                isReadingSpec:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? false
                    : currentSession.isReadingSpec,
              })),
            )
            return
          }

          if (readResult.previewUnavailableReason) {
            setWorkspaceState((previous) =>
              updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                ...currentSession,
                previewUnavailableReason: readResult.previewUnavailableReason ?? null,
                isReadingFile: false,
                activeSpecContent:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? null
                    : currentSession.activeSpecContent,
                activeSpecReadError:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? getSpecPreviewUnavailableMessage(
                        readResult.previewUnavailableReason ?? 'binary_file',
                      )
                    : currentSession.activeSpecReadError,
                isReadingSpec:
                  shouldUpdateSpec || shouldRefreshSpec
                    ? false
                    : currentSession.isReadingSpec,
              })),
            )
            return
          }

          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              activeFileContent: readResult.content ?? '',
              isReadingFile: false,
              activeSpecContent:
                shouldUpdateSpec || shouldRefreshSpec
                  ? readResult.content ?? ''
                  : currentSession.activeSpecContent,
              activeSpecReadError:
                shouldUpdateSpec || shouldRefreshSpec
                  ? null
                  : currentSession.activeSpecReadError,
              isReadingSpec:
                shouldUpdateSpec || shouldRefreshSpec
                  ? false
                  : currentSession.isReadingSpec,
            })),
          )
        } catch (error) {
          if (readFileRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
            return
          }

          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              readFileError:
                error instanceof Error
                  ? `Failed to read file: ${error.message}`
                  : 'Failed to read file.',
              isReadingFile: false,
              activeSpecContent:
                shouldUpdateSpec || shouldRefreshSpec
                  ? null
                  : currentSession.activeSpecContent,
              activeSpecReadError:
                shouldUpdateSpec || shouldRefreshSpec
                  ? error instanceof Error
                    ? `Failed to read file: ${error.message}`
                    : 'Failed to read file.'
                  : currentSession.activeSpecReadError,
              isReadingSpec:
                shouldUpdateSpec || shouldRefreshSpec
                  ? false
                  : currentSession.isReadingSpec,
            })),
          )
        }
      })()
    },
    [],
  )

  const selectFile = useCallback((relativePath: string) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }
    loadWorkspaceFile(activeWorkspaceId, relativePath, 'select')
  }, [loadWorkspaceFile])

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

  useEffect(() => {
    const watchedWorkspaceIds = watchedWorkspaceIdsRef.current
    const unsubscribe = window.workspace.onWatchEvent((watchEvent) => {
      if (!watchEvent.workspaceId || watchEvent.changedRelativePaths.length === 0) {
        return
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[watchEvent.workspaceId]
      const activeFile = workspaceSession?.activeFile ?? null
      const shouldRefreshActiveFile =
        activeFile !== null && watchEvent.changedRelativePaths.includes(activeFile)

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, watchEvent.workspaceId, (currentSession) => {
          const nextChangedFiles = Array.from(
            new Set([
              ...currentSession.changedFiles,
              ...watchEvent.changedRelativePaths,
            ]),
          )
          if (nextChangedFiles.length === currentSession.changedFiles.length) {
            return currentSession
          }
          return {
            ...currentSession,
            changedFiles: nextChangedFiles,
          }
        }),
      )

      if (shouldRefreshActiveFile && activeFile !== null) {
        loadWorkspaceFile(watchEvent.workspaceId, activeFile, 'refresh')
      }
    })

    return () => {
      unsubscribe()
      const watchedWorkspaceIdList = Array.from(watchedWorkspaceIds)
      watchedWorkspaceIds.clear()
      for (const workspaceId of watchedWorkspaceIdList) {
        void window.workspace.watchStop(workspaceId)
      }
    }
  }, [loadWorkspaceFile])

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
      changedFiles: activeWorkspace?.changedFiles ?? [],
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
