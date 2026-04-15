import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import {
  addOrFocusWorkspace,
  createWorkspaceId,
  updateWorkspaceSession,
  type WorkspaceId,
  type WorkspaceRemoteProfile,
  type WorkspaceState,
  type WorkspaceWatchModePreference,
} from './workspace-model'

type SetWorkspaceState = Dispatch<SetStateAction<WorkspaceState>>
type SetBannerMessage = Dispatch<SetStateAction<string | null>>
type WorkspaceStateRef = MutableRefObject<WorkspaceState>

const REMOTE_BANNER_AUTODISMISS_MS = 5_000
const WATCH_FALLBACK_BANNER_MESSAGE =
  'Native watcher is unavailable for this workspace. Fallback to polling watcher is active.'
const REMOTE_SENSITIVE_KEY_VALUE_PATTERN =
  /\b(password|passphrase|token|secret)\s*[:=]\s*([^\s,;]+)/gi
const REMOTE_HOME_SSH_PATH_PATTERN = /~\/\.ssh\/[^\s'":;,)]+/g
const REMOTE_ABSOLUTE_PATH_PATTERN =
  /(?:[A-Za-z]:\\|\/)(?:[^\\/\s'":]+[\\/])*[^\\/\s'":]*/g

function sanitizeRemoteBannerMessage(rawMessage: string): string {
  return rawMessage
    .replace(REMOTE_SENSITIVE_KEY_VALUE_PATTERN, (_input, key) => `${key}=[REDACTED]`)
    .replace(REMOTE_HOME_SSH_PATH_PATTERN, '[REDACTED_PATH]')
    .replace(REMOTE_ABSOLUTE_PATH_PATTERN, '[REDACTED_PATH]')
    .replace(/\s+/g, ' ')
    .trim()
}

function getRemoteConnectionErrorMessage(
  errorCode?: string,
  fallbackMessage?: string,
): string {
  if (errorCode === 'AUTH_FAILED') {
    return 'Remote connection failed (AUTH_FAILED). Check SSH credentials and permissions.'
  }
  if (errorCode === 'TIMEOUT') {
    return 'Remote connection timed out (TIMEOUT).'
  }
  if (errorCode === 'AGENT_PROTOCOL_MISMATCH') {
    return 'Remote agent protocol mismatch (AGENT_PROTOCOL_MISMATCH).'
  }
  if (errorCode === 'PATH_DENIED') {
    return 'Remote workspace path denied (PATH_DENIED).'
  }
  if (errorCode === 'BOOTSTRAP_FAILED') {
    if (fallbackMessage && fallbackMessage.trim().length > 0) {
      return `Remote agent bootstrap failed (BOOTSTRAP_FAILED). ${sanitizeRemoteBannerMessage(fallbackMessage)}`
    }
    return 'Remote agent bootstrap failed (BOOTSTRAP_FAILED). Check agent path/runtime prerequisites.'
  }
  if (fallbackMessage && fallbackMessage.trim().length > 0) {
    return sanitizeRemoteBannerMessage(fallbackMessage)
  }
  return 'Failed to connect remote workspace.'
}

export function useWorkspaceRemote(input: {
  workspaceStateRef: WorkspaceStateRef
  setWorkspaceState: SetWorkspaceState
  setBannerMessage: SetBannerMessage
  watchedWorkspaceIdsRef: MutableRefObject<Set<WorkspaceId>>
  loadWorkspaceIndex: (
    workspaceId: WorkspaceId,
    rootPath: string,
    mode?: 'reset' | 'refresh',
  ) => Promise<'success' | 'failed' | 'stale'>
  loadWorkspaceGitFileStatuses: (
    workspaceId: WorkspaceId,
    rootPath: string,
  ) => Promise<void>
}) {
  const {
    workspaceStateRef,
    setWorkspaceState,
    setBannerMessage,
    watchedWorkspaceIdsRef,
    loadWorkspaceIndex,
    loadWorkspaceGitFileStatuses,
  } = input
  const remoteBannerAutoDismissTimerRef = useRef<number | null>(null)

  const clearRemoteBannerAutoDismissTimer = useCallback(() => {
    if (remoteBannerAutoDismissTimerRef.current === null) {
      return
    }
    window.clearTimeout(remoteBannerAutoDismissTimerRef.current)
    remoteBannerAutoDismissTimerRef.current = null
  }, [])

  const scheduleRemoteBannerAutoDismiss = useCallback(
    (message: string) => {
      clearRemoteBannerAutoDismissTimer()
      remoteBannerAutoDismissTimerRef.current = window.setTimeout(() => {
        setBannerMessage((currentMessage) =>
          currentMessage === message ? null : currentMessage,
        )
        remoteBannerAutoDismissTimerRef.current = null
      }, REMOTE_BANNER_AUTODISMISS_MS)
    },
    [clearRemoteBannerAutoDismissTimer, setBannerMessage],
  )

  const clearBanner = useCallback(() => {
    clearRemoteBannerAutoDismissTimer()
    setBannerMessage(null)
  }, [clearRemoteBannerAutoDismissTimer, setBannerMessage])

  const showBanner = useCallback((message: string) => {
    clearRemoteBannerAutoDismissTimer()
    setBannerMessage(message)
  }, [clearRemoteBannerAutoDismissTimer, setBannerMessage])

  useEffect(
    () => () => {
      clearRemoteBannerAutoDismissTimer()
    },
    [clearRemoteBannerAutoDismissTimer],
  )

  const startWorkspaceWatch = useCallback(
    async (
      workspaceId: WorkspaceId,
      rootPath: string,
      options?: {
        forceRestart?: boolean
        watchModePreference?: WorkspaceWatchModePreference
      },
    ) => {
      const forceRestart = options?.forceRestart ?? false
      const existingWorkspaceSession =
        workspaceStateRef.current.workspacesById[workspaceId]
      const watchModePreference =
        options?.watchModePreference ??
        existingWorkspaceSession?.watchModePreference ??
        'auto'

      if (watchedWorkspaceIdsRef.current.has(workspaceId) && !forceRestart) {
        return true
      }

      if (forceRestart && watchedWorkspaceIdsRef.current.has(workspaceId)) {
        watchedWorkspaceIdsRef.current.delete(workspaceId)
        try {
          await window.workspace.watchStop(workspaceId)
        } catch {
          // Restart should still proceed even if previous watcher cleanup fails.
        }
      }

      try {
        const watchStartResult = await window.workspace.watchStart(
          workspaceId,
          rootPath,
          watchModePreference,
        )
        if (!watchStartResult.ok) {
          setBannerMessage(
            watchStartResult.error
              ? `Failed to start watcher: ${watchStartResult.error}`
              : 'Failed to start watcher.',
          )
          return false
        }

        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
            ...currentSession,
            watchMode: watchStartResult.watchMode ?? currentSession.watchMode,
            isRemoteMounted:
              watchStartResult.isRemoteMounted ?? currentSession.isRemoteMounted,
          })),
        )
        if (watchStartResult.fallbackApplied) {
          let fallbackBannerShown = false
          setBannerMessage((currentMessage) => {
            if (currentMessage) {
              return currentMessage
            }
            fallbackBannerShown = true
            return WATCH_FALLBACK_BANNER_MESSAGE
          })
          if (fallbackBannerShown) {
            scheduleRemoteBannerAutoDismiss(WATCH_FALLBACK_BANNER_MESSAGE)
          }
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
    [
      setBannerMessage,
      scheduleRemoteBannerAutoDismiss,
      setWorkspaceState,
      watchedWorkspaceIdsRef,
      workspaceStateRef,
    ],
  )

  const stopWorkspaceWatch = useCallback(async (workspaceId: WorkspaceId) => {
    watchedWorkspaceIdsRef.current.delete(workspaceId)
    try {
      await window.workspace.watchStop(workspaceId)
      return true
    } catch {
      setBannerMessage('Failed to stop watcher while closing the workspace.')
      return false
    }
  }, [setBannerMessage, watchedWorkspaceIdsRef])

  const openWorkspace = useCallback(async () => {
    try {
      const result = await window.workspace.openDialog()

      if (result.canceled) {
        return
      }

      if (result.error) {
        setBannerMessage(`Failed to open workspace: ${result.error}`)
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

      setWorkspaceState((previous) => addOrFocusWorkspace(previous, selectedPath).state)

      if (isExistingWorkspace) {
        return
      }

      await startWorkspaceWatch(selectedWorkspaceId, selectedPath)
      const indexStatus = await loadWorkspaceIndex(selectedWorkspaceId, selectedPath)
      if (indexStatus === 'success') {
        void loadWorkspaceGitFileStatuses(selectedWorkspaceId, selectedPath)
      }
    } catch (error) {
      setBannerMessage(
        error instanceof Error
          ? `Failed to open workspace: ${error.message}`
          : 'Failed to open workspace.',
      )
    }
  }, [
    loadWorkspaceGitFileStatuses,
    loadWorkspaceIndex,
    setBannerMessage,
    setWorkspaceState,
    startWorkspaceWatch,
    workspaceStateRef,
  ])

  const findWorkspaceIdByRemoteWorkspaceId = useCallback(
    (remoteWorkspaceId: string): WorkspaceId | null => {
      for (const [workspaceId, session] of Object.entries(
        workspaceStateRef.current.workspacesById,
      )) {
        if (
          session.workspaceKind === 'remote' &&
          session.remoteWorkspaceId === remoteWorkspaceId
        ) {
          return workspaceId
        }
      }
      return null
    },
    [workspaceStateRef],
  )

  const connectRemoteWorkspace = useCallback(
    async (profile: WorkspaceRemoteProfile) => {
      const workspaceId = profile.workspaceId?.trim()
      const host = profile.host?.trim()
      const remoteRoot = profile.remoteRoot?.trim()
      if (!workspaceId || !host || !remoteRoot) {
        setBannerMessage(
          'Remote workspace profile is invalid: workspaceId, host, and remoteRoot are required.',
        )
        return false
      }

      const normalizedProfile: WorkspaceRemoteProfile = {
        ...profile,
        workspaceId,
        host,
        remoteRoot,
        ...(profile.user?.trim() ? { user: profile.user.trim() } : {}),
        ...(profile.agentPath?.trim() ? { agentPath: profile.agentPath.trim() } : {}),
        ...(profile.identityFile?.trim()
          ? { identityFile: profile.identityFile.trim() }
          : {}),
      }

      try {
        const connectResult = await window.workspace.connectRemote(normalizedProfile)
        if (!connectResult.ok) {
          const existingWorkspaceId = findWorkspaceIdByRemoteWorkspaceId(
            connectResult.workspaceId,
          )
          if (existingWorkspaceId) {
            setWorkspaceState((previous) =>
              updateWorkspaceSession(
                previous,
                existingWorkspaceId,
                (currentSession) => ({
                  ...currentSession,
                  workspaceKind: 'remote',
                  remoteWorkspaceId: connectResult.workspaceId,
                  remoteProfile: normalizedProfile,
                  remoteConnectionState: 'disconnected',
                  remoteErrorCode: connectResult.errorCode,
                }),
              ),
            )
          }
          setBannerMessage(
            getRemoteConnectionErrorMessage(
              connectResult.errorCode,
              connectResult.error,
            ),
          )
          return false
        }

        const rendererWorkspaceId = connectResult.workspaceId
        const rootPath = connectResult.rootPath

        setWorkspaceState((previous) => {
          const addResult = addOrFocusWorkspace(previous, rootPath, {
            workspaceId: rendererWorkspaceId,
            sessionOptions: {
              workspaceKind: 'remote',
              remoteWorkspaceId: connectResult.workspaceId,
              remoteProfile: normalizedProfile,
              remoteConnectionState: connectResult.remoteConnectionState,
              remoteErrorCode: null,
            },
          })
          return updateWorkspaceSession(
            addResult.state,
            addResult.workspaceId,
            (currentSession) => ({
              ...currentSession,
              workspaceKind: 'remote',
              remoteWorkspaceId: connectResult.workspaceId,
              remoteProfile: normalizedProfile,
              remoteConnectionState: connectResult.remoteConnectionState,
              remoteErrorCode: null,
            }),
          )
        })

        const watchStarted = await startWorkspaceWatch(rendererWorkspaceId, rootPath)
        const indexStatus = await loadWorkspaceIndex(rendererWorkspaceId, rootPath)
        if (indexStatus === 'success') {
          void loadWorkspaceGitFileStatuses(rendererWorkspaceId, rootPath)
        }
        if (!watchStarted || indexStatus === 'failed') {
          return false
        }
        return true
      } catch (error) {
        setBannerMessage(
          getRemoteConnectionErrorMessage(
            undefined,
            error instanceof Error ? error.message : undefined,
          ),
        )
        return false
      }
    },
    [
      findWorkspaceIdByRemoteWorkspaceId,
      loadWorkspaceGitFileStatuses,
      loadWorkspaceIndex,
      setBannerMessage,
      setWorkspaceState,
      startWorkspaceWatch,
    ],
  )

  const disconnectRemoteWorkspace = useCallback(
    async (workspaceId?: WorkspaceId) => {
      const targetWorkspaceId =
        workspaceId ?? workspaceStateRef.current.activeWorkspaceId
      if (!targetWorkspaceId) {
        return false
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[targetWorkspaceId]
      if (
        !workspaceSession ||
        workspaceSession.workspaceKind !== 'remote' ||
        !workspaceSession.remoteWorkspaceId
      ) {
        return true
      }

      try {
        await stopWorkspaceWatch(targetWorkspaceId)
        const disconnectResult = await window.workspace.disconnectRemote(
          workspaceSession.remoteWorkspaceId,
        )
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, targetWorkspaceId, (currentSession) => ({
            ...currentSession,
            remoteConnectionState: 'disconnected',
            remoteErrorCode: disconnectResult.ok ? null : 'CONNECTION_CLOSED',
          })),
        )

        if (!disconnectResult.ok) {
          setBannerMessage(
            disconnectResult.error
              ? `Failed to disconnect remote workspace: ${disconnectResult.error}`
              : 'Failed to disconnect remote workspace.',
          )
          return false
        }
        return true
      } catch (error) {
        setWorkspaceState((previous) =>
          updateWorkspaceSession(previous, targetWorkspaceId, (currentSession) => ({
            ...currentSession,
            remoteConnectionState: 'disconnected',
            remoteErrorCode: 'CONNECTION_CLOSED',
          })),
        )
        setBannerMessage(
          error instanceof Error
            ? `Failed to disconnect remote workspace: ${error.message}`
            : 'Failed to disconnect remote workspace.',
        )
        return false
      }
    },
    [setBannerMessage, setWorkspaceState, stopWorkspaceWatch, workspaceStateRef],
  )

  const retryRemoteWorkspaceConnection = useCallback(
    async (workspaceId?: WorkspaceId) => {
      const targetWorkspaceId =
        workspaceId ?? workspaceStateRef.current.activeWorkspaceId
      if (!targetWorkspaceId) {
        setBannerMessage('Cannot retry remote connection: no active workspace selected.')
        return false
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[targetWorkspaceId]
      if (!workspaceSession || workspaceSession.workspaceKind !== 'remote') {
        setBannerMessage('Cannot retry remote connection: active workspace is not remote.')
        return false
      }

      if (workspaceSession.remoteConnectionState === 'connecting') {
        setBannerMessage('Remote connection is already in progress.')
        return false
      }

      if (!workspaceSession.remoteProfile) {
        setBannerMessage('Cannot retry remote connection: remote profile is unavailable.')
        return false
      }

      return connectRemoteWorkspace(workspaceSession.remoteProfile)
    },
    [connectRemoteWorkspace, setBannerMessage, workspaceStateRef],
  )

  useEffect(() => {
    const unsubscribe = window.workspace.onRemoteConnectionEvent((remoteEvent) => {
      if (!remoteEvent.workspaceId) {
        return
      }

      const workspaceId =
        workspaceStateRef.current.workspacesById[remoteEvent.workspaceId]
          ? remoteEvent.workspaceId
          : findWorkspaceIdByRemoteWorkspaceId(remoteEvent.workspaceId)
      if (!workspaceId) {
        return
      }

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, workspaceId, (currentSession) => ({
          ...currentSession,
          workspaceKind: 'remote',
          remoteWorkspaceId: remoteEvent.workspaceId,
          remoteConnectionState: remoteEvent.state,
          remoteErrorCode:
            remoteEvent.state === 'connected'
              ? null
              : remoteEvent.errorCode ?? currentSession.remoteErrorCode,
        })),
      )

      if (
        remoteEvent.state === 'degraded' ||
        (remoteEvent.state === 'disconnected' &&
          (remoteEvent.errorCode || remoteEvent.message))
      ) {
        const errorMessage = getRemoteConnectionErrorMessage(
          remoteEvent.errorCode,
          remoteEvent.message,
        )
        setBannerMessage(errorMessage)
        scheduleRemoteBannerAutoDismiss(errorMessage)
      }
    })

    return unsubscribe
  }, [
    findWorkspaceIdByRemoteWorkspaceId,
    scheduleRemoteBannerAutoDismiss,
    setBannerMessage,
    setWorkspaceState,
    workspaceStateRef,
  ])

  const setWatchModePreference = useCallback(
    async (preference: WorkspaceWatchModePreference) => {
      const activeWorkspaceId = workspaceStateRef.current.activeWorkspaceId
      if (!activeWorkspaceId) {
        return
      }

      const workspaceSession =
        workspaceStateRef.current.workspacesById[activeWorkspaceId]
      if (!workspaceSession) {
        return
      }
      const targetRootPath = workspaceSession.rootPath

      setWorkspaceState((previous) =>
        updateWorkspaceSession(previous, activeWorkspaceId, (currentSession) => ({
          ...currentSession,
          watchModePreference: preference,
        })),
      )

      await startWorkspaceWatch(activeWorkspaceId, targetRootPath, {
        forceRestart: true,
        watchModePreference: preference,
      })
    },
    [setWorkspaceState, startWorkspaceWatch, workspaceStateRef],
  )

  return {
    startWorkspaceWatch,
    stopWorkspaceWatch,
    clearBanner,
    showBanner,
    scheduleRemoteBannerAutoDismiss,
    openWorkspace,
    findWorkspaceIdByRemoteWorkspaceId,
    connectRemoteWorkspace,
    disconnectRemoteWorkspace,
    retryRemoteWorkspaceConnection,
    setWatchModePreference,
  }
}
