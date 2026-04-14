import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import {
  markWorkspaceDocumentConflict,
  setDirty,
  updateWorkspaceSession,
  type WorkspaceId,
  type WorkspaceSession,
  type WorkspaceState,
} from './workspace-model'
import { collectStructureRefreshTargets, type ExpandedDirectoryHydrationTarget } from './workspace-tree-state'

type SetWorkspaceState = Dispatch<SetStateAction<WorkspaceState>>
type WorkspaceStateRef = MutableRefObject<WorkspaceState>

function normalizeWatchRelativePath(relativePath: string): string | null {
  const normalized = relativePath.trim().replace(/\\/g, '/')
  if (!normalized || normalized === '.' || normalized.startsWith('../')) {
    return null
  }
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    return null
  }

  const withoutLeadingCurrent = normalized.replace(/^\.\//, '')
  const withoutDuplicateSlashes = withoutLeadingCurrent.replace(/\/{2,}/g, '/')
  if (!withoutDuplicateSlashes) {
    return null
  }
  return withoutDuplicateSlashes
}

function buildSavedFileRefreshSuppressionKey(
  workspaceId: WorkspaceId,
  relativePath: string,
) {
  return `${workspaceId}::${relativePath}`
}

export function useWorkspaceWatcher(input: {
  activeWorkspaceId: WorkspaceId | null
  workspaceStateRef: WorkspaceStateRef
  setWorkspaceState: SetWorkspaceState
  watchedWorkspaceIdsRef: MutableRefObject<Set<WorkspaceId>>
  savedFileRefreshSuppressionRef: MutableRefObject<Set<string>>
  setBannerMessage: Dispatch<SetStateAction<string | null>>
  setExternalChangeDetected: Dispatch<SetStateAction<boolean>>
  scheduleRemoteBannerAutoDismiss: (message: string) => void
  watchFallbackBannerMessage: string
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
  loadWorkspaceIndex: (
    workspaceId: WorkspaceId,
    rootPath: string,
    mode?: 'reset' | 'refresh',
  ) => Promise<'success' | 'failed' | 'stale'>
  loadWorkspaceGitFileStatuses: (
    workspaceId: WorkspaceId,
    rootPath: string,
  ) => Promise<void>
  hydrateExpandedDirectories: (
    workspaceId: WorkspaceId,
    targets: ExpandedDirectoryHydrationTarget[],
  ) => Promise<void>
  refreshActiveWorkspaceGitDecorations: (options?: { force?: boolean }) => void
  getWorkspaceIsDirtyCompatibility: (session: WorkspaceSession) => boolean
  syncWorkspaceDisplayedDocumentContent: (
    session: WorkspaceSession,
  ) => WorkspaceSession
}) {
  const {
    activeWorkspaceId,
    workspaceStateRef,
    setWorkspaceState,
    watchedWorkspaceIdsRef,
    savedFileRefreshSuppressionRef,
    setBannerMessage,
    setExternalChangeDetected,
    scheduleRemoteBannerAutoDismiss,
    watchFallbackBannerMessage,
    loadWorkspaceFile,
    loadWorkspaceSpec,
    loadWorkspaceIndex,
    loadWorkspaceGitFileStatuses,
    hydrateExpandedDirectories,
    refreshActiveWorkspaceGitDecorations,
    getWorkspaceIsDirtyCompatibility,
    syncWorkspaceDisplayedDocumentContent,
  } = input

  useEffect(() => {
    const watchedWorkspaceIds = watchedWorkspaceIdsRef.current
    const unsubscribe = window.workspace.onWatchEvent((watchEvent) => {
      const normalizedChangedRelativePaths = Array.from(
        new Set(
          watchEvent.changedRelativePaths
            .map((relativePath) => normalizeWatchRelativePath(relativePath))
            .filter((relativePath): relativePath is string => relativePath !== null),
        ),
      )
      const hasStructureChanges = watchEvent.hasStructureChanges === true
      if (
        !watchEvent.workspaceId ||
        (normalizedChangedRelativePaths.length === 0 && !hasStructureChanges)
      ) {
        return
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[watchEvent.workspaceId]
      const activeFile = workspaceSession?.activeFile ?? null
      const structureRefreshTargets =
        hasStructureChanges && workspaceSession
          ? collectStructureRefreshTargets(
              workspaceSession.fileTree,
              normalizedChangedRelativePaths,
            )
          : []
      const shouldRefreshActiveFile =
        activeFile !== null &&
        normalizedChangedRelativePaths.includes(activeFile)
      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, watchEvent.workspaceId, (currentSession) => {
          const nextChangedFilesSet = new Set(currentSession.changedFiles)
          let hasNewChangedPath = false
          for (const relativePath of normalizedChangedRelativePaths) {
            if (nextChangedFilesSet.has(relativePath)) {
              continue
            }
            nextChangedFilesSet.add(relativePath)
            hasNewChangedPath = true
          }
          if (!hasNewChangedPath) {
            return currentSession
          }
          return {
            ...currentSession,
            changedFiles: Array.from(nextChangedFilesSet),
          }
        }),
      )

      if (shouldRefreshActiveFile && activeFile !== null) {
        const suppressionKey = buildSavedFileRefreshSuppressionKey(
          watchEvent.workspaceId,
          activeFile,
        )
        const shouldSuppress = savedFileRefreshSuppressionRef.current.has(suppressionKey)
        if (shouldSuppress) {
          savedFileRefreshSuppressionRef.current.delete(suppressionKey)
        } else {
          setWorkspaceState((previous) => {
            const currentSession =
              previous.workspacesById[watchEvent.workspaceId]
            if (!currentSession || currentSession.activeFile !== activeFile) {
              return previous
            }

            if (currentSession.isDirty) {
              const conflictedSession = syncWorkspaceDisplayedDocumentContent(
                markWorkspaceDocumentConflict(currentSession, activeFile, null),
              )
              return updateWorkspaceSession(previous, watchEvent.workspaceId, () =>
                setDirty(
                  conflictedSession,
                  getWorkspaceIsDirtyCompatibility(conflictedSession),
                ),
              )
            }

            return previous
          })

          const latestSession =
            workspaceStateRef.current.workspacesById[watchEvent.workspaceId]
          const latestIsDirty = latestSession?.isDirty ?? false
          if (latestIsDirty) {
            setExternalChangeDetected(true)
          } else {
            loadWorkspaceFile(watchEvent.workspaceId, activeFile, 'refresh')
          }
        }
      }

      const activeSpec = workspaceSession?.activeSpec ?? null
      const shouldRefreshActiveSpec =
        activeSpec !== null &&
        normalizedChangedRelativePaths.includes(activeSpec)
      if (
        shouldRefreshActiveSpec &&
        activeSpec !== null &&
        activeSpec !== activeFile
      ) {
        loadWorkspaceSpec(watchEvent.workspaceId, activeSpec, 'refresh')
      }

      if (hasStructureChanges && workspaceSession) {
        if (structureRefreshTargets.length > 0) {
          void hydrateExpandedDirectories(
            watchEvent.workspaceId,
            structureRefreshTargets,
          )
        } else {
          void loadWorkspaceIndex(
            watchEvent.workspaceId,
            workspaceSession.rootPath,
            'refresh',
          )
        }
      }

      if (workspaceSession) {
        void loadWorkspaceGitFileStatuses(
          watchEvent.workspaceId,
          workspaceSession.rootPath,
        )
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
  }, [
    getWorkspaceIsDirtyCompatibility,
    hydrateExpandedDirectories,
    loadWorkspaceFile,
    loadWorkspaceGitFileStatuses,
    loadWorkspaceIndex,
    loadWorkspaceSpec,
    savedFileRefreshSuppressionRef,
    setExternalChangeDetected,
    setWorkspaceState,
    syncWorkspaceDisplayedDocumentContent,
    watchedWorkspaceIdsRef,
    workspaceStateRef,
  ])

  useEffect(() => {
    refreshActiveWorkspaceGitDecorations({
      force: true,
    })
  }, [activeWorkspaceId, refreshActiveWorkspaceGitDecorations])

  useEffect(() => {
    const handleWindowFocus = () => {
      refreshActiveWorkspaceGitDecorations()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }
      refreshActiveWorkspaceGitDecorations()
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshActiveWorkspaceGitDecorations])

  useEffect(() => {
    const unsubscribe = window.workspace.onWatchFallback((fallbackEvent) => {
      if (!fallbackEvent.workspaceId) {
        return
      }
      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, fallbackEvent.workspaceId, (currentSession) => ({
          ...currentSession,
          watchMode: fallbackEvent.watchMode,
          isRemoteMounted: currentSession.isRemoteMounted,
        })),
      )
      setBannerMessage((currentMessage) =>
        currentMessage ?? watchFallbackBannerMessage,
      )
      scheduleRemoteBannerAutoDismiss(watchFallbackBannerMessage)
    })
    return unsubscribe
  }, [
    scheduleRemoteBannerAutoDismiss,
    setBannerMessage,
    setWorkspaceState,
    watchFallbackBannerMessage,
  ])
}
