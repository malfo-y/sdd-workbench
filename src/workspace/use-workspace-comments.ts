import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { normalizeCodeComments } from '../code-comments/comment-persistence'
import { sortCodeComments, type CodeComment } from '../code-comments/comment-types'
import { executeTrackedIpcCall, isTrackedIpcCallCurrent, type WorkspaceRequestIdMapRef } from './ipc-call-helper'
import { updateWorkspaceSession, type WorkspaceId, type WorkspaceState } from './workspace-model'

type SetWorkspaceState = Dispatch<SetStateAction<WorkspaceState>>
type SetBannerMessage = Dispatch<SetStateAction<string | null>>

type WorkspaceStateRef = MutableRefObject<WorkspaceState>

export function useWorkspaceComments(input: {
  workspaceStateRef: WorkspaceStateRef
  setWorkspaceState: SetWorkspaceState
  setBannerMessage: SetBannerMessage
  readCommentsRequestIdByWorkspaceRef: WorkspaceRequestIdMapRef
  writeCommentsRequestIdByWorkspaceRef: WorkspaceRequestIdMapRef
  readGlobalCommentsRequestIdByWorkspaceRef: WorkspaceRequestIdMapRef
  writeGlobalCommentsRequestIdByWorkspaceRef: WorkspaceRequestIdMapRef
}) {
  const {
    workspaceStateRef,
    setWorkspaceState,
    setBannerMessage,
    readCommentsRequestIdByWorkspaceRef,
    writeCommentsRequestIdByWorkspaceRef,
    readGlobalCommentsRequestIdByWorkspaceRef,
    writeGlobalCommentsRequestIdByWorkspaceRef,
  } = input

  const loadWorkspaceComments = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string) => {
      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...currentSession,
          isReadingComments: true,
          commentsError: null,
        })),
      )

      try {
        const { requestId, result: readResult } = await executeTrackedIpcCall({
          requestIdByWorkspaceRef: readCommentsRequestIdByWorkspaceRef,
          workspaceId,
          call: () => window.workspace.readComments(rootPath),
        })
        if (
          !isTrackedIpcCallCurrent(
            readCommentsRequestIdByWorkspaceRef,
            workspaceId,
            requestId,
          )
        ) {
          return false
        }

        if (!readResult.ok) {
          const errorMessage = readResult.error
            ? `Failed to load comments: ${readResult.error}`
            : 'Failed to load comments.'
          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              isReadingComments: false,
              commentsError: errorMessage,
            })),
          )
          setBannerMessage(errorMessage)
          return false
        }

        const normalizedCommentsResult = normalizeCodeComments(readResult.comments)
        const warningMessages = [
          typeof readResult.error === 'string' && readResult.error.trim().length > 0
            ? readResult.error
            : null,
          normalizedCommentsResult.error,
        ].filter((warning): warning is string => Boolean(warning))
        const combinedWarning =
          warningMessages.length > 0 ? warningMessages.join(' ') : null
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            comments: normalizedCommentsResult.comments,
            isReadingComments: false,
            commentsError: combinedWarning,
          })),
        )
        if (combinedWarning) {
          setBannerMessage(
            `Comments loaded with warnings: ${combinedWarning}`,
          )
        }
        return true
      } catch (error) {
        const requestId =
          readCommentsRequestIdByWorkspaceRef.current[workspaceId] ?? 0
        if (
          !isTrackedIpcCallCurrent(
            readCommentsRequestIdByWorkspaceRef,
            workspaceId,
            requestId,
          )
        ) {
          return false
        }

        const errorMessage =
          error instanceof Error
            ? `Failed to load comments: ${error.message}`
            : 'Failed to load comments.'
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            isReadingComments: false,
            commentsError: errorMessage,
          })),
        )
        setBannerMessage(errorMessage)
        return false
      }
    },
    [
      readCommentsRequestIdByWorkspaceRef,
      setBannerMessage,
      setWorkspaceState,
    ],
  )

  const loadWorkspaceGlobalComments = useCallback(
    async (workspaceId: WorkspaceId, rootPath: string) => {
      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...currentSession,
          isReadingGlobalComments: true,
          globalCommentsError: null,
        })),
      )

      try {
        const { requestId, result: readResult } = await executeTrackedIpcCall({
          requestIdByWorkspaceRef: readGlobalCommentsRequestIdByWorkspaceRef,
          workspaceId,
          call: () => window.workspace.readGlobalComments(rootPath),
        })
        if (
          !isTrackedIpcCallCurrent(
            readGlobalCommentsRequestIdByWorkspaceRef,
            workspaceId,
            requestId,
          )
        ) {
          return false
        }

        if (!readResult.ok) {
          const errorMessage = readResult.error
            ? `Failed to load global comments: ${readResult.error}`
            : 'Failed to load global comments.'
          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
              ...currentSession,
              isReadingGlobalComments: false,
              globalCommentsError: errorMessage,
            })),
          )
          setBannerMessage(errorMessage)
          return false
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            globalComments: readResult.body,
            isReadingGlobalComments: false,
            globalCommentsError: null,
          })),
        )
        return true
      } catch (error) {
        const requestId =
          readGlobalCommentsRequestIdByWorkspaceRef.current[workspaceId] ?? 0
        if (
          !isTrackedIpcCallCurrent(
            readGlobalCommentsRequestIdByWorkspaceRef,
            workspaceId,
            requestId,
          )
        ) {
          return false
        }

        const errorMessage =
          error instanceof Error
            ? `Failed to load global comments: ${error.message}`
            : 'Failed to load global comments.'
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            isReadingGlobalComments: false,
            globalCommentsError: errorMessage,
          })),
        )
        setBannerMessage(errorMessage)
        return false
      }
    },
    [
      readGlobalCommentsRequestIdByWorkspaceRef,
      setBannerMessage,
      setWorkspaceState,
    ],
  )

  const saveComments = useCallback(async (nextComments: CodeComment[]) => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return false
    }

    const workspaceSession =
      workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return false
    }

    const sortedComments = sortCodeComments(nextComments)
    setWorkspaceState((previous) =>
      updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
        ...currentSession,
        isWritingComments: true,
        commentsError: null,
      })),
    )

    try {
      const { requestId, result: writeResult } = await executeTrackedIpcCall({
        requestIdByWorkspaceRef: writeCommentsRequestIdByWorkspaceRef,
        workspaceId: activeWorkspaceId,
        call: () =>
          window.workspace.writeComments(workspaceSession.rootPath, sortedComments),
      })
      if (
        !isTrackedIpcCallCurrent(
          writeCommentsRequestIdByWorkspaceRef,
          activeWorkspaceId,
          requestId,
        )
      ) {
        return false
      }

      if (!writeResult.ok) {
        const errorMessage = writeResult.error
          ? `Failed to save comments: ${writeResult.error}`
          : 'Failed to save comments.'
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
            ...currentSession,
            isWritingComments: false,
            commentsError: errorMessage,
          })),
        )
        setBannerMessage(errorMessage)
        return false
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
          ...currentSession,
          comments: sortedComments,
          isWritingComments: false,
          commentsError: null,
        })),
      )
      return true
    } catch (error) {
      const requestId =
        writeCommentsRequestIdByWorkspaceRef.current[activeWorkspaceId] ?? 0
      if (
        !isTrackedIpcCallCurrent(
          writeCommentsRequestIdByWorkspaceRef,
          activeWorkspaceId,
          requestId,
        )
      ) {
        return false
      }

      const errorMessage =
        error instanceof Error
          ? `Failed to save comments: ${error.message}`
          : 'Failed to save comments.'
      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
          ...currentSession,
          isWritingComments: false,
          commentsError: errorMessage,
        })),
      )
      setBannerMessage(errorMessage)
      return false
    }
  }, [
    setBannerMessage,
    setWorkspaceState,
    workspaceStateRef,
    writeCommentsRequestIdByWorkspaceRef,
  ])

  const saveGlobalComments = useCallback(
    async (body: string, workspaceId?: WorkspaceId) => {
      const targetWorkspaceId =
        workspaceId ?? workspaceStateRef.current.activeWorkspaceId
      if (!targetWorkspaceId) {
        return false
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[targetWorkspaceId]
      if (!workspaceSession) {
        return false
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, targetWorkspaceId, (currentSession) => ({
          ...currentSession,
          isWritingGlobalComments: true,
          globalCommentsError: null,
        })),
      )

      try {
        const { requestId, result: writeResult } = await executeTrackedIpcCall({
          requestIdByWorkspaceRef: writeGlobalCommentsRequestIdByWorkspaceRef,
          workspaceId: targetWorkspaceId,
          call: () =>
            window.workspace.writeGlobalComments(workspaceSession.rootPath, body),
        })
        if (
          !isTrackedIpcCallCurrent(
            writeGlobalCommentsRequestIdByWorkspaceRef,
            targetWorkspaceId,
            requestId,
          )
        ) {
          return false
        }

        if (!writeResult.ok) {
          const errorMessage = writeResult.error
            ? `Failed to save global comments: ${writeResult.error}`
            : 'Failed to save global comments.'
          setWorkspaceState((previous) =>
            updateWorkspaceSession(previous, targetWorkspaceId, (currentSession) => ({
              ...currentSession,
              isWritingGlobalComments: false,
              globalCommentsError: errorMessage,
            })),
          )
          setBannerMessage(errorMessage)
          return false
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, targetWorkspaceId, (currentSession) => ({
            ...currentSession,
            globalComments: body,
            isWritingGlobalComments: false,
            globalCommentsError: null,
          })),
        )
        return true
      } catch (error) {
        const requestId =
          writeGlobalCommentsRequestIdByWorkspaceRef.current[targetWorkspaceId] ?? 0
        if (
          !isTrackedIpcCallCurrent(
            writeGlobalCommentsRequestIdByWorkspaceRef,
            targetWorkspaceId,
            requestId,
          )
        ) {
          return false
        }

        const errorMessage =
          error instanceof Error
            ? `Failed to save global comments: ${error.message}`
            : 'Failed to save global comments.'
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, targetWorkspaceId, (currentSession) => ({
            ...currentSession,
            isWritingGlobalComments: false,
            globalCommentsError: errorMessage,
          })),
        )
        setBannerMessage(errorMessage)
        return false
      }
    },
    [
      setBannerMessage,
      setWorkspaceState,
      workspaceStateRef,
      writeGlobalCommentsRequestIdByWorkspaceRef,
    ],
  )

  const reloadComments = useCallback(async () => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession =
      workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return
    }

    await loadWorkspaceComments(activeWorkspaceId, workspaceSession.rootPath)
  }, [loadWorkspaceComments, workspaceStateRef])

  const reloadGlobalComments = useCallback(async () => {
    const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
    if (!activeWorkspaceId) {
      return
    }

    const workspaceSession =
      workspaceStateRef.current.workspacesById[activeWorkspaceId]
    if (!workspaceSession) {
      return
    }

    await loadWorkspaceGlobalComments(activeWorkspaceId, workspaceSession.rootPath)
  }, [loadWorkspaceGlobalComments, workspaceStateRef])

  return {
    loadWorkspaceComments,
    loadWorkspaceGlobalComments,
    reloadComments,
    reloadGlobalComments,
    saveComments,
    saveGlobalComments,
  }
}
