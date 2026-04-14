import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import {
  addOrFocusWorkspace,
  createEmptyWorkspaceState,
  setActiveWorkspace as setActiveWorkspaceInState,
  updateWorkspaceSession,
  type WorkspaceId,
  type WorkspaceRemoteProfile,
  type WorkspaceState,
  type WorkspaceWatchModePreference,
} from './workspace-model'
import {
  clearWorkspaceSessionSnapshot,
  createWorkspaceSessionSnapshot,
  loadWorkspaceSessionSnapshot,
  saveWorkspaceSessionSnapshot,
  type WorkspaceSessionSnapshot,
} from './workspace-persistence'
import {
  getLoadedChildCountForDirectory,
  isIgnorableDirectoryHydrationError,
  mergeDirectoryChildrenAtPath,
  reconcileWorkspaceSessionTreeState,
  type ExpandedDirectoryHydrationTarget,
} from './workspace-tree-state'

type SetWorkspaceState = Dispatch<SetStateAction<WorkspaceState>>
type SetBannerMessage = Dispatch<SetStateAction<string | null>>
type WorkspaceStateRef = MutableRefObject<WorkspaceState>
type WorkspaceIndexStatus = 'success' | 'failed' | 'stale'

function createWorkspaceStateFromSnapshot(
  snapshot: WorkspaceSessionSnapshot,
): WorkspaceState {
  let nextState = createEmptyWorkspaceState()

  for (const workspaceId of snapshot.workspaceOrder) {
    const persistedWorkspaceSession = snapshot.workspacesById[workspaceId]
    if (!persistedWorkspaceSession) {
      continue
    }

    const addResult = addOrFocusWorkspace(nextState, persistedWorkspaceSession.rootPath, {
      workspaceId,
      sessionOptions: {
        workspaceKind: persistedWorkspaceSession.workspaceKind,
        remoteWorkspaceId: persistedWorkspaceSession.remoteWorkspaceId,
        remoteProfile: persistedWorkspaceSession.remoteProfile,
        remoteConnectionState: persistedWorkspaceSession.remoteConnectionState,
        remoteErrorCode: persistedWorkspaceSession.remoteErrorCode,
      },
    })
    nextState = updateWorkspaceSession(
      addResult.state,
      addResult.workspaceId,
      (session) => ({
        ...session,
        activeFile: persistedWorkspaceSession.activeFile,
        activeSpec: persistedWorkspaceSession.activeSpec,
        expandedDirectories: persistedWorkspaceSession.expandedDirectories,
        fileLastLineByPath: persistedWorkspaceSession.fileLastLineByPath,
        watchModePreference: persistedWorkspaceSession.watchModePreference,
        workspaceKind: persistedWorkspaceSession.workspaceKind,
        remoteWorkspaceId: persistedWorkspaceSession.remoteWorkspaceId,
        remoteProfile: persistedWorkspaceSession.remoteProfile,
        remoteConnectionState: persistedWorkspaceSession.remoteConnectionState,
        remoteErrorCode: persistedWorkspaceSession.remoteErrorCode,
      }),
    )
  }

  if (
    snapshot.activeWorkspaceId !== null &&
    nextState.workspacesById[snapshot.activeWorkspaceId]
  ) {
    nextState = setActiveWorkspaceInState(nextState, snapshot.activeWorkspaceId)
  }

  return nextState
}

export function useWorkspaceSnapshot(input: {
  workspaceState: WorkspaceState
  workspaceStateRef: WorkspaceStateRef
  setWorkspaceState: SetWorkspaceState
  setBannerMessage: SetBannerMessage
  showBanner: (message: string) => void
  loadWorkspaceIndex: (
    workspaceId: WorkspaceId,
    rootPath: string,
    mode?: 'reset' | 'refresh',
  ) => Promise<WorkspaceIndexStatus>
  loadWorkspaceGitFileStatuses: (
    workspaceId: WorkspaceId,
    rootPath: string,
  ) => Promise<void>
  loadWorkspaceFile: (
    workspaceId: WorkspaceId,
    relativePath: string,
    mode?: 'select' | 'refresh',
    historyMode?: 'push' | 'preserve',
  ) => void
  loadWorkspaceSpec: (
    workspaceId: WorkspaceId,
    relativePath: string,
    mode?: 'select' | 'refresh',
  ) => void
  connectRemoteWorkspace: (profile: WorkspaceRemoteProfile) => Promise<boolean>
  handleRestoreFailure: (workspaceId: WorkspaceId) => void
  startWorkspaceWatch: (
    workspaceId: WorkspaceId,
    rootPath: string,
    options?: {
      forceRestart?: boolean
      watchModePreference?: WorkspaceWatchModePreference
    },
  ) => Promise<boolean>
  stopWorkspaceWatch: (workspaceId: WorkspaceId) => Promise<void>
}) {
  const {
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
  } = input

  const [hasHydratedSnapshot, setHasHydratedSnapshot] = useState(false)

  const loadWorkspaceDirectoryChildren = useCallback(
    async (
      workspaceId: WorkspaceId,
      relativePath: string,
      options?: {
        append?: boolean
        minimumChildCount?: number
        suppressIgnorableErrors?: boolean
      },
    ) => {
      const initialWorkspaceSession =
        workspaceStateRef.current.workspacesById[workspaceId]
      if (!initialWorkspaceSession) {
        return
      }

      if (initialWorkspaceSession.loadingDirectories.includes(relativePath)) {
        return
      }

      let appendChildren = options?.append === true
      let loadedChildCount = appendChildren
        ? getLoadedChildCountForDirectory(
            initialWorkspaceSession.fileTree,
            relativePath,
          )
        : 0
      const minimumChildCount = options?.minimumChildCount

      const maxLoadDirectoryIterations = 100
      let iterationCount = 0
      while (iterationCount++ < maxLoadDirectoryIterations) {
        const workspaceSession = workspaceStateRef.current.workspacesById[workspaceId]
        if (!workspaceSession) {
          return
        }

        if (workspaceSession.loadingDirectories.includes(relativePath)) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            loadingDirectories: currentSession.loadingDirectories.includes(
              relativePath,
            )
              ? currentSession.loadingDirectories
              : [...currentSession.loadingDirectories, relativePath],
          })),
        )

        try {
          const result = await window.workspace.indexDirectory(
            workspaceSession.rootPath,
            relativePath,
            {
              offset: appendChildren ? loadedChildCount : 0,
              limit: 500,
            },
          )

          if (!result.ok) {
            if (
              options?.suppressIgnorableErrors &&
              isIgnorableDirectoryHydrationError(result.error)
            ) {
              return
            }

            setBannerMessage(
              result.error
                ? `Failed to load directory: ${result.error}`
                : 'Failed to load directory.',
            )
            return
          }

          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => {
              const nextFileTree = mergeDirectoryChildrenAtPath(
                currentSession.fileTree,
                relativePath,
                result.children,
                result.childrenStatus,
                result.totalChildCount,
                { appendChildren },
              )
              return {
                ...reconcileWorkspaceSessionTreeState(
                  currentSession,
                  nextFileTree,
                ),
                loadingDirectories: currentSession.loadingDirectories.filter(
                  (dir) => dir !== relativePath,
                ),
              }
            }),
          )

          loadedChildCount =
            (appendChildren ? loadedChildCount : 0) + result.children.length
          const needsMoreChildren =
            minimumChildCount !== undefined &&
            loadedChildCount < minimumChildCount &&
            result.childrenStatus === 'partial'

          if (!needsMoreChildren) {
            return
          }

          appendChildren = true
        } catch (error) {
          if (
            options?.suppressIgnorableErrors &&
            error instanceof Error &&
            isIgnorableDirectoryHydrationError(error.message)
          ) {
            return
          }

          setBannerMessage(
            error instanceof Error
              ? `Failed to load directory: ${error.message}`
              : 'Failed to load directory.',
          )
          return
        } finally {
          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              loadingDirectories: currentSession.loadingDirectories.filter(
                (dir) => dir !== relativePath,
              ),
            })),
          )
        }
      }

      if (iterationCount > maxLoadDirectoryIterations) {
        console.warn(
          `loadWorkspaceDirectoryChildren: exceeded ${maxLoadDirectoryIterations} iterations for "${relativePath}"`,
        )
      }
    },
    [setBannerMessage, setWorkspaceState, workspaceStateRef],
  )

  const hydrateExpandedDirectories = useCallback(
    async (
      workspaceId: WorkspaceId,
      targets: ExpandedDirectoryHydrationTarget[],
    ) => {
      for (const target of targets) {
        await loadWorkspaceDirectoryChildren(workspaceId, target.relativePath, {
          minimumChildCount: target.minimumChildCount,
          suppressIgnorableErrors: true,
        })
      }
    },
    [loadWorkspaceDirectoryChildren],
  )

  const loadDirectoryChildren = useCallback(
    async (relativePath: string, options?: { append?: boolean }) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }

      await loadWorkspaceDirectoryChildren(activeWorkspaceId, relativePath, options)
    },
    [loadWorkspaceDirectoryChildren, workspaceStateRef],
  )

  const refreshFileTree = useCallback(async () => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession =
      workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return
    }

    const indexStatus = await loadWorkspaceIndex(
      activeWorkspaceId,
      workspaceSession.rootPath,
      'refresh',
    )
    if (indexStatus === 'success') {
      void loadWorkspaceGitFileStatuses(
        activeWorkspaceId,
        workspaceSession.rootPath,
      )
    }
  }, [loadWorkspaceGitFileStatuses, loadWorkspaceIndex, workspaceStateRef])

  useEffect(() => {
    let isDisposed = false

    const hydrateWorkspaceState = async () => {
      const snapshot = loadWorkspaceSessionSnapshot()
      if (!snapshot || isDisposed) {
        if (!isDisposed) {
          setHasHydratedSnapshot(true)
        }
        return
      }

      const hydratedWorkspaceState = createWorkspaceStateFromSnapshot(snapshot)
      workspaceStateRef.current = hydratedWorkspaceState
      setWorkspaceState(hydratedWorkspaceState)

      let failedRestoreCount = 0
      for (const workspaceId of hydratedWorkspaceState.workspaceOrder) {
        if (isDisposed) {
          return
        }

        const workspaceSession = workspaceStateRef.current.workspacesById[workspaceId]
        const persistedWorkspaceSession = snapshot.workspacesById[workspaceId]
        if (!workspaceSession || !persistedWorkspaceSession) {
          continue
        }

        if (workspaceSession.workspaceKind === 'remote') {
          const remoteProfile = workspaceSession.remoteProfile
          if (!remoteProfile) {
            setWorkspaceState((previous) =>
              updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                ...currentSession,
                remoteConnectionState: 'disconnected',
                remoteErrorCode: null,
              })),
            )
            continue
          }

          const reconnected = await connectRemoteWorkspace(remoteProfile)
          if (!reconnected) {
            setWorkspaceState((previous) =>
              updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                ...currentSession,
                remoteConnectionState: 'disconnected',
              })),
            )
            continue
          }

          if (persistedWorkspaceSession.activeFile) {
            loadWorkspaceFile(
              workspaceId,
              persistedWorkspaceSession.activeFile,
              'select',
              'push',
            )
          }

          if (
            persistedWorkspaceSession.activeSpec &&
            persistedWorkspaceSession.activeSpec !== persistedWorkspaceSession.activeFile
          ) {
            loadWorkspaceSpec(workspaceId, persistedWorkspaceSession.activeSpec)
          }
          continue
        }

        const watchStarted = await startWorkspaceWatch(
          workspaceId,
          workspaceSession.rootPath,
        )
        const indexStatus = await loadWorkspaceIndex(
          workspaceId,
          workspaceSession.rootPath,
          'refresh',
        )

        if (indexStatus === 'failed') {
          failedRestoreCount += 1
          if (watchStarted) {
            await stopWorkspaceWatch(workspaceId)
          }
          handleRestoreFailure(workspaceId)
          continue
        }

        if (indexStatus === 'success') {
          void loadWorkspaceGitFileStatuses(workspaceId, workspaceSession.rootPath)
        }

        if (persistedWorkspaceSession.activeFile) {
          loadWorkspaceFile(
            workspaceId,
            persistedWorkspaceSession.activeFile,
            'select',
            'push',
          )
        }

        if (
          persistedWorkspaceSession.activeSpec &&
          persistedWorkspaceSession.activeSpec !== persistedWorkspaceSession.activeFile
        ) {
          loadWorkspaceSpec(workspaceId, persistedWorkspaceSession.activeSpec)
        }
      }

      if (!isDisposed && failedRestoreCount > 0) {
        showBanner(
          `Some workspaces could not be restored (${failedRestoreCount}).`,
        )
      }

      if (!isDisposed) {
        setHasHydratedSnapshot(true)
      }
    }

    void hydrateWorkspaceState()

    return () => {
      isDisposed = true
    }
  }, [
    connectRemoteWorkspace,
    handleRestoreFailure,
    loadWorkspaceFile,
    loadWorkspaceGitFileStatuses,
    loadWorkspaceIndex,
    loadWorkspaceSpec,
    setWorkspaceState,
    showBanner,
    startWorkspaceWatch,
    stopWorkspaceWatch,
    workspaceStateRef,
  ])

  useEffect(() => {
    if (!hasHydratedSnapshot) {
      return
    }

    if (workspaceState.workspaceOrder.length === 0) {
      clearWorkspaceSessionSnapshot()
      return
    }

    const snapshot = createWorkspaceSessionSnapshot(workspaceState)
    saveWorkspaceSessionSnapshot(snapshot)
  }, [hasHydratedSnapshot, workspaceState])

  return {
    hasHydratedSnapshot,
    loadDirectoryChildren,
    refreshFileTree,
    hydrateExpandedDirectories,
  }
}
