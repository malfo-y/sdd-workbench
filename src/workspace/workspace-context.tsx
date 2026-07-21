import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  canStepWorkspaceFileHistory,
  closeWorkspace as closeWorkspaceInState,
  createEmptyWorkspaceState,
  listWorkspaces,
  setWorkspaceSelectionRange as setWorkspaceSelectionRangeInModel,
  setActiveWorkspace as setActiveWorkspaceInState,
  switchActiveWorkspace as switchActiveWorkspaceInState,
  stepWorkspaceFileHistory,
  updateWorkspaceSession,
  type LineSelectionRange,
  type WorkspaceId,
} from './workspace-model'
import {
  getWorkspaceIndexTruncationMessage,
  getWorkspaceHasUnsavedChanges,
  syncWorkspaceDisplayedDocumentContent,
} from './workspace-context-helpers'
import {
  type WorkspaceContextActions,
  type WorkspaceContextRemote,
  type WorkspaceContextState,
  type WorkspaceContextValue,
  type WorkspaceProviderProps,
} from './workspace-context-types'
import { useWorkspaceComments } from './use-workspace-comments'
import { useWorkspaceFileOperations } from './use-workspace-file-operations'
import { useWorkspaceGitDecorations } from './use-workspace-git-decorations'
import { useWorkspaceRemote } from './use-workspace-remote'
import { useWorkspaceSnapshot } from './use-workspace-snapshot'
import { useWorkspaceWatcher } from './use-workspace-watcher'
import {
  collectExpandedDirectoryHydrationTargets,
  preserveExpandedDirectoryChildren,
  reconcileWorkspaceSessionTreeState,
  type ExpandedDirectoryHydrationTarget,
} from './workspace-tree-state'
const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined,
)

type WorkspaceIndexStatus = 'success' | 'failed' | 'stale'
const WORKSPACE_INDEX_NODE_CAP = 100_000
const GIT_DECORATION_REFRESH_DEBOUNCE_MS = 250
const WATCH_FALLBACK_BANNER_MESSAGE =
  'Native watcher is unavailable for this workspace. Fallback to polling watcher is active.'

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspaceState, setWorkspaceState] = useState(createEmptyWorkspaceState)
  const workspaceStateRef = useRef(workspaceState)
  workspaceStateRef.current = workspaceState
  const hydrateExpandedDirectoriesRef = useRef<
    (
      workspaceId: WorkspaceId,
      targets: ExpandedDirectoryHydrationTarget[],
    ) => Promise<void>
  >(async () => {})

  const [bannerMessage, setBannerMessage] = useState<string | null>(null)
  const [externalChangeDetected, setExternalChangeDetected] = useState(false)
  const indexRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readFileRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readGitLineMarkersRequestIdByWorkspaceRef = useRef<
    Record<WorkspaceId, number>
  >({})
  const readGitFileStatusesRequestIdByWorkspaceRef = useRef<
    Record<WorkspaceId, number>
  >({})
  const readSpecRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>({})
  const readCommentsRequestIdByWorkspaceRef = useRef<Record<WorkspaceId, number>>(
    {},
  )
  const writeCommentsRequestIdByWorkspaceRef = useRef<
    Record<WorkspaceId, number>
  >({})
  const readGlobalCommentsRequestIdByWorkspaceRef = useRef<
    Record<WorkspaceId, number>
  >({})
  const writeGlobalCommentsRequestIdByWorkspaceRef = useRef<
    Record<WorkspaceId, number>
  >({})
  const watchedWorkspaceIdsRef = useRef<Set<WorkspaceId>>(new Set())
  const savedFileRefreshSuppressionRef = useRef<Set<string>>(new Set())

  const loadWorkspaceIndex = useCallback(
    async (
      workspaceId: WorkspaceId,
      rootPath: string,
      mode: 'reset' | 'refresh' = 'reset',
    ): Promise<WorkspaceIndexStatus> => {
      const requestId =
        (indexRequestIdByWorkspaceRef.current[workspaceId] ?? 0) + 1
      indexRequestIdByWorkspaceRef.current[workspaceId] = requestId

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...(mode === 'reset'
            ? {
                ...currentSession,
                isIndexing: true,
                fileTree: [],
                changedFiles: [],
                activeFile: null,
                activeSpec: null,
                activeFileContent: null,
                activeFileImagePreview: null,
                activeFileGitLineMarkers: [],
                gitFileStatuses: {},
                activeSpecContent: null,
                isReadingFile: false,
                isReadingSpec: false,
                readFileError: null,
                activeSpecReadError: null,
                previewUnavailableReason: null,
                selectionRange: null,
                expandedDirectories: [],
              }
            : currentSession),
        })),
      )

      try {
        const indexResult = await window.workspace.index(rootPath)
        if (indexRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
          return 'stale'
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
          return 'failed'
        }

        // Read the latest session snapshot after the async index call resolves so
        // refresh logic does not depend on the render that scheduled the request.
        const refreshBaselineSession =
          mode === 'refresh'
            ? workspaceStateRef.current.workspacesById[workspaceId]
            : null
        const nextFileTree =
          refreshBaselineSession
            ? preserveExpandedDirectoryChildren(
                indexResult.fileTree,
                refreshBaselineSession.fileTree,
                refreshBaselineSession.expandedDirectories,
              )
            : indexResult.fileTree
        const expandedDirectoryHydrationTargets =
          refreshBaselineSession
            ? collectExpandedDirectoryHydrationTargets(
                refreshBaselineSession.fileTree,
                indexResult.fileTree,
                refreshBaselineSession.expandedDirectories,
              )
            : []
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => {
            if (mode === 'reset') {
              return {
                ...currentSession,
                fileTree: nextFileTree,
                isIndexing: false,
              }
            }

            return {
              ...reconcileWorkspaceSessionTreeState(
                currentSession,
                nextFileTree,
              ),
              isIndexing: false,
            }
          }),
        )
        if (expandedDirectoryHydrationTargets.length > 0) {
          void hydrateExpandedDirectoriesRef.current(
            workspaceId,
            expandedDirectoryHydrationTargets,
          )
        }
        if (indexResult.truncated) {
          setBannerMessage(
            getWorkspaceIndexTruncationMessage(WORKSPACE_INDEX_NODE_CAP),
          )
        }
        return 'success'
      } catch (error) {
        if (indexRequestIdByWorkspaceRef.current[workspaceId] !== requestId) {
          return 'stale'
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
        return 'failed'
      }
    },
    [setBannerMessage, setWorkspaceState, workspaceStateRef],
  )

  const lastGitDecorationRefreshAtRef = useRef(0)
  const {
    loadWorkspaceGitLineMarkers,
    loadWorkspaceGitFileStatuses,
    refreshWorkspaceGitDecorations,
    refreshActiveWorkspaceGitDecorations,
  } = useWorkspaceGitDecorations({
    workspaceStateRef,
    setWorkspaceState,
    readGitLineMarkersRequestIdByWorkspaceRef,
    readGitFileStatusesRequestIdByWorkspaceRef,
    lastGitDecorationRefreshAtRef,
    gitDecorationRefreshDebounceMs: GIT_DECORATION_REFRESH_DEBOUNCE_MS,
  })

  const {
    loadWorkspaceComments,
    loadWorkspaceGlobalComments,
    reloadComments,
    reloadGlobalComments,
    saveComments,
    saveGlobalComments,
  } = useWorkspaceComments({
    workspaceStateRef,
    setWorkspaceState,
    setBannerMessage,
    readCommentsRequestIdByWorkspaceRef,
    writeCommentsRequestIdByWorkspaceRef,
    readGlobalCommentsRequestIdByWorkspaceRef,
    writeGlobalCommentsRequestIdByWorkspaceRef,
  })

  const {
    startWorkspaceWatch,
    stopWorkspaceWatch,
    clearBanner,
    showBanner,
    scheduleRemoteBannerAutoDismiss,
    openWorkspace,
    connectRemoteWorkspace,
    disconnectRemoteWorkspace,
    retryRemoteWorkspaceConnection,
    setWatchModePreference,
  } = useWorkspaceRemote({
    workspaceStateRef,
    setWorkspaceState,
    setBannerMessage,
    watchedWorkspaceIdsRef,
    loadWorkspaceIndex,
    loadWorkspaceGitFileStatuses,
  })

  const getActiveIsDirty = useCallback(() => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    const session = activeWorkspaceId
      ? workspaceStateRef.current.workspacesById[activeWorkspaceId]
      : null
    return session ? getWorkspaceHasUnsavedChanges(session) : false
  }, [])

  const setActiveWorkspace = useCallback((workspaceId: WorkspaceId) => {
    if (
      getActiveIsDirty() &&
      !window.confirm('Unsaved changes will be lost. Continue?')
    ) {
      return
    }
    setWorkspaceState((previous) =>
      setActiveWorkspaceInState(previous, workspaceId),
    )
  }, [getActiveIsDirty])

  const switchWorkspace = useCallback((workspaceId: WorkspaceId) => {
    if (
      getActiveIsDirty() &&
      !window.confirm('Unsaved changes will be lost. Continue?')
    ) {
      return
    }
    setWorkspaceState((previous) =>
      switchActiveWorkspaceInState(previous, workspaceId),
    )
  }, [getActiveIsDirty])

  const clearWorkspaceRequestState = useCallback((workspaceId: WorkspaceId) => {
    delete indexRequestIdByWorkspaceRef.current[workspaceId]
    delete readFileRequestIdByWorkspaceRef.current[workspaceId]
    delete readGitFileStatusesRequestIdByWorkspaceRef.current[workspaceId]
    delete readGitLineMarkersRequestIdByWorkspaceRef.current[workspaceId]
    delete readSpecRequestIdByWorkspaceRef.current[workspaceId]
    delete readCommentsRequestIdByWorkspaceRef.current[workspaceId]
    delete writeCommentsRequestIdByWorkspaceRef.current[workspaceId]
    delete readGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId]
    delete writeGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId]
    savedFileRefreshSuppressionRef.current.forEach((entryKey) => {
      if (entryKey.startsWith(`${workspaceId}::`)) {
        savedFileRefreshSuppressionRef.current.delete(entryKey)
      }
    })
  }, [
    indexRequestIdByWorkspaceRef,
    readCommentsRequestIdByWorkspaceRef,
    readFileRequestIdByWorkspaceRef,
    readGitFileStatusesRequestIdByWorkspaceRef,
    readGitLineMarkersRequestIdByWorkspaceRef,
    readGlobalCommentsRequestIdByWorkspaceRef,
    readSpecRequestIdByWorkspaceRef,
    savedFileRefreshSuppressionRef,
    writeCommentsRequestIdByWorkspaceRef,
    writeGlobalCommentsRequestIdByWorkspaceRef,
  ])

  const closeWorkspace = useCallback(async (workspaceId: WorkspaceId) => {
    if (
      getActiveIsDirty() &&
      !window.confirm('Unsaved changes will be lost. Continue?')
    ) {
      return
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[workspaceId]
    if (workspaceSession?.workspaceKind === 'remote') {
      await disconnectRemoteWorkspace(workspaceId)
    } else {
      await stopWorkspaceWatch(workspaceId)
    }
    clearWorkspaceRequestState(workspaceId)
    setWorkspaceState((previous) => closeWorkspaceInState(previous, workspaceId))
  }, [
    clearWorkspaceRequestState,
    disconnectRemoteWorkspace,
    getActiveIsDirty,
    setWorkspaceState,
    stopWorkspaceWatch,
    workspaceStateRef,
  ])

  const {
    loadWorkspaceSpec,
    loadWorkspaceFile,
    saveFile,
    reloadExternalChange,
    dismissExternalChange,
    markFileDirty,
    createFile,
    createDirectory,
    deleteFile,
    deleteDirectory,
    renameFileOrDirectory,
  } = useWorkspaceFileOperations({
    workspaceStateRef,
    setWorkspaceState,
    setBannerMessage,
    setExternalChangeDetected,
    savedFileRefreshSuppressionRef,
    readFileRequestIdByWorkspaceRef,
    readSpecRequestIdByWorkspaceRef,
    loadWorkspaceGitLineMarkers,
    refreshWorkspaceGitDecorations,
    loadWorkspaceIndex,
    loadWorkspaceGitFileStatuses,
  })

  const selectActiveWorkspaceFile = useCallback(
    (relativePath: string, historyMode: 'push' | 'preserve') => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }
      loadWorkspaceFile(activeWorkspaceId, relativePath, 'select', historyMode)
    },
    [loadWorkspaceFile],
  )

  const selectFile = useCallback(
    (relativePath: string) => {
      if (
        getActiveIsDirty() &&
        !window.confirm('Unsaved changes will be lost. Continue?')
      ) {
        return
      }
      selectActiveWorkspaceFile(relativePath, 'push')
    },
    [getActiveIsDirty, selectActiveWorkspaceFile],
  )

  const handleRestoreFailure = useCallback((workspaceId: WorkspaceId) => {
    delete indexRequestIdByWorkspaceRef.current[workspaceId]
    delete readFileRequestIdByWorkspaceRef.current[workspaceId]
    delete readGitLineMarkersRequestIdByWorkspaceRef.current[workspaceId]
    delete readGitFileStatusesRequestIdByWorkspaceRef.current[workspaceId]
    delete readSpecRequestIdByWorkspaceRef.current[workspaceId]
    delete readGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId]
    delete writeGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId]
    setWorkspaceState((previous) => closeWorkspaceInState(previous, workspaceId))
  }, [])

  const { loadDirectoryChildren, refreshFileTree, hydrateExpandedDirectories } =
    useWorkspaceSnapshot({
      workspaceState,
      workspaceStateRef,
      setWorkspaceState,
      setBannerMessage,
      showBanner,
      loadWorkspaceIndex,
      loadWorkspaceGitFileStatuses,
      loadWorkspaceFile,
      loadWorkspaceSpec,
      connectRemoteWorkspace,
      handleRestoreFailure,
      startWorkspaceWatch,
      stopWorkspaceWatch,
    })
  hydrateExpandedDirectoriesRef.current = hydrateExpandedDirectories

  const goBackInHistory = useCallback(() => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return
    }

    const backStepResult = stepWorkspaceFileHistory(workspaceSession, 'back')
    if (!backStepResult.targetRelativePath) {
      return
    }

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
        stepWorkspaceFileHistory(currentSession, 'back').nextSession,
      ),
    )
    loadWorkspaceFile(
      activeWorkspaceId,
      backStepResult.targetRelativePath,
      'select',
      'preserve',
    )
  }, [loadWorkspaceFile])

  const goForwardInHistory = useCallback(() => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession = workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return
    }

    const forwardStepResult = stepWorkspaceFileHistory(workspaceSession, 'forward')
    if (!forwardStepResult.targetRelativePath) {
      return
    }

    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
        stepWorkspaceFileHistory(currentSession, 'forward').nextSession,
      ),
    )
    loadWorkspaceFile(
      activeWorkspaceId,
      forwardStepResult.targetRelativePath,
      'select',
      'preserve',
    )
  }, [loadWorkspaceFile])

  const setSelectionRange = useCallback(
    (selectionRange: LineSelectionRange | null) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) =>
          setWorkspaceSelectionRangeInModel(currentSession, selectionRange),
        ),
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

  const searchFiles = useCallback(
    async (query: string): Promise<WorkspaceSearchFilesResult> => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return {
          ok: false,
          results: [],
          truncated: false,
          skippedLargeDirectoryCount: 0,
          skippedUnreadablePathCount: 0,
          depthLimitHit: false,
          timedOut: false,
          error: 'No active workspace selected.',
        }
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[activeWorkspaceId]
      if (!workspaceSession) {
        return {
          ok: false,
          results: [],
          truncated: false,
          skippedLargeDirectoryCount: 0,
          skippedUnreadablePathCount: 0,
          depthLimitHit: false,
          timedOut: false,
          error: 'Active workspace is unavailable.',
        }
      }

      try {
        return await window.workspace.searchFiles(
          workspaceSession.rootPath,
          query,
          {
            maxDepth: 20,
            maxResults: 200,
            maxDirectoryChildren: 10_000,
            timeBudgetMs: 2_000,
          },
        )
      } catch (error) {
        return {
          ok: false,
          results: [],
          truncated: false,
          skippedLargeDirectoryCount: 0,
          skippedUnreadablePathCount: 0,
          depthLimitHit: false,
          timedOut: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to search files.',
        }
      }
    },
    [],
  )

  const searchText = useCallback(
    async (query: string): Promise<WorkspaceSearchTextResult> => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      const errorResult = (error: string): WorkspaceSearchTextResult => ({
        ok: false,
        results: [],
        truncated: false,
        skippedLargeDirectoryCount: 0,
        skippedLargeFileCount: 0,
        skippedBinaryFileCount: 0,
        skippedUnreadablePathCount: 0,
        depthLimitHit: false,
        timedOut: false,
        error,
      })

      if (!activeWorkspaceId) {
        return errorResult('No active workspace selected.')
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[activeWorkspaceId]
      if (!workspaceSession) {
        return errorResult('Active workspace is unavailable.')
      }

      try {
        return await window.workspace.searchText(workspaceSession.rootPath, query)
      } catch (error) {
        return errorResult(
          error instanceof Error
            ? error.message
            : 'Failed to search text.',
        )
      }
    },
    [],
  )

  useWorkspaceWatcher({
    activeWorkspaceId: workspaceState.activeWorkspaceId,
    workspaceStateRef,
    setWorkspaceState,
    watchedWorkspaceIdsRef,
    savedFileRefreshSuppressionRef,
    setBannerMessage,
    setExternalChangeDetected,
    scheduleRemoteBannerAutoDismiss,
    watchFallbackBannerMessage: WATCH_FALLBACK_BANNER_MESSAGE,
    loadWorkspaceFile,
    loadWorkspaceSpec,
    loadWorkspaceIndex,
    loadWorkspaceGitFileStatuses,
    hydrateExpandedDirectories,
    refreshActiveWorkspaceGitDecorations,
    getWorkspaceIsDirtyCompatibility: getWorkspaceHasUnsavedChanges,
    syncWorkspaceDisplayedDocumentContent,
  })

  const activeWorkspace = workspaceState.activeWorkspaceId
    ? workspaceState.workspacesById[workspaceState.activeWorkspaceId] ?? null
    : null
  const activeWorkspaceRootPath = activeWorkspace?.rootPath ?? null

  useEffect(() => {
    const activeWorkspaceId = workspaceState.activeWorkspaceId
    if (!activeWorkspaceId || !activeWorkspaceRootPath) {
      return
    }
    if (
      activeWorkspace?.workspaceKind === 'remote' &&
      activeWorkspace.remoteConnectionState !== 'connected' &&
      activeWorkspace.remoteConnectionState !== 'degraded'
    ) {
      return
    }

    void loadWorkspaceComments(activeWorkspaceId, activeWorkspaceRootPath)
    void loadWorkspaceGlobalComments(activeWorkspaceId, activeWorkspaceRootPath)
  }, [
    activeWorkspaceRootPath,
    activeWorkspace?.remoteConnectionState,
    activeWorkspace?.workspaceKind,
    loadWorkspaceComments,
    loadWorkspaceGlobalComments,
    workspaceState.activeWorkspaceId,
  ])

  const canGoBack = activeWorkspace
    ? canStepWorkspaceFileHistory(activeWorkspace, 'back')
    : false
  const canGoForward = activeWorkspace
    ? canStepWorkspaceFileHistory(activeWorkspace, 'forward')
    : false

  const value = useMemo(
    () => {
      const state: WorkspaceContextState = {
        workspaceOrder: workspaceState.workspaceOrder,
        workspaces: listWorkspaces(workspaceState),
        activeWorkspaceId: workspaceState.activeWorkspaceId,
        rootPath: activeWorkspace?.rootPath ?? null,
        workspaceKind: activeWorkspace?.workspaceKind ?? null,
        remoteProfile: activeWorkspace?.remoteProfile ?? null,
        remoteConnectionState: activeWorkspace?.remoteConnectionState ?? null,
        remoteErrorCode: activeWorkspace?.remoteErrorCode ?? null,
        fileTree: activeWorkspace?.fileTree ?? [],
        changedFiles: activeWorkspace?.changedFiles ?? [],
        gitFileStatuses: activeWorkspace?.gitFileStatuses ?? {},
        activeFile: activeWorkspace?.activeFile ?? null,
        activeSpec: activeWorkspace?.activeSpec ?? null,
        activeFileContent: activeWorkspace?.activeFileContent ?? null,
        activeFileImagePreview: activeWorkspace?.activeFileImagePreview ?? null,
        activeFileGitLineMarkers: activeWorkspace?.activeFileGitLineMarkers ?? [],
        activeSpecContent: activeWorkspace?.activeSpecContent ?? null,
        isIndexing: activeWorkspace?.isIndexing ?? false,
        isReadingFile: activeWorkspace?.isReadingFile ?? false,
        isReadingSpec: activeWorkspace?.isReadingSpec ?? false,
        readFileError: activeWorkspace?.readFileError ?? null,
        activeSpecReadError: activeWorkspace?.activeSpecReadError ?? null,
        previewUnavailableReason: activeWorkspace?.previewUnavailableReason ?? null,
        selectionRange: activeWorkspace?.selectionRange ?? null,
        expandedDirectories: activeWorkspace?.expandedDirectories ?? [],
        comments: activeWorkspace?.comments ?? [],
        isReadingComments: activeWorkspace?.isReadingComments ?? false,
        isWritingComments: activeWorkspace?.isWritingComments ?? false,
        commentsError: activeWorkspace?.commentsError ?? null,
        globalComments: activeWorkspace?.globalComments ?? '',
        isReadingGlobalComments: activeWorkspace?.isReadingGlobalComments ?? false,
        isWritingGlobalComments: activeWorkspace?.isWritingGlobalComments ?? false,
        globalCommentsError: activeWorkspace?.globalCommentsError ?? null,
        loadingDirectories: activeWorkspace?.loadingDirectories ?? [],
        watchModePreference: activeWorkspace?.watchModePreference ?? 'auto',
        watchMode: activeWorkspace?.watchMode ?? null,
        isRemoteMounted: activeWorkspace?.isRemoteMounted ?? false,
        isDirty: activeWorkspace?.isDirty ?? false,
        externalChangeDetected,
        bannerMessage,
      }
      const remote: WorkspaceContextRemote = {
        remoteProfile: activeWorkspace?.remoteProfile ?? null,
        remoteConnectionState: activeWorkspace?.remoteConnectionState ?? null,
        remoteErrorCode: activeWorkspace?.remoteErrorCode ?? null,
        watchModePreference: activeWorkspace?.watchModePreference ?? 'auto',
        watchMode: activeWorkspace?.watchMode ?? null,
        isRemoteMounted: activeWorkspace?.isRemoteMounted ?? false,
        connectRemoteWorkspace,
        disconnectRemoteWorkspace,
        retryRemoteWorkspaceConnection,
        setWatchModePreference,
      }
      const actions: WorkspaceContextActions = {
        openWorkspace,
        setActiveWorkspace,
        switchWorkspace,
        closeWorkspace,
        selectFile,
        canGoBack,
        canGoForward,
        goBackInHistory,
        goForwardInHistory,
        reloadComments,
        saveComments,
        reloadGlobalComments,
        saveGlobalComments,
        showBanner,
        saveFile,
        setSelectionRange,
        setExpandedDirectories,
        loadDirectoryChildren,
        refreshFileTree,
        searchFiles,
        searchText,
        clearBanner,
        reloadExternalChange,
        dismissExternalChange,
        markFileDirty,
        createFile,
        createDirectory,
        deleteFile,
        deleteDirectory,
        renameFileOrDirectory,
      }

      return {
        ...state,
        ...remote,
        ...actions,
        state,
        remote,
        actions,
      }
    },
    [
      workspaceState,
      activeWorkspace,
      bannerMessage,
      externalChangeDetected,
      connectRemoteWorkspace,
      disconnectRemoteWorkspace,
      retryRemoteWorkspaceConnection,
      openWorkspace,
      setActiveWorkspace,
      switchWorkspace,
      closeWorkspace,
      selectFile,
      canGoBack,
      canGoForward,
      goBackInHistory,
      goForwardInHistory,
      reloadComments,
      saveComments,
      reloadGlobalComments,
      saveGlobalComments,
      showBanner,
      saveFile,
      setSelectionRange,
      setExpandedDirectories,
      loadDirectoryChildren,
      refreshFileTree,
      searchFiles,
      searchText,
      setWatchModePreference,
      clearBanner,
      reloadExternalChange,
      dismissExternalChange,
      markFileDirty,
      createFile,
      createDirectory,
      deleteFile,
      deleteDirectory,
      renameFileOrDirectory,
    ],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export { WorkspaceContext }
