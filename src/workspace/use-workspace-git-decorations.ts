import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { executeTrackedIpcCall, isTrackedIpcCallCurrent, type WorkspaceRequestIdMapRef } from './ipc-call-helper'
import { updateWorkspaceSession, type WorkspaceId, type WorkspaceState } from './workspace-model'

type SetWorkspaceState = Dispatch<SetStateAction<WorkspaceState>>
type WorkspaceStateRef = MutableRefObject<WorkspaceState>

export function useWorkspaceGitDecorations(input: {
  workspaceStateRef: WorkspaceStateRef
  setWorkspaceState: SetWorkspaceState
  readGitLineMarkersRequestIdByWorkspaceRef: WorkspaceRequestIdMapRef
  readGitFileStatusesRequestIdByWorkspaceRef: WorkspaceRequestIdMapRef
  lastGitDecorationRefreshAtRef: MutableRefObject<number>
  gitDecorationRefreshDebounceMs: number
}) {
  const {
    workspaceStateRef,
    setWorkspaceState,
    readGitLineMarkersRequestIdByWorkspaceRef,
    readGitFileStatusesRequestIdByWorkspaceRef,
    lastGitDecorationRefreshAtRef,
    gitDecorationRefreshDebounceMs,
  } = input

  const loadWorkspaceGitLineMarkers = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string, relativePath: string) => {
      try {
        const { requestId, result: markerResult } = await executeTrackedIpcCall({
          requestIdByWorkspaceRef: readGitLineMarkersRequestIdByWorkspaceRef,
          workspaceId,
          call: () => window.workspace.getGitLineMarkers(rootPath, relativePath),
        })
        if (
          !isTrackedIpcCallCurrent(
            readGitLineMarkersRequestIdByWorkspaceRef,
            workspaceId,
            requestId,
          )
        ) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => {
            if (currentSession.activeFile !== relativePath) {
              return currentSession
            }

            return {
              ...currentSession,
              activeFileGitLineMarkers: markerResult.ok ? markerResult.markers : [],
            }
          }),
        )
      } catch {
        const requestId =
          readGitLineMarkersRequestIdByWorkspaceRef.current[workspaceId] ?? 0
        if (
          !isTrackedIpcCallCurrent(
            readGitLineMarkersRequestIdByWorkspaceRef,
            workspaceId,
            requestId,
          )
        ) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => {
            if (currentSession.activeFile !== relativePath) {
              return currentSession
            }

            return {
              ...currentSession,
              activeFileGitLineMarkers: [],
            }
          }),
        )
      }
    },
    [readGitLineMarkersRequestIdByWorkspaceRef, setWorkspaceState],
  )

  const loadWorkspaceGitFileStatuses = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string) => {
      try {
        const { requestId, result: statusResult } = await executeTrackedIpcCall({
          requestIdByWorkspaceRef: readGitFileStatusesRequestIdByWorkspaceRef,
          workspaceId,
          call: () => window.workspace.getGitFileStatuses(rootPath),
        })
        if (
          !isTrackedIpcCallCurrent(
            readGitFileStatusesRequestIdByWorkspaceRef,
            workspaceId,
            requestId,
          )
        ) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            gitFileStatuses: statusResult.ok ? statusResult.statuses : {},
          })),
        )
      } catch {
        const requestId =
          readGitFileStatusesRequestIdByWorkspaceRef.current[workspaceId] ?? 0
        if (
          !isTrackedIpcCallCurrent(
            readGitFileStatusesRequestIdByWorkspaceRef,
            workspaceId,
            requestId,
          )
        ) {
          return
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            gitFileStatuses: {},
          })),
        )
      }
    },
    [readGitFileStatusesRequestIdByWorkspaceRef, setWorkspaceState],
  )

  const refreshWorkspaceGitDecorations = useCallback(
    (workspaceId: WorkspaceId, rootPath: string, activeFile?: string | null) => {
      void loadWorkspaceGitFileStatuses(workspaceId, rootPath)
      if (activeFile) {
        void loadWorkspaceGitLineMarkers(workspaceId, rootPath, activeFile)
      }
    },
    [loadWorkspaceGitFileStatuses, loadWorkspaceGitLineMarkers],
  )

  const refreshActiveWorkspaceGitDecorations = useCallback(
    (options?: { force?: boolean }) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[activeWorkspaceId]
      if (!workspaceSession) {
        return
      }

      const now = Date.now()
      if (
        options?.force !== true &&
        now - lastGitDecorationRefreshAtRef.current <
          gitDecorationRefreshDebounceMs
      ) {
        return
      }

      lastGitDecorationRefreshAtRef.current = now
      refreshWorkspaceGitDecorations(
        activeWorkspaceId,
        workspaceSession.rootPath,
        workspaceSession.activeFile,
      )
    },
    [
      gitDecorationRefreshDebounceMs,
      lastGitDecorationRefreshAtRef,
      refreshWorkspaceGitDecorations,
      workspaceStateRef,
    ],
  )

  return {
    loadWorkspaceGitLineMarkers,
    loadWorkspaceGitFileStatuses,
    refreshWorkspaceGitDecorations,
    refreshActiveWorkspaceGitDecorations,
  }
}
