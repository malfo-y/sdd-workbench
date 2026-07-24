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
  loadWorkspaceSessionSnapshotWithDiagnostics,
  saveWorkspaceSessionSnapshot,
  type WorkspaceSessionSnapshot,
} from './workspace-persistence'
import type { TrackedAsyncActionStatus } from './ipc-call-helper'
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
type WorkspaceLoadStatus = TrackedAsyncActionStatus

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
    mode: 'select' | 'refresh',
    historyMode?: 'push' | 'preserve',
  ) => Promise<WorkspaceLoadStatus>
  loadWorkspaceSpec: (
    workspaceId: WorkspaceId,
    relativePath: string,
    mode?: 'select' | 'refresh',
  ) => Promise<WorkspaceLoadStatus>
  connectRemoteWorkspace: (profile: WorkspaceRemoteProfile) => Promise<boolean>
  ensureWorkspaceConnectionForUserAction: (
    workspaceId: WorkspaceId,
  ) => boolean | Promise<boolean>
  getWorkspaceDirectoryExpansionIntent: (
    workspaceId: WorkspaceId,
    relativePath: string,
  ) => boolean | null
  handleRestoreFailure: (workspaceId: WorkspaceId) => void
  startWorkspaceWatch: (
    workspaceId: WorkspaceId,
    rootPath: string,
    options?: {
      forceRestart?: boolean
      watchModePreference?: WorkspaceWatchModePreference
    },
  ) => Promise<boolean>
  stopWorkspaceWatch: (workspaceId: WorkspaceId) => Promise<boolean>
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
    ensureWorkspaceConnectionForUserAction,
    getWorkspaceDirectoryExpansionIntent,
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

      const connectionResult =
        ensureWorkspaceConnectionForUserAction(activeWorkspaceId)
      if (connectionResult !== true) {
        const expansionRequestedBeforeConnection =
          getWorkspaceDirectoryExpansionIntent(
            activeWorkspaceId,
            relativePath,
          ) ??
          (workspaceStateRef.current.workspacesById[
            activeWorkspaceId
          ]?.expandedDirectories.includes(relativePath) ??
            false)
        const hasUsableConnection = await connectionResult
        const latestExpansionIntent =
          getWorkspaceDirectoryExpansionIntent(
            activeWorkspaceId,
            relativePath,
          )
        if (
          !hasUsableConnection ||
          !(latestExpansionIntent ?? expansionRequestedBeforeConnection)
        ) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(
            previous,
            activeWorkspaceId,
            (currentSession) => ({
              ...currentSession,
              expandedDirectories: currentSession.expandedDirectories.includes(
                relativePath,
              )
                ? currentSession.expandedDirectories
                : [...currentSession.expandedDirectories, relativePath],
            }),
          ),
        )
      }

      await loadWorkspaceDirectoryChildren(activeWorkspaceId, relativePath, options)
    },
    [
      ensureWorkspaceConnectionForUserAction,
      getWorkspaceDirectoryExpansionIntent,
      loadWorkspaceDirectoryChildren,
      setWorkspaceState,
      workspaceStateRef,
    ],
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
      if (workspaceSession.activeFile) {
        void loadWorkspaceFile(
          activeWorkspaceId,
          workspaceSession.activeFile,
          'refresh',
          'preserve',
        )
      }
      if (
        workspaceSession.activeSpec &&
        workspaceSession.activeSpec !== workspaceSession.activeFile
      ) {
        void loadWorkspaceSpec(
          activeWorkspaceId,
          workspaceSession.activeSpec,
          'refresh',
        )
      }
    }
  }, [
    loadWorkspaceFile,
    loadWorkspaceGitFileStatuses,
    loadWorkspaceIndex,
    loadWorkspaceSpec,
    workspaceStateRef,
  ])

  useEffect(() => {
    let isDisposed = false

    const hydrateWorkspaceState = async () => {
      const { snapshot, error: snapshotLoadError } =
        loadWorkspaceSessionSnapshotWithDiagnostics()
      if (!snapshot || isDisposed) {
        if (!isDisposed && snapshotLoadError) {
          showBanner(snapshotLoadError)
        }
        if (!isDisposed) {
          setHasHydratedSnapshot(true)
        }
        return
      }

      const hydratedWorkspaceState = createWorkspaceStateFromSnapshot(snapshot)
      workspaceStateRef.current = hydratedWorkspaceState
      setWorkspaceState(hydratedWorkspaceState)

      const restoreResults = await Promise.allSettled(
        hydratedWorkspaceState.workspaceOrder.map(async (workspaceId) => {
          if (isDisposed) {
            return false
          }

          const workspaceSession =
            workspaceStateRef.current.workspacesById[workspaceId]
          const persistedWorkspaceSession = snapshot.workspacesById[workspaceId]
          if (!workspaceSession || !persistedWorkspaceSession) {
            return false
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
              return false
            }

            const reconnected = await connectRemoteWorkspace(remoteProfile)
            if (!reconnected) {
              setWorkspaceState((previous) =>
                updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
                  ...currentSession,
                  remoteConnectionState: 'disconnected',
                })),
              )
              return false
            }

            if (persistedWorkspaceSession.activeFile) {
              await loadWorkspaceFile(
                workspaceId,
                persistedWorkspaceSession.activeFile,
                'select',
                'push',
              )
            }

            if (
              persistedWorkspaceSession.activeSpec &&
              persistedWorkspaceSession.activeSpec !==
                persistedWorkspaceSession.activeFile
            ) {
              await loadWorkspaceSpec(
                workspaceId,
                persistedWorkspaceSession.activeSpec,
              )
            }
            return true
          }

          const [watchStarted, indexStatus] = await Promise.all([
            startWorkspaceWatch(workspaceId, workspaceSession.rootPath),
            loadWorkspaceIndex(workspaceId, workspaceSession.rootPath, 'refresh'),
          ])

          if (indexStatus === 'failed') {
            if (watchStarted) {
              await stopWorkspaceWatch(workspaceId)
            }
            handleRestoreFailure(workspaceId)
            return false
          }

          if (indexStatus === 'success') {
            void loadWorkspaceGitFileStatuses(workspaceId, workspaceSession.rootPath)
          }

          if (persistedWorkspaceSession.activeFile) {
            await loadWorkspaceFile(
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
            await loadWorkspaceSpec(
              workspaceId,
              persistedWorkspaceSession.activeSpec,
            )
          }

          return true
        }),
      )

      let failedRestoreCount = 0
      for (const [index, restoreResult] of restoreResults.entries()) {
        if (restoreResult.status === 'fulfilled' && restoreResult.value) {
          continue
        }

        const workspaceId = hydratedWorkspaceState.workspaceOrder[index]
        if (workspaceId) {
          failedRestoreCount += 1
        }

        if (restoreResult.status === 'rejected') {
          console.warn('Failed to restore workspace from snapshot.', restoreResult.reason)
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
